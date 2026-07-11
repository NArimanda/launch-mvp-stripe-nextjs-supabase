import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('Missing RESEND_API_KEY');
  }
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'BoxOfficeCalls <notifications@boxofficecalls.com>';
}
