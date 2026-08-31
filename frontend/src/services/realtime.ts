import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { SupportMessage } from '../types/support.types';

export type RealtimeStatus = 'unavailable' | 'connecting' | 'online' | 'reconnecting' | 'offline';

let echo: Echo<'reverb'> | null = null;
let currentStatus: RealtimeStatus = 'unavailable';
let wasConnected = false;
const statusListeners = new Set<(status: RealtimeStatus) => void>();

function setStatus(next: RealtimeStatus): void {
  if (currentStatus === next) return;
  currentStatus = next;
  statusListeners.forEach((listener) => listener(next));
}

/** Subscribe to realtime connectivity changes. Returns a cleanup function. */
export function onRealtimeStatusChange(listener: (status: RealtimeStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => { statusListeners.delete(listener); };
}

export function getRealtimeStatus(): RealtimeStatus {
  return currentStatus;
}

export function getEcho(): Echo<'reverb'> | null {
  if (typeof window === 'undefined' || !import.meta.env.VITE_REVERB_APP_KEY) return null;

  if (echo) {
    if (currentStatus === 'unavailable') setStatus('connecting');
    return echo;
  }

  (window as Window & { Pusher?: typeof Pusher }).Pusher = Pusher;
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
  const token = localStorage.getItem('auth_token');

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase.replace(/\/$/, '')}/broadcasting/auth`,
    auth: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  // Echo caches channel instances internally, so `private()` never creates
  // duplicate WebSocket subscriptions; callers remove listeners on unmount.
  const connection = echo.connector.pusher.connection;
  connection.bind('connecting', () => setStatus('connecting'));
  connection.bind('connected', () => { wasConnected = true; setStatus('online'); });
  connection.bind('disconnected', () => setStatus(wasConnected ? 'reconnecting' : 'offline'));
  connection.bind('unavailable', () => setStatus('offline'));
  connection.bind('failed', () => setStatus(wasConnected ? 'reconnecting' : 'offline'));

  setStatus('connecting');

  return echo;
}

/**
 * Subscribe to a private support conversation channel. Returns a cleanup
 * function; callers must invoke it on unmount to avoid duplicate listeners.
 */
export function subscribeToSupportChannel(
  conversationId: number,
  handler: (message: SupportMessage) => void,
): (() => void) | null {
  const instance = getEcho();
  if (!instance) return null;

  const channel = instance.private(`support.conversation.${conversationId}`);
  channel.listen('.support.message.created', (event: { message: SupportMessage }) => {
    handler(event.message);
  });

  return () => {
    channel.stopListening('.support.message.created');
  };
}

export function leaveSupportChannel(conversationId: number): void {
  echo?.leaveChannel(`support.conversation.${conversationId}`);
}
