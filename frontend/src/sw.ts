/// <reference lib="webworker" />
// The service worker: caches the app for offline use, shows pushed reminders, and opens the note on click.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

type PushPayload = { reminderId: string; noteId: string; title: string; body: string };

const scope = self.registration.scope;

self.addEventListener('push', (event) => {
  let payload: PushPayload;
  try {
    payload = event.data?.json() as PushPayload;
  } catch {
    payload = { reminderId: crypto.randomUUID(), noteId: '', title: 'Nudge', body: event.data?.text() ?? '' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Reminder', {
      body: payload.body,
      tag: payload.reminderId,
      icon: new URL('icon-192.png', scope).href,
      badge: new URL('icon-192.png', scope).href,
      data: { url: new URL(payload.noteId ? `?note=${encodeURIComponent(payload.noteId)}` : '', scope).href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => client.url.startsWith(scope));
      if (open) {
        await open.focus();
        await open.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
