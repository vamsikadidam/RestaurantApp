/**
 * Shape of Clover's app-level webhook payload, verified against
 * docs.clover.com/dev/docs/webhooks. Clover sends "thin" notifications -
 * just which object changed, never the full object - so processing always
 * follows up with a GET (or, for statuses we already track locally, simply
 * treats the notification as a signal to re-check our own records).
 */
export interface CloverWebhookMerchantEvent {
  objectId: string; // e.g. "PAYMENT:ABCD1234", "O:XYZ987", "REFUND:..."
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  ts: number;
}

export interface CloverWebhookPayload {
  appId?: string;
  merchants?: Record<string, CloverWebhookMerchantEvent[]>;
  /** Present only on the one-time callback URL verification handshake. */
  verificationCode?: string;
}
