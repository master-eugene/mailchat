import { httpClient } from './httpClient';

export type SyncResponse = {
  messages: string[];
  receipts: { id: string; messageId: string; deliveredAt: string }[];
};

export const postMessage = async (message: { id: string; to: string; nonce: string; ciphertext: string }) => {
  await httpClient.post('/api/messages', message);
};

export const fetchSync = async () => {
  const { data } = await httpClient.get<SyncResponse>('/api/sync');
  return data;
};

export const getPushKey = async () => {
  const { data } = await httpClient.get<{ publicKey: string | null }>('/api/push/key');
  return data.publicKey;
};

export const savePushSubscription = async (subscription: PushSubscriptionJSON) => {
  await httpClient.post('/api/push/subscribe', subscription);
};
