// Browser notifications and Web Push. Knows no domain: callers pass titles, bodies and tags.

export type PermissionState = NotificationPermission | 'unsupported';

export function notificationPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export function isPushSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in globalThis;
}

/** iOS only allows notifications from a PWA added to the Home Screen. */
export function isStandalone(): boolean {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Must run inside a user gesture (a click), or Safari refuses. */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  return navigator.serviceWorker.ready;
}

export type LocalNotification = { title: string; body: string; tag: string; url: string };

/** Shows a notification through the service worker, so a click opens or focuses the app. */
export async function showNotification({ title, body, tag, url }: LocalNotification): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const reg = await registration();
  const options: NotificationOptions = { body, tag, icon: `${import.meta.env.BASE_URL}icon-192.png`, data: { url } };
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

export type PushSubscriptionJson = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Returns this device's push subscription for the server's VAPID key, subscribing if needed. */
export async function ensurePushSubscription(vapidPublicKey: string): Promise<PushSubscriptionJson> {
  const reg = await registration();
  if (!reg || !isPushSupported()) throw new Error('This browser does not support push notifications.');
  if (notificationPermission() !== 'granted') throw new Error('Notifications are not allowed yet.');

  const key = urlBase64ToBytes(vapidPublicKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    // Subscribed to another server before: switch to this one.
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('The browser returned an incomplete push subscription.');
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const left = new Uint8Array(a);
  return left.length === b.length && left.every((byte, i) => byte === b[i]);
}
