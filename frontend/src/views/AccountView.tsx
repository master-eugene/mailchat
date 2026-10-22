import { useLiveQuery } from 'dexie-react-hooks';
import React, { FC, FormEvent, ReactNode, useEffect, useState } from 'react';

import { useAuth } from '../auth/useAuth';
import { createKeyBackup } from '../crypto/keyBackup';
import { keyFingerprint } from '../crypto/keys';
import { getSetting, setSetting } from '../db/indexedDb';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { enablePush, pushSupport } from '../push/notifications';
import { useTheme } from '../theme/useTheme';
import type { ThemePreference } from '../theme/themeStorage';
import { Button, Fingerprint, Screen, Segmented, TextField } from '../ui';
import { BellIcon, ChevronIcon, LockIcon, ShieldIcon } from '../ui/icons';
import LanguagePicker from '../ui/LanguagePicker';
import { Avatar, displayName } from '../ui/people';
import classNames from '../utils/classNames';
import { errorText } from '../utils/errorText';

const minPassphraseLength = 10;

const downloadJson = (fileName: string, data: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const Section: FC<{ title?: string; children: ReactNode }> = ({ title, children }) => (
  <section className='flex flex-col gap-2'>
    {title && <h2 className='px-1 text-xs font-semibold tracking-wide text-[var(--mc-muted)] uppercase'>{title}</h2>}
    <div className='flex flex-col gap-3 rounded-2xl bg-[var(--mc-panel)] p-4'>{children}</div>
  </section>
);

const KeyBackup: FC = () => {
  const { t, currentLanguage } = useLocale();
  const { show } = useToasts();
  const { localUser } = useAuth();
  const lastBackupAt = useLiveQuery(() => getSetting('lastBackupAt'), []);
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [repeat, setRepeat] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportBackup = async (event: FormEvent) => {
    event.preventDefault();
    if (!localUser) return;
    if (passphrase.length < minPassphraseLength) {
      show({ type: 'error', message: t('error_passphrase_too_short') });
      return;
    }
    if (passphrase !== repeat) {
      show({ type: 'error', message: t('error_passphrases_mismatch') });
      return;
    }

    setExporting(true);
    try {
      downloadJson(`mailchat-key-${localUser.address}.json`, await createKeyBackup(localUser, passphrase));
      await setSetting('lastBackupAt', String(Date.now()));
      setPassphrase('');
      setRepeat('');
      setOpen(false);
      show({ type: 'success', message: t('backup_saved') });
    } finally {
      setExporting(false);
    }
  };

  const status = lastBackupAt
    ? t('backup_last', {
        date: new Intl.DateTimeFormat(currentLanguage, { dateStyle: 'medium' }).format(Number(lastBackupAt)),
      })
    : t('backup_never');

  return (
    <>
      <button type='button' className='flex items-center gap-3 text-start' onClick={() => setOpen(value => !value)}>
        <span
          className={classNames(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            lastBackupAt ? 'bg-[var(--mc-accent)]/12 text-[var(--mc-accent)]' : 'bg-amber-500/15 text-amber-500',
          )}
        >
          <LockIcon size={18} />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block font-medium text-[var(--mc-text)]'>{t('export_backup')}</span>
          <span className={classNames('block text-sm', lastBackupAt ? 'text-[var(--mc-muted)]' : 'text-amber-500')}>
            {status}
          </span>
        </span>
        <ChevronIcon size={20} className={classNames('text-[var(--mc-muted)] transition', open && 'rotate-90')} />
      </button>

      {open && (
        <form className='flex flex-col gap-3 border-t border-[var(--mc-border)] pt-3' onSubmit={exportBackup}>
          <p className='text-sm text-[var(--mc-muted)]'>{t('export_backup_text')}</p>
          <TextField
            label={t('passphrase')}
            type='password'
            autoComplete='new-password'
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            hint={t('passphrase_hint')}
          />
          <TextField
            label={t('passphrase_repeat')}
            type='password'
            autoComplete='new-password'
            value={repeat}
            onChange={event => setRepeat(event.target.value)}
          />
          <Button type='submit' loading={exporting} disabled={!passphrase || !repeat}>
            {t('download_backup')}
          </Button>
        </form>
      )}
    </>
  );
};

const NotificationsRow: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const support = pushSupport();
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));

  const turnOn = async () => {
    try {
      await enablePush();
      setPermission(Notification.permission);
    } catch (error) {
      show({ type: 'error', message: errorText(t, error) });
    }
  };

  const on = support === 'available' && permission === 'granted';
  const text =
    support === 'needs_install'
      ? t('install_ios_text')
      : support === 'unsupported'
        ? t('notifications_unsupported')
        : permission === 'denied'
          ? t('notifications_blocked')
          : on
            ? t('notifications_on')
            : t('notifications_text');

  return (
    <div className='flex items-start gap-3'>
      <span
        className={classNames(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          on
            ? 'bg-[var(--mc-accent)]/12 text-[var(--mc-accent)]'
            : 'bg-[var(--mc-panel-strong)] text-[var(--mc-muted)]',
        )}
      >
        <BellIcon size={18} />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='font-medium text-[var(--mc-text)]'>{t('notifications_title')}</div>
        <div className='text-sm text-[var(--mc-muted)]'>{text}</div>
        {support === 'available' && permission === 'default' && (
          <Button className='mt-2.5 h-9 px-3 text-sm' onClick={turnOn}>
            {t('enable_notifications')}
          </Button>
        )}
      </div>
    </div>
  );
};

const AccountView: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const { preference, setTheme } = useTheme();
  const { localUser, logout, removeDeviceKey } = useAuth();
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    if (localUser) keyFingerprint(localUser.publicKey).then(setFingerprint);
  }, [localUser]);

  const copyAddress = async () => {
    if (!localUser) return;
    try {
      await navigator.clipboard.writeText(localUser.address);
      show({ type: 'success', message: t('address_copied') });
    } catch {
      show({ type: 'error', message: t('error_generic') });
    }
  };

  const removeKey = async () => {
    if (confirm(t('remove_device_key_confirm'))) {
      await removeDeviceKey();
    }
  };

  const address = localUser?.address ?? '';

  return (
    <Screen title={t('account')}>
      <div className='flex flex-col gap-6 pb-4'>
        <div className='flex flex-col items-center gap-2 pt-2 text-center'>
          <Avatar address={address} size='lg' />
          <div className='text-xl font-semibold text-[var(--mc-text)]'>{displayName(address, address)}</div>
          <button
            type='button'
            onClick={copyAddress}
            className='rounded-full bg-[var(--mc-panel)] px-3 py-1 text-sm text-[var(--mc-muted)] transition hover:text-[var(--mc-text)]'
            title={t('copy_address')}
          >
            {address}
          </button>
          <p className='max-w-72 text-xs text-[var(--mc-muted)]'>{t('your_address_hint')}</p>
        </div>

        <Section title={t('security')}>
          <div className='flex items-start gap-3'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--mc-accent)]/12 text-[var(--mc-accent)]'>
              <ShieldIcon size={18} />
            </span>
            <div className='min-w-0 flex-1'>
              <div className='mb-2 font-medium text-[var(--mc-text)]'>{t('your_key_fingerprint')}</div>
              <Fingerprint value={fingerprint} />
              <p className='mt-2 text-xs text-[var(--mc-muted)]'>{t('fingerprint_hint')}</p>
            </div>
          </div>
          <div className='border-t border-[var(--mc-border)]' />
          <KeyBackup />
        </Section>

        <Section>
          <NotificationsRow />
        </Section>

        <Section title={t('appearance')}>
          <Segmented<ThemePreference>
            value={preference}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('theme_system') },
              { value: 'light', label: t('theme_light') },
              { value: 'dark', label: t('theme_dark') },
            ]}
          />
          <LanguagePicker />
        </Section>

        <Section title={t('this_device')}>
          <p className='text-sm text-[var(--mc-muted)]'>{t('local_only_note')}</p>
          <Button variant='secondary' onClick={logout}>
            {t('sign_out')}
          </Button>
          <Button variant='danger-soft' onClick={removeKey}>
            {t('remove_device_key')}
          </Button>
        </Section>
      </div>
    </Screen>
  );
};

export default AccountView;
