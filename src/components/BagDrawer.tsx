import { useState } from 'react';
import { CheckCircle2, Download, Minus, Plus, Trash2, X } from 'lucide-react';
import {
  calculateBagSubtotal,
  getBagItemDetails,
  type BagItem,
  type CheckoutDetails,
  type OrderConfirmation,
} from '../shared/catalog';
import { ResilientImage } from './ResilientImage';

interface BagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bag: BagItem[];
  fulfillmentMethod: 'delivery' | 'pickup';
  onChangeFulfillment: (method: 'delivery' | 'pickup') => void;
  checkoutDetails: CheckoutDetails;
  onChangeCheckoutDetails: (next: CheckoutDetails) => void;
  confirmation: OrderConfirmation | null;
  onSetConfirmation: (conf: OrderConfirmation | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onClearBag: () => void;
  onExportPlan: () => void;
}

export function BagDrawer({
  isOpen,
  onClose,
  bag,
  fulfillmentMethod,
  onChangeFulfillment,
  checkoutDetails,
  onChangeCheckoutDetails,
  confirmation,
  onSetConfirmation,
  onUpdateQty,
  onClearBag,
  onExportPlan,
}: BagDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = calculateBagSubtotal(bag);
  const freeDeliveryThreshold = 250;
  const deliveryFee =
    subtotal === 0
      ? 0
      : fulfillmentMethod === 'pickup'
        ? 0
        : subtotal >= freeDeliveryThreshold
          ? 0
          : 18;
  const estimatedTax = Math.round(subtotal * 0.0825 * 100) / 100;
  const grandTotal = subtotal + deliveryFee + estimatedTax;
  const remainingForFreeShipping = Math.max(0, freeDeliveryThreshold - subtotal);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: checkoutDetails.customerName,
          customerEmail: checkoutDetails.customerEmail,
          fulfillmentMethod,
          deliveryAddress: checkoutDetails.deliveryAddress,
          eventDate: checkoutDetails.eventDate,
          bag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not confirm order.');
      }
      onSetConfirmation(data as OrderConfirmation);
      onClearBag();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetReceipt = () => {
    onSetConfirmation(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="CymbalMart Shopping Bag and Checkout"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#E5E5E0] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#E5E5E0] flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-medium text-[#141413]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {confirmation ? 'CymbalMart Order Confirmed' : 'Finalize & Checkout'}
            </h2>
            {!confirmation && (
              <p className="text-xs text-[#5C5C57] mt-0.5 tabular-nums">
                {bag.reduce((sum, i) => sum + i.quantity, 0)} items · Subtotal $
                {subtotal.toFixed(2)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout drawer"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#52524E] hover:bg-[#F3F3EF] hover:text-[#141413] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {confirmation ? (
            <div className="space-y-6">
              <div className="p-5 bg-[#164E3B]/6 border border-[#164E3B]/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#164E3B] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-[#141413]">
                      Order #{confirmation.orderNumber} Confirmed
                    </div>
                    <p className="text-xs text-[#52524E] mt-1">
                      {confirmation.estimatedDelivery} ({confirmation.eventDate}). A
                      copy of this CymbalMart manifest has been prepared for{' '}
                      {confirmation.customerEmail}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E5E5E0] pt-4 space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-[#5C5C57]">
                  {confirmation.fulfillmentMethod === 'pickup'
                    ? 'Store Pickup Location'
                    : 'Delivery Details'}
                </div>
                <div className="text-sm text-[#141413]">
                  <p className="font-medium">{confirmation.customerName}</p>
                  <p className="text-[#52524E]">{confirmation.deliveryAddress}</p>
                </div>
              </div>

              <div className="border-t border-[#E5E5E0] pt-4">
                <div className="text-xs font-medium uppercase tracking-wider text-[#5C5C57] mb-3">
                  Itemized CymbalMart Manifest
                </div>
                <ul className="divide-y divide-[#E5E5E0]">
                  {confirmation.items.map((item) => (
                    <li
                      key={item.productId}
                      className="py-2.5 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#141413] truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#5C5C57]">
                          Qty {item.quantity} · {item.unitLabel}
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-[#141413] shrink-0">
                        ${item.lineTotal.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-[#E5E5E0] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#52524E]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">
                    ${confirmation.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#52524E]">
                  <span>
                    {confirmation.fulfillmentMethod === 'pickup'
                      ? 'Store Pickup'
                      : 'Courier Delivery'}
                  </span>
                  <span className="font-mono tabular-nums">
                    {confirmation.deliveryFee === 0
                      ? 'Free'
                      : `$${confirmation.deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-[#52524E]">
                  <span>Estimated Tax</span>
                  <span className="font-mono tabular-nums">
                    ${confirmation.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold text-[#141413] pt-2 border-t border-[#E5E5E0]">
                  <span>Total Charged</span>
                  <span className="font-mono tabular-nums">
                    ${confirmation.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetReceipt}
                className="w-full h-11 bg-[#141413] hover:bg-[#2C2C2A] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Return to CymbalMart Planner
              </button>
            </div>
          ) : bag.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-[#141413]">
                Your CymbalMart bag is currently empty
              </p>
              <p className="text-xs text-[#5C5C57] mt-1.5 max-w-[34ch] mx-auto">
                Define your event brief or ask the CymbalMart Shopping Agent to curate
                tableware, florals, and catering for your guest count.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 p-3.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-[#52524E] mb-2">
                    <span>
                      {fulfillmentMethod === 'pickup'
                        ? 'CymbalMart Store Pickup is always free'
                        : remainingForFreeShipping === 0
                          ? 'Free CymbalMart event delivery unlocked'
                          : `Add $${remainingForFreeShipping.toFixed(0)} more for free delivery`}
                    </span>
                    <span className="font-mono tabular-nums">
                      ${Math.min(subtotal, freeDeliveryThreshold).toFixed(0)} / $
                      {freeDeliveryThreshold}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E5E5E0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#164E3B] transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onExportPlan}
                  title="Download CymbalMart Shopping Plan"
                  className="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-medium text-[#141413] bg-white border border-[#D8D8D2] hover:border-[#141413] rounded-md shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>

              <ul className="divide-y divide-[#E5E5E0]">
                {bag.map((item) => {
                  const product = getBagItemDetails(item);
                  if (!product) return null;
                  return (
                    <li key={product.productId} className="py-4 flex gap-3.5">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E0] shrink-0 bg-[#F8F8F6]">
                        <ResilientImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#141413] leading-snug">
                            {product.name}
                          </p>
                          <span className="text-sm font-mono tabular-nums font-medium text-[#141413] shrink-0">
                            ${(product.unitPrice * item.quantity).toFixed(0)}
                          </span>
                        </div>
                        <p className="text-xs text-[#5C5C57] mt-0.5">
                          {product.unitLabel} · ${product.unitPrice} each
                        </p>
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="inline-flex items-center border border-[#D8D8D2] rounded-md bg-white">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${product.name}`}
                              onClick={() =>
                                onUpdateQty(product.productId, item.quantity - 1)
                              }
                              className="w-7 h-7 flex items-center justify-center text-[#52524E] hover:text-[#141413] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-mono tabular-nums text-[#141413]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${product.name}`}
                              onClick={() =>
                                onUpdateQty(product.productId, item.quantity + 1)
                              }
                              className="w-7 h-7 flex items-center justify-center text-[#52524E] hover:text-[#141413] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.productId, 0)}
                            aria-label={`Remove ${product.name}`}
                            className="text-xs text-[#5C5C57] hover:text-[#B91C1C] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={handleCheckout} className="border-t border-[#E5E5E0] pt-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#5C5C57]">
                    Fulfillment &amp; Schedule
                  </span>
                  <div className="inline-flex p-0.5 bg-[#EFEEEA] border border-[#E5E5E0] rounded-lg">
                    <button
                      type="button"
                      onClick={() => onChangeFulfillment('delivery')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        fulfillmentMethod === 'delivery'
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#52524E]'
                      }`}
                    >
                      Courier Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeFulfillment('pickup')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        fulfillmentMethod === 'pickup'
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#52524E]'
                      }`}
                    >
                      Store Pickup (Free)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs text-[#52524E] mb-1"
                    >
                      Host Name
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      placeholder="Clara Vance"
                      value={checkoutDetails.customerName}
                      onChange={(e) =>
                        onChangeCheckoutDetails({
                          ...checkoutDetails,
                          customerName: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 border border-[#D8D8D2] rounded-lg text-sm focus:outline-none focus:border-[#164E3B]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="block text-xs text-[#52524E] mb-1"
                    >
                      Confirmation Email
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      placeholder="clara@example.com"
                      value={checkoutDetails.customerEmail}
                      onChange={(e) =>
                        onChangeCheckoutDetails({
                          ...checkoutDetails,
                          customerEmail: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 border border-[#D8D8D2] rounded-lg text-sm focus:outline-none focus:border-[#164E3B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {fulfillmentMethod === 'delivery' ? (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="checkout-address"
                        className="block text-xs text-[#52524E] mb-1"
                      >
                        Delivery Address
                      </label>
                      <input
                        id="checkout-address"
                        type="text"
                        required
                        placeholder="418 Mercer St, Apt 4B"
                        value={checkoutDetails.deliveryAddress}
                        onChange={(e) =>
                          onChangeCheckoutDetails({
                            ...checkoutDetails,
                            deliveryAddress: e.target.value,
                          })
                        }
                        className="w-full h-9 px-3 border border-[#D8D8D2] rounded-lg text-sm focus:outline-none focus:border-[#164E3B]"
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-2 flex flex-col justify-end">
                      <div className="h-9 px-3 flex items-center bg-[#F8F8F6] border border-[#E5E5E0] rounded-lg text-xs text-[#52524E]">
                        CymbalMart Flagship Pickup Desk · Ready 24h prior
                      </div>
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="checkout-date"
                      className="block text-xs text-[#52524E] mb-1"
                    >
                      Event Date
                    </label>
                    <input
                      id="checkout-date"
                      type="date"
                      required
                      value={checkoutDetails.eventDate}
                      onChange={(e) =>
                        onChangeCheckoutDetails({
                          ...checkoutDetails,
                          eventDate: e.target.value,
                        })
                      }
                      className="w-full h-9 px-2.5 border border-[#D8D8D2] rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:border-[#164E3B]"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
                    {errorMsg}
                  </p>
                )}

                <div className="pt-2 space-y-1.5 text-xs text-[#52524E]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {fulfillmentMethod === 'pickup'
                        ? 'CymbalMart Store Pickup'
                        : 'Event Courier Delivery'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (8.25%)</span>
                    <span className="font-mono tabular-nums">
                      ${estimatedTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#141413] pt-2 border-t border-[#E5E5E0]">
                    <span>Order Total</span>
                    <span className="font-mono tabular-nums">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Confirming CymbalMart Order...'
                    : `Complete Checkout · $${grandTotal.toFixed(2)}`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
