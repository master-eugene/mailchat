import { httpClient } from './httpClient';

export type ApiUser = {
  id: string;
  username: string;
  address: string;
  publicKey: string;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export const getServerInfo = async () => {
  const { data } = await httpClient.get<{ mailDomain: string }>('/api/info');
  return data;
};

export const registerUser = async (username: string, password: string, publicKey: string) => {
  const { data } = await httpClient.post<ApiUser & { status: 'pending_approval' }>('/api/auth/register', {
    username,
    password,
    publicKey,
  });
  return data;
};

// login: a username ("alice") or a full address ("alice@chat.example.com").
export const loginUser = async (login: string, password: string) => {
  const { data } = await httpClient.post<AuthResponse>('/api/auth/login', { login, password });
  return data;
};

export const getMe = async () => {
  const { data } = await httpClient.get<ApiUser>('/api/auth/me');
  return data;
};
