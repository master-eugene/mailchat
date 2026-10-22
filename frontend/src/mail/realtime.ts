import { API_BASE_URL, getStoredToken } from '../api/httpClient';
import { flushAcks, markDelivered, queueAck, receiveEnvelope, syncMailbox } from './receive';

export type ConnectionState = 'connecting' | 'online' | 'offline';

type Listener = (state: ConnectionState) => void;

// Keeps a live WebSocket while the app is open, with a full sync on every (re)connect so
// nothing missed while offline is lost. Reconnects with backoff when the network drops.
export const startRealtime = (onState: Listener) => {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;

  const scheduleReconnect = () => {
    if (stopped) return;
    onState('offline');
    const delay = Math.min(30_000, 1000 * 2 ** attempt++);
    retryTimer = setTimeout(connect, delay);
  };

  const handle = async (raw: string) => {
    let event: { type?: string; envelope?: string; receipt?: { id: string; messageId: string } };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.type === 'ready') {
      attempt = 0;
      onState('online');
      syncMailbox().catch(() => undefined);
    } else if (event.type === 'message' && event.envelope) {
      await receiveEnvelope(event.envelope);
      await flushAcks();
    } else if (event.type === 'receipt' && event.receipt) {
      await markDelivered(event.receipt.messageId);
      await queueAck('receipt', event.receipt.id);
      await flushAcks();
    }
  };

  const connect = async () => {
    const token = await getStoredToken();
    if (stopped || !token) return;

    onState('connecting');
    socket = new WebSocket(`${API_BASE_URL.replace(/^http/, 'ws')}/ws`);
    socket.onopen = () => socket?.send(JSON.stringify({ type: 'auth', token }));
    socket.onmessage = event => handle(String(event.data));
    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };
  };

  const wake = () => {
    if (document.visibilityState !== 'visible' || stopped) return;
    if (!socket) {
      clearTimeout(retryTimer);
      attempt = 0;
      connect();
    } else {
      syncMailbox().catch(() => undefined);
    }
  };

  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('online', wake);
    socket?.close();
  };
};
