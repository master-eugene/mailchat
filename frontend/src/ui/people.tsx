import React, { FC } from 'react';

import { useAuth } from '../auth/useAuth';
import classNames from '../utils/classNames';

// Contacts on your own server are shown by login ("leo"); others by full address.
export const displayName = (address: string, myAddress?: string) => {
  const [login, domain] = address.split('@');
  const myDomain = myAddress?.split('@')[1];
  return domain && domain === myDomain ? login : address;
};

export const useDisplayName = () => {
  const { localUser } = useAuth();
  return (address: string) => displayName(address, localUser?.address);
};

const palette = ['#e5646a', '#4fb35a', '#e3963a', '#3d93d8', '#8b74e0', '#e05a9a', '#2eaaa8', '#f07f4b'];

const colorFor = (value: string) => {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

export const Avatar: FC<{ address: string; size?: 'sm' | 'md' | 'lg' }> = ({ address, size = 'md' }) => (
  <span
    aria-hidden='true'
    className={classNames(
      'flex shrink-0 items-center justify-center rounded-full font-semibold text-white uppercase select-none',
      size === 'sm' && 'h-9 w-9 text-sm',
      size === 'md' && 'h-12 w-12 text-lg',
      size === 'lg' && 'h-16 w-16 text-2xl',
    )}
    style={{
      background: `linear-gradient(160deg, color-mix(in srgb, ${colorFor(address)} 80%, white), ${colorFor(address)})`,
    }}
  >
    {address.charAt(0)}
  </span>
);
