import { getPushKey, savePushSubscription } from '../api/messagesApi';

export type PushSupport = 'unsupported' | 'needs_install' | 'available';

const base64UrlToBytes = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
};

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const pushSupport = (): PushSupport => {
  // iPhone only allows web push for apps added to the Home Screen.
  if (isIos() && !isStandalone()) return 'needs_install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return 'available';
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
};

// Must run from a tap: iOS only shows the permission prompt in response to a user gesture.
export const enablePush = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const key = await getPushKey();
  if (!key) throw new Error('push_not_configured');

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));

  await savePushSubscription(subscription.toJSON());
  return true;
};

// Re-sends an existing subscription after login, since the server forgets expired ones.
export const refreshPushSubscription = async () => {
  if (pushSupport() !== 'available' || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await savePushSubscription(subscription.toJSON());
  else await enablePush();
};
