// Notification permission as a store, so components re-render when the user grants it.
import { useSyncExternalStore } from 'react';
import { notificationPermission, requestNotificationPermission, type PermissionState } from './push';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationPermission(): PermissionState {
  return useSyncExternalStore(subscribe, notificationPermission, notificationPermission);
}

export async function askForNotifications(): Promise<PermissionState> {
  const state = await requestNotificationPermission();
  for (const listener of listeners) listener();
  return state;
}
