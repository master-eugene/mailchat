import dayjs from 'dayjs';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import React, { FC, useState } from 'react';

import { useAuth } from '../auth/useAuth';
import { db } from '../db/indexedDb';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import type { ConnectionState } from '../mail/realtime';
import { enablePush, pushSupport } from '../push/notifications';
import { chatHash, navigate } from '../router/useHashRoute';
import { Button, IconButton, Notice, Screen } from '../ui';
import { BellIcon, ChatsIcon, ComposeIcon, PasteIcon } from '../ui/icons';
import { Avatar, useDisplayName } from '../ui/people';
import classNames from '../utils/classNames';
import { errorText } from '../utils/errorText';

const bannerDismissedKey = 'mailchat.notificationBannerDismissed';

const formatTime = (timestamp: number, language: string) => {
  const date = dayjs(timestamp);
  if (date.isSame(dayjs(), 'day')) return date.format('HH:mm');
  const options: Intl.DateTimeFormatOptions =
    dayjs().diff(date, 'day') < 6 ? { weekday: 'short' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(language, options).format(timestamp);
};

const readDismissed = () => {
  try {
    return localStorage.getItem(bannerDismissedKey) === '1';
  } catch {
    return false;
  }
};

const NotificationBanner: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const support = pushSupport();
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
  const [dismissed, setDismissed] = useState(readDismissed);
  const [loading, setLoading] = useState(false);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(bannerDismissedKey, '1');
    } catch {
      // Not persisted in private mode; it stays hidden for this session.
    }
  };

  if (dismissed || support === 'unsupported' || permission === 'granted') return null;

  if (support === 'needs_install') {
    return (
      <Notice icon={<BellIcon size={20} />} title={t('install_title')} onClose={dismiss}>
        {t('install_ios_text')}
      </Notice>
    );
  }

  if (permission === 'denied') {
    return (
      <Notice tone='warning' icon={<BellIcon size={20} />} onClose={dismiss}>
        {t('notifications_blocked')}
      </Notice>
    );
  }

  const enable = async () => {
    setLoading(true);
    try {
      await enablePush();
      setPermission(Notification.permission);
    } catch (error) {
      show({ type: 'error', message: errorText(t, error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Notice icon={<BellIcon size={20} />} title={t('notifications_title')} onClose={dismiss}>
      <p className='mb-2.5'>{t('notifications_text')}</p>
      <Button className='h-9 px-3 text-sm' loading={loading} onClick={enable}>
        {t('enable_notifications')}
      </Button>
    </Notice>
  );
};

const ChatsView: FC<{ connection: ConnectionState }> = ({ connection }) => {
  const { t, currentLanguage } = useLocale();
  const { localUser } = useAuth();
  const nameOf = useDisplayName();

  const chats = useLiveQuery(
    () =>
      localUser
        ? db.chats
            .where('[ownerId+lastAt]')
            .between([localUser.id, Dexie.minKey], [localUser.id, Dexie.maxKey])
            .reverse()
            .toArray()
        : [],
    [localUser?.id],
  );

  const status =
    connection === 'online' ? undefined : (
      <span className='inline-flex items-center gap-1.5'>
        <span
          className={classNames(
            'h-1.5 w-1.5 rounded-full',
            connection === 'connecting' ? 'animate-pulse bg-amber-500' : 'bg-[var(--mc-danger)]',
          )}
        />
        {connection === 'connecting' ? t('connecting') : t('offline')}
      </span>
    );

  return (
    <Screen
      title={t('chats')}
      subtitle={status}
      padded={false}
      action={
        <>
          <IconButton label={t('open_message')} onClick={() => navigate('#/open')}>
            <PasteIcon />
          </IconButton>
          <IconButton label={t('new_chat')} onClick={() => navigate('#/new')}>
            <ComposeIcon />
          </IconButton>
        </>
      }
    >
      <div className='px-3 pt-3 empty:hidden'>
        <NotificationBanner />
      </div>

      {chats?.length === 0 && (
        <div className='flex flex-col items-center gap-3 px-8 py-16 text-center'>
          <span className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mc-accent)]/12 text-[var(--mc-accent)]'>
            <ChatsIcon size={30} />
          </span>
          <p className='text-lg font-semibold text-[var(--mc-text)]'>{t('no_chats')}</p>
          <p className='text-sm text-[var(--mc-muted)]'>{t('your_address', { address: localUser?.address ?? '' })}</p>
          <Button className='mt-2' onClick={() => navigate('#/new')}>
            <ComposeIcon size={18} />
            {t('new_chat')}
          </Button>
        </div>
      )}

      <ul className='py-1'>
        {chats?.map(chat => {
          const unread = chat.unread > 0;
          return (
            <li key={chat.key}>
              <button
                type='button'
                className='flex w-full items-center gap-3 px-3 py-2 text-start transition hover:bg-[var(--mc-panel)] active:bg-[var(--mc-panel-strong)]'
                onClick={() => navigate(chatHash(chat.peer))}
              >
                <Avatar address={chat.peer} />
                <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='flex items-baseline gap-2'>
                    <span className='flex-1 truncate font-semibold text-[var(--mc-text)]'>{nameOf(chat.peer)}</span>
                    <span
                      className={classNames(
                        'shrink-0 text-xs',
                        unread ? 'font-medium text-[var(--mc-accent)]' : 'text-[var(--mc-muted)]',
                      )}
                    >
                      {formatTime(chat.lastAt, currentLanguage)}
                    </span>
                  </span>
                  <span className='flex items-center gap-2'>
                    <span
                      className={classNames(
                        'flex-1 truncate text-sm',
                        unread ? 'text-[var(--mc-text)]' : 'text-[var(--mc-muted)]',
                      )}
                    >
                      {chat.lastOut && <span className='text-[var(--mc-muted)]'>{t('you')}: </span>}
                      {chat.lastBody}
                    </span>
                    {unread && (
                      <span className='min-w-5 shrink-0 rounded-full bg-[var(--mc-accent)] px-1.5 text-center text-xs leading-5 font-semibold text-white'>
                        {chat.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
};

export default ChatsView;
