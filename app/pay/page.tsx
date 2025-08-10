'use client';

import { StripeBuyButton } from '@/components/StripeBuyButton';

export default function PaymentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-6 text-center">Complete Your Purchase</h1>

      <div className="w-full max-w-md px-4">
        <StripeBuyButton
          className="flex justify-center text-neutral"
          buyButtonId={process.env.NEXT_PUBLIC_STRIPE_BUTTON_ID || ''}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
        />
      </div>
    </div>
  );
}





