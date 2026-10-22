import { db, type LocalUser } from './indexedDb';

export const saveCurrentUser = async (user: LocalUser) => {
  await db.currentUser.clear();
  await db.currentUser.put(user);
};

export const getCurrentUser = async () => {
  return db.currentUser.toCollection().first();
};

// Removes the private key, session and every decrypted message from this device.
export const eraseDeviceData = async () => {
  await Promise.all(db.tables.map(table => table.clear()));
};
