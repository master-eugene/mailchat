import React, { createContext, FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { getMe, loginUser, registerUser, type ApiUser } from '../api/authApi';
import { clearStoredToken, getStoredToken, sessionExpiredEvent, setStoredToken } from '../api/httpClient';
import { restoreKeyBackup } from '../crypto/keyBackup';
import { generateUserKeyPair } from '../crypto/keys';
import type { LocalUser } from '../db/indexedDb';
import { eraseDeviceData, getCurrentUser, saveCurrentUser } from '../db/userRepository';

// ready: signed in and this device holds the matching private key.
// missing_key: signed in, but messages can't be decrypted here until a key backup is restored.
export type AuthStatus = 'loading' | 'signed_out' | 'missing_key' | 'ready';

type AuthContextValue = {
  status: AuthStatus;
  user: ApiUser | null;
  localUser: LocalUser | null;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  importKey: (fileContent: string, passphrase: string) => Promise<void>;
  removeDeviceKey: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export class KeyMismatchError extends Error {}

const keyMatches = (apiUser: ApiUser, localUser: LocalUser | undefined): localUser is LocalUser =>
  localUser?.id === apiUser.id && localUser.publicKey === apiUser.publicKey;

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);

  const startSession = useCallback(async (apiUser: ApiUser) => {
    const deviceUser = await getCurrentUser();
    setUser(apiUser);
    if (!keyMatches(apiUser, deviceUser)) {
      setLocalUser(null);
      setStatus('missing_key');
      return;
    }

    // The server decides the address (login@MAIL_DOMAIN). If the admin changed the domain,
    // keep this device in step so incoming messages, addressed to the new one, are accepted.
    let current: LocalUser = deviceUser;
    if (deviceUser.address !== apiUser.address || deviceUser.username !== apiUser.username) {
      current = { ...deviceUser, address: apiUser.address, username: apiUser.username };
      await saveCurrentUser(current);
    }
    setLocalUser(current);
    setStatus('ready');
  }, []);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
    setLocalUser(null);
    setStatus('signed_out');
  }, []);

  useEffect(() => {
    getStoredToken()
      .then(async token => {
        if (!token) {
          setStatus('signed_out');
          return;
        }
        await startSession(await getMe());
      })
      .catch(async error => {
        // Offline or server blocked: keep working from local data instead of signing out.
        const deviceUser = await getCurrentUser();
        const unauthorized = (error as { response?: { status?: number } })?.response?.status === 401;
        if (deviceUser && !unauthorized) {
          setLocalUser(deviceUser);
          setUser({ ...deviceUser, createdAt: '' });
          setStatus('ready');
        } else {
          await logout();
        }
      });
  }, [logout, startSession]);

  useEffect(() => {
    const expire = () => void logout();
    window.addEventListener(sessionExpiredEvent, expire);
    return () => window.removeEventListener(sessionExpiredEvent, expire);
  }, [logout]);

  const login = useCallback(
    async (login: string, password: string) => {
      const response = await loginUser(login, password);
      await setStoredToken(response.token);
      await startSession(response.user);
    },
    [startSession],
  );

  // Nothing is sent to the user: the account waits until an admin approves it.
  const register = useCallback(async (username: string, password: string) => {
    const keyPair = await generateUserKeyPair();
    const response = await registerUser(username, password, keyPair.publicKey);

    await saveCurrentUser({
      id: response.id,
      username: response.username,
      address: response.address,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    });
  }, []);

  const importKey = useCallback(
    async (fileContent: string, passphrase: string) => {
      const restored = await restoreKeyBackup(fileContent, passphrase);
      if (user && !keyMatches(user, restored)) {
        throw new KeyMismatchError('backup_other_account');
      }

      await saveCurrentUser(restored);
      if (user) {
        setLocalUser(restored);
        setStatus('ready');
      }
    },
    [user],
  );

  const removeDeviceKey = useCallback(async () => {
    await eraseDeviceData();
    await logout();
  }, [logout]);

  const value = useMemo(
    () => ({ status, user, localUser, login, register, importKey, removeDeviceKey, logout }),
    [importKey, localUser, login, logout, register, removeDeviceKey, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
