import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Square, Volume2, VolumeX, X } from 'lucide-react';
import type {
  AgentActionLog,
  BagItem,
  CheckoutDetails,
  OrderConfirmation,
  PartyBrief,
  VoiceClientAction,
} from '../shared/catalog';

interface VoiceControllerProps {
  brief: PartyBrief;
  bag: BagItem[];
  fulfillmentMethod: 'delivery' | 'pickup';
  checkoutDetails: CheckoutDetails;
  onSyncFromVoice: (payload: {
    bag?: BagItem[];
    brief?: PartyBrief;
    fulfillmentMethod?: 'delivery' | 'pickup';
    checkoutDetails?: CheckoutDetails;
    orderConfirmation?: OrderConfirmation | null;
    clientActions?: VoiceClientAction[];
  }) => void;
}

type VoiceStage = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceTurnLog {
  id: string;
  speaker: 'customer' | 'agent';
  text: string;
  actions?: AgentActionLog[];
}

const VOICE_SCRIPT_SHORTCUTS = [
  'Plan a garden cocktail party for 16 guests under $500, vegan',
  'Add 2 boxes of lemon tarts and switch to free store pickup',
  'Set checkout name Maya Lin, email maya@example.com, event December 14',
  'Confirm and place my order',
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio clip.'));
    reader.readAsDataURL(blob);
  });
}

export function VoiceController({
  brief,
  bag,
  fulfillmentMethod,
  checkoutDetails,
  onSyncFromVoice,
}: VoiceControllerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [handsFreeActive, setHandsFreeActive] = useState(false);
  const [stage, setStage] = useState<VoiceStage>('idle');
  const [audioMuted, setAudioMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [logs, setLogs] = useState<VoiceTurnLog[]>([
    {
      id: 'voice-intro',
      speaker: 'agent',
      text: 'Start Hands-Free Voice to define your event, edit items, check totals, and place your CymbalMart order without touching the screen.',
    },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState('');

  // Keep fresh refs for async callbacks (AudioContext / MediaRecorder)
  const handsFreeRef = useRef(false);
  const audioMutedRef = useRef(false);
  const briefRef = useRef(brief);
  const bagRef = useRef(bag);
  const fulfillmentRef = useRef(fulfillmentMethod);
  const checkoutRef = useRef(checkoutDetails);
  const logsRef = useRef(logs);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const speechSeenRef = useRef(false);
  const lastSpeechAtRef = useRef<number>(0);
  const cycleStartedAtRef = useRef<number>(0);
  const discardingCycleRef = useRef(false);

  useEffect(() => {
    briefRef.current = brief;
  }, [brief]);
  useEffect(() => {
    bagRef.current = bag;
  }, [bag]);
  useEffect(() => {
    fulfillmentRef.current = fulfillmentMethod;
  }, [fulfillmentMethod]);
  useEffect(() => {
    checkoutRef.current = checkoutDetails;
  }, [checkoutDetails]);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);
  useEffect(() => {
    audioMutedRef.current = audioMuted;
  }, [audioMuted]);

  const stopPlayback = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      audioElRef.current = null;
    }
  }, []);

  const stopMonitoringLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      discardingCycleRef.current = true;
      try {
        recorderRef.current.stop();
      } catch {
        // ignore stop errors
      }
    }
    recorderRef.current = null;
    setMicLevel(0);
    setSpeechDetected(false);
  }, []);

  const teardownMic = useCallback(() => {
    handsFreeRef.current = false;
    setHandsFreeActive(false);
    stopMonitoringLoop();
    stopPlayback();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setStage('idle');
  }, [stopMonitoringLoop, stopPlayback]);

  useEffect(() => {
    return () => {
      teardownMic();
    };
  }, [teardownMic]);

  const processVoicePayload = useCallback(
    async (payload: {
      audioBase64?: string;
      audioMimeType?: string;
      transcriptText?: string;
    }) => {
      setStage('processing');
      setErrorMsg(null);

      try {
        const res = await fetch('/api/voice/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            history: logsRef.current.slice(-6).map((l) => ({
              role: l.speaker === 'customer' ? 'user' : 'assistant',
              text: l.text,
            })),
            brief: briefRef.current,
            bag: bagRef.current,
            fulfillmentMethod: fulfillmentRef.current,
            checkoutDetails: checkoutRef.current,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Voice command failed.');
        }

        if (!data.transcript) {
          // Silence-only clip: resume listening if hands-free is active
          if (handsFreeRef.current) {
            beginListeningCycle();
          } else {
            setStage('idle');
          }
          return;
        }

        const nextLogs: VoiceTurnLog[] = [
          {
            id: `v-u-${Date.now()}`,
            speaker: 'customer',
            text: data.transcript,
          },
          {
            id: `v-a-${Date.now() + 1}`,
            speaker: 'agent',
            text: data.reply,
            actions: Array.isArray(data.actionsPerformed)
              ? data.actionsPerformed
              : [],
          },
        ];
        setLogs((prev) => [...prev, ...nextLogs]);

        onSyncFromVoice({
          bag: data.bag,
          brief: data.brief,
          fulfillmentMethod: data.fulfillmentMethod,
          checkoutDetails: data.checkoutDetails,
          orderConfirmation: data.orderConfirmation,
          clientActions: data.clientActions,
        });

        if (data.audioBase64 && !audioMutedRef.current) {
          setStage('speaking');
          const binaryStr = atob(data.audioBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const wavBlob = new Blob([bytes], {
            type: data.audioMimeType || 'audio/wav',
          });
          const audioUrl = URL.createObjectURL(wavBlob);
          const audio = new Audio(audioUrl);
          audioElRef.current = audio;

          const finishSpeaking = () => {
            URL.revokeObjectURL(audioUrl);
            audioElRef.current = null;
            if (handsFreeRef.current) {
              beginListeningCycle();
            } else {
              setStage('idle');
            }
          };

          audio.onended = finishSpeaking;
          audio.onerror = finishSpeaking;

          try {
            await audio.play();
          } catch {
            finishSpeaking();
          }
        } else if (handsFreeRef.current) {
          beginListeningCycle();
        } else {
          setStage('idle');
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to process voice turn.'
        );
        if (handsFreeRef.current) {
          setTimeout(() => {
            if (handsFreeRef.current) beginListeningCycle();
          }, 1200);
        } else {
          setStage('idle');
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSyncFromVoice]
  );

  const beginListeningCycle = useCallback(() => {
    const stream = streamRef.current;
    const analyser = analyserRef.current;
    if (!stream || !analyser || !handsFreeRef.current) {
      setStage('idle');
      return;
    }

    stopMonitoringLoop();
    setStage('listening');
    chunksRef.current = [];
    speechSeenRef.current = false;
    setSpeechDetected(false);
    discardingCycleRef.current = false;
    cycleStartedAtRef.current = Date.now();
    lastSpeechAtRef.current = Date.now();

    const preferredMime = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

    const recorder = preferredMime
      ? new MediaRecorder(stream, { mimeType: preferredMime })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (discardingCycleRef.current) {
        discardingCycleRef.current = false;
        return;
      }
      const recordedBlob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      if (recordedBlob.size < 1200) {
        if (handsFreeRef.current) beginListeningCycle();
        return;
      }
      const base64 = await blobToBase64(recordedBlob);
      processVoicePayload({
        audioBase64: base64,
        audioMimeType: recorder.mimeType || 'audio/webm',
      });
    };

    recorderRef.current = recorder;
    recorder.start(250);

    const dataArray = new Uint8Array(analyser.fftSize);
    const monitor = () => {
      if (!handsFreeRef.current || recorderRef.current !== recorder) return;
      analyser.getByteTimeDomainData(dataArray);
      let sumSq = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSq += normalized * normalized;
      }
      const rms = Math.sqrt(sumSq / dataArray.length);
      setMicLevel(Math.min(100, Math.round(rms * 420)));

      const now = Date.now();
      if (rms > 0.022) {
        if (!speechSeenRef.current) {
          speechSeenRef.current = true;
          setSpeechDetected(true);
        }
        lastSpeechAtRef.current = now;
      }

      if (
        speechSeenRef.current &&
        (now - lastSpeechAtRef.current > 1350 ||
          now - cycleStartedAtRef.current > 16000)
      ) {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        return;
      }

      // Silently recycle buffer if nobody spoke for 9s so clips stay lean
      if (!speechSeenRef.current && now - cycleStartedAtRef.current > 9000) {
        discardingCycleRef.current = true;
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        setTimeout(() => {
          if (handsFreeRef.current) beginListeningCycle();
        }, 60);
        return;
      }

      rafRef.current = requestAnimationFrame(monitor);
    };

    rafRef.current = requestAnimationFrame(monitor);
  }, [processVoicePayload, stopMonitoringLoop]);

  const startHandsFree = async () => {
    setErrorMsg(null);
    setIsOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      handsFreeRef.current = true;
      setHandsFreeActive(true);
      beginListeningCycle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Microphone unavailable (${err.message}). You can still run voice commands below.`
          : 'Microphone permission was denied. You can still run voice commands below.'
      );
      handsFreeRef.current = false;
      setHandsFreeActive(false);
      setStage('idle');
    }
  };

  const handleSendClipEarly = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      speechSeenRef.current = true;
      recorderRef.current.stop();
    }
  };

  const handleTextCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed || stage === 'processing') return;
    setCommandInput('');
    processVoicePayload({ transcriptText: trimmed });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={startHandsFree}
          aria-label="Start Hands-Free Voice Control"
          className="h-11 px-4 inline-flex items-center gap-2.5 bg-white hover:bg-[#F3F3EF] text-[#141413] text-sm font-medium rounded-lg shadow-lg border border-[#D8D8D2] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164E3B]"
        >
          <Mic className="w-4 h-4 text-[#164E3B] shrink-0" strokeWidth={1.75} />
          <span>Hands-Free Voice</span>
        </button>
      </div>
    );
  }

  const stageLabel =
    stage === 'listening'
      ? speechDetected
        ? 'Hearing speech — pause to send'
        : 'Listening continuously for your command'
      : stage === 'processing'
        ? 'Transcribing & updating CymbalMart...'
        : stage === 'speaking'
          ? 'Speaking response aloud...'
          : 'Voice control paused';

  return (
    <div
      role="region"
      aria-label="Hands-Free Voice Control"
      className="fixed bottom-5 left-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[400px] bg-white border border-[#E5E5E0] rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3 bg-[#164E3B] text-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-sm font-medium leading-tight truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hands-Free Voice Concierge
          </h2>
          <p className="text-[11px] text-white/80 truncate">{stageLabel}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAudioMuted((m) => !m);
              stopPlayback();
            }}
            aria-label={audioMuted ? 'Unmute spoken responses' : 'Mute spoken responses'}
            title={audioMuted ? 'Unmute voice audio' : 'Mute voice audio'}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {audioMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              teardownMic();
              setIsOpen(false);
            }}
            aria-label="Close voice control panel"
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real Mic Audio Meter & Controls */}
      <div className="px-4 py-3 bg-[#F8F8F6] border-b border-[#E5E5E0] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {handsFreeActive ? (
            <button
              type="button"
              onClick={teardownMic}
              className="h-8 px-3 inline-flex items-center gap-1.5 bg-[#141413] hover:bg-[#2C2C2A] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Hands-Free</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startHandsFree}
              className="h-8 px-3 inline-flex items-center gap-1.5 bg-[#164E3B] hover:bg-[#113D2E] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Resume Mic</span>
            </button>
          )}

          {stage === 'listening' && (
            <button
              type="button"
              onClick={handleSendClipEarly}
              className="h-8 px-3 inline-flex items-center gap-1.5 bg-white border border-[#D8D8D2] hover:border-[#164E3B] text-xs font-medium text-[#141413] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Send Now</span>
            </button>
          )}

          {stage === 'speaking' && (
            <button
              type="button"
              onClick={() => {
                stopPlayback();
                if (handsFreeRef.current) beginListeningCycle();
              }}
              className="h-8 px-3 inline-flex items-center gap-1.5 bg-white border border-[#D8D8D2] hover:border-[#141413] text-xs font-medium text-[#141413] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MicOff className="w-3 h-3" />
              <span>Interrupt</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono tabular-nums text-[#5C5C57] w-14 shrink-0">
            Mic {micLevel}%
          </span>
          <div className="flex-1 h-1.5 bg-[#E5E5E0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#164E3B] transition-all duration-75"
              style={{ width: `${micLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Spoken Transcript & Action Log */}
      <div className="max-h-56 overflow-y-auto px-4 py-3 space-y-2.5 bg-white">
        {logs.slice(-6).map((entry) => (
          <div
            key={entry.id}
            className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
              entry.speaker === 'customer'
                ? 'bg-[#141413] text-white ml-6'
                : 'bg-[#F8F8F6] border border-[#E5E5E0] text-[#141413] mr-4'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-65 mb-0.5">
              {entry.speaker === 'customer' ? 'Spoken Command' : 'Voice Concierge'}
            </div>
            <p>{entry.text}</p>
            {entry.actions && entry.actions.length > 0 && (
              <p className="mt-1 pt-1 border-t border-[#E5E5E0] text-[11px] text-[#164E3B] font-medium">
                {entry.actions.map((a) => a.summary).join(' · ')}
              </p>
            )}
          </div>
        ))}

        {errorMsg && (
          <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Voice Script Shortcuts + Spoken Text Fallback */}
      <div className="p-3 border-t border-[#E5E5E0] bg-[#FAF9F6] space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {VOICE_SCRIPT_SHORTCUTS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              disabled={stage === 'processing'}
              onClick={() => processVoicePayload({ transcriptText: cmd })}
              className="px-2 py-1 text-[10px] font-medium text-[#52524E] bg-white border border-[#E5E5E0] hover:border-[#164E3B] hover:text-[#164E3B] rounded transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              “{cmd}”
            </button>
          ))}
        </div>

        <form onSubmit={handleTextCommand} className="flex items-center gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Or type a voice command to speak aloud..."
            aria-label="Simulated voice command input"
            disabled={stage === 'processing'}
            className="flex-1 h-8 px-2.5 bg-white border border-[#D8D8D2] rounded-lg text-xs text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B]"
          />
          <button
            type="submit"
            disabled={stage === 'processing' || !commandInput.trim()}
            className="h-8 px-3 bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Speak
          </button>
        </form>
      </div>
    </div>
  );
}
