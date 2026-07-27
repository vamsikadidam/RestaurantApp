export const PUSH_SENDER = Symbol('PUSH_SENDER');

export interface PushMessageInput {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Port for delivering push notifications. `LoggingPushSender` (default) just
 * logs the send so the rest of the notification pipeline (DB records, order
 * status -> notification wiring, read receipts) is fully implemented and
 * testable without a real Firebase project. Swap in a real implementation
 * backed by `firebase-admin`'s `admin.messaging().sendEachForMulticast()`
 * once FIREBASE_* credentials are provisioned - see GOOGLE_PLAY_RELEASE_GUIDE.md.
 */
export interface PushSender {
  send(message: PushMessageInput): Promise<void>;
}
