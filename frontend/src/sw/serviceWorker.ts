/// <reference lib="webworker" />
// Bundled to /sw.js by the plugin in vite.config.ts.
import { getSetting } from '../db/indexedDb';
import { flushAcks, receiveEnvelope, syncMailbox, type ReceiveResult } from '../mail/receive';

declare const self: ServiceWorkerGlobalScope;
declare const __DEV__: boolean;

type PushPayload = { t: 'message'; envelope: string } | { t: 'fetch'; from: string; id: string };

const appShellCache = 'mailchat-shell-v1';

const notify = (title: string, body: string, peer?: string) =>
  self.registration.showNotification(title, {
    body,
    tag: peer ? `chat:${peer}` : 'mailchat',
    data: { peer },
    icon: '/icon-192.png',
  });

// Written by the app in the user's language (see hooks/useLocale.ts); English until then.
const pushTexts = async () => {
  const texts = {
    newMessage: 'New encrypted message',
    openToLoad: 'New encrypted message. Open MailChat to load it.',
    checkContact: 'New message. Open MailChat to check this contact.',
  };
  try {
    return { ...texts, ...JSON.parse((await getSetting('pushTexts')) ?? '{}') } as typeof texts;
  } catch {
    return texts;
  }
};

const describe = async (result: ReceiveResult, fallbackPeer?: string) => {
  const texts = await pushTexts();
  switch (result.status) {
    case 'saved':
    case 'duplicate':
      return { title: result.message.peer, body: result.message.body, peer: result.message.peer };
    case 'key_changed':
      return { title: result.peer, body: texts.checkContact, peer: result.peer };
    default:
      return { title: fallbackPeer ?? 'MailChat', body: texts.newMessage, peer: fallbackPeer };
  }
};

// The encrypted message usually rides inside the push: decrypt it here and store it in the
// chat before showing anything, so dismissing the notification can't lose the message.
const handlePush = async (payload: PushPayload | null) => {
  if (payload?.t === 'message') {
    const result = await receiveEnvelope(payload.envelope);
    const { title, body, peer } = await describe(result);
    // Independent: a failed notification must not stop the ack, and vice versa.
    await Promise.allSettled([notify(title, body, peer), flushAcks()]);
    return;
  }

  // Too long to fit in a push: try to fetch it now; if the server is unreachable the app
  // fetches it on next open.
  const from = payload?.t === 'fetch' ? payload.from : undefined;
  try {
    const results = await syncMailbox();
    const saved = results.find(result => result.status === 'saved');
    const { title, body, peer } = await describe(saved ?? { status: 'invalid' }, from);
    await notify(title, body, peer);
  } catch {
    await notify(from ?? 'MailChat', (await pushTexts()).openToLoad, from);
  }
};

self.addEventListener('push', event => {
  let payload: PushPayload | null = null;
  try {
    payload = event.data?.json() ?? null;
  } catch {
    payload = null;
  }

  event.waitUntil(handlePush(payload).catch(async () => notify('MailChat', (await pushTexts()).newMessage)));
});

// Development only: lets tests feed a push payload directly, since a dev browser may have no push service.
if (__DEV__) {
  self.addEventListener('message', event => {
    if (event.data?.type === 'debug-push') event.waitUntil(handlePush(event.data.payload));
  });
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const peer = (event.notification.data as { peer?: string } | null)?.peer;
  const target = peer ? `/#/chat/${encodeURIComponent(peer)}` : '/#/chats';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
      const client = clients[0];
      if (client) {
        await client.focus();
        client.postMessage({ type: 'open', hash: target.slice(1) });
        return;
      }
      await self.clients.openWindow(target);
    }),
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Offline support in production builds: network first, cached copy when the network fails,
// so the installed app still opens and shows stored chats without a connection.
if (!__DEV__) {
  self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(appShellCache).then(cache => cache.put(request.mode === 'navigate' ? '/' : request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(appShellCache);
          return (await cache.match(request.mode === 'navigate' ? '/' : request)) ?? Response.error();
        }),
    );
  });
}
