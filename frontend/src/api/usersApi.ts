import { httpClient } from './httpClient';

export type PublicUser = {
  id: string;
  username: string;
  address: string;
  publicKey: string;
};

// Accepts a username or a full MailChat address.
export const lookupUser = async (query: string) => {
  const { data } = await httpClient.get<PublicUser>('/api/users/lookup', { params: { q: query } });
  return data;
};
