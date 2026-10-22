import dayjs from 'dayjs';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import React, { FC, FormEvent, useEffect, useRef, useState } from 'react';
import Textarea from 'react-textarea-autosize';

import { useAuth } from '../auth/useAuth';
import { keyFingerprint } from '../crypto/keys';
import { chatKey, db, type LocalMessage } from '../db/indexedDb';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { syncMailbox } from '../mail/receive';
import {
  acceptNewKey,
  exportMessage,
  KeyChangedError,
  maxMessageLength,
  resolveRecipient,
  retryMessage,
  sendMessage,
} from '../mail/send';
import { navigate } from '../router/useHashRoute';
import { Button, Fingerprint, IconButton, Notice, Screen } from '../ui';
import { ClockIcon, CheckIcon, DoubleCheckIcon, LockIcon, SendIcon, ShareIcon, ShieldIcon } from '../ui/icons';
import { Avatar, useDisplayName } from '../ui/people';
import classNames from '../utils/classNames';
import { errorText } from '../utils/errorText';

const useFingerprint = (publicKey?: string) => {
  const [value, setValue] = useState('');
  useEffect(() => {
    if (publicKey) keyFingerprint(publicKey).then(setValue);
    else setValue('');
  }, [publicKey]);
  return value;
};

const StatusIcon: FC<{ status: LocalMessage['status'] }> = ({ status }) => {
  if (status === 'sending') return <ClockIcon size={14} />;
  if (status === 'sent') return <CheckIcon size={15} />;
  if (status === 'delivered') return <DoubleCheckIcon size={16} />;
  return null;
};

type BubbleProps = { message: LocalMessage; first: boolean; last: boolean; onRetry: (id: string) => void };

const Bubble: FC<BubbleProps> = ({ message, first, last, onRetry }) => {
  const { t } = useLocale();
  const own = message.direction === 'out';

  return (
    <div className={classNames('flex', own ? 'justify-end' : 'justify-start', first ? 'mt-2' : 'mt-0.5')}>
      <div
        className={classNames(
          'max-w-[82%] rounded-[18px] px-3 py-1.5 shadow-sm',
          own ? 'bg-[var(--mc-bubble-own)] text-white' : 'bg-[var(--mc-bubble-in)] text-[var(--mc-text)]',
          own && !first && 'rounded-tr-md',
          own && !last && 'rounded-br-md',
          own && last && 'rounded-br-sm',
          !own && !first && 'rounded-tl-md',
          !own && !last && 'rounded-bl-md',
          !own && last && 'rounded-bl-sm',
          message.status === 'failed' && 'opacity-80',
        )}
      >
        <span className='break-words whitespace-pre-wrap'>{message.body}</span>
        {/* Floats after the text so short messages stay on one line with their time. */}
        <span
          className={classNames(
            'relative -bottom-1 float-right ms-3 mt-1 inline-flex items-center gap-1 text-[11px] leading-none',
            own ? 'text-white/75' : 'text-[var(--mc-muted)]',
          )}
        >
          {dayjs(message.sentAt).format('HH:mm')}
          {own && message.status === 'failed' ? (
            <button type='button' className='font-semibold text-white underline' onClick={() => onRetry(message.id)}>
              {t('retry')}
            </button>
          ) : (
            own && <StatusIcon status={message.status} />
          )}
        </span>
      </div>
    </div>
  );
};

const dayKey = (timestamp: number) => dayjs(timestamp).format('YYYY-MM-DD');

const DaySeparator: FC<{ timestamp: number }> = ({ timestamp }) => {
  const { t, currentLanguage } = useLocale();
  const day = dayjs(timestamp);
  const label = day.isSame(dayjs(), 'day')
    ? t('today')
    : day.isSame(dayjs().subtract(1, 'day'), 'day')
      ? t('yesterday')
      : new Intl.DateTimeFormat(currentLanguage, {
          day: 'numeric',
          month: 'long',
          year: day.isSame(dayjs(), 'year') ? undefined : 'numeric',
        }).format(timestamp);

  return (
    <div className='sticky top-1 z-[1] my-3 flex justify-center'>
      <span className='rounded-full bg-[var(--mc-panel)]/90 px-3 py-1 text-xs font-medium text-[var(--mc-muted)] shadow-sm backdrop-blur'>
        {label}
      </span>
    </div>
  );
};

// Messages from the same person within a few minutes are drawn as one group.
const sameGroup = (a?: LocalMessage, b?: LocalMessage) =>
  Boolean(a && b) &&
  a!.direction === b!.direction &&
  dayKey(a!.sentAt) === dayKey(b!.sentAt) &&
  Math.abs(b!.sentAt - a!.sentAt) < 5 * 60 * 1000;

const ConversationView: FC<{ peer: string }> = ({ peer }) => {
  const { t } = useLocale();
  const { show } = useToasts();
  const { localUser } = useAuth();
  const nameOf = useDisplayName();
  const [text, setText] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useLiveQuery(
    () =>
      localUser
        ? db.messages
            .where('[ownerId+peer+sentAt]')
            .between([localUser.id, peer, Dexie.minKey], [localUser.id, peer, Dexie.maxKey])
            .toArray()
        : [],
    [localUser?.id, peer],
  );
  // null = not pinned yet; undefined = still loading.
  const contact = useLiveQuery(() => db.contacts.get(peer).then(found => found ?? null), [peer]);
  const contactFingerprint = useFingerprint(contact?.publicKey);
  const pendingFingerprint = useFingerprint(contact?.pendingKey);
  const myFingerprint = useFingerprint(localUser?.publicKey);

  // First visit from a link or address: fetch and pin the contact's key.
  useEffect(() => {
    if (contact !== null) return;
    resolveRecipient(peer).catch(error => {
      if (!(error instanceof KeyChangedError)) show({ type: 'error', message: errorText(t, error) });
    });
  }, [contact, peer, show, t]);

  useEffect(() => {
    if (!localUser) return;
    db.chats.update(chatKey(localUser.id, peer), { unread: 0 });
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [localUser, messages?.length, peer]);

  // When the keyboard opens (the visible area shrinks), keep the latest messages in view.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let lastHeight = viewport.height;
    const onResize = () => {
      if (viewport.height < lastHeight) bottomRef.current?.scrollIntoView({ block: 'end' });
      lastHeight = viewport.height;
    };
    viewport.addEventListener('resize', onResize);
    return () => viewport.removeEventListener('resize', onResize);
  }, []);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = text.trim();
    if (!body || !localUser) return;

    setText('');
    try {
      await sendMessage(localUser, peer, body);
    } catch (error) {
      if (!(error instanceof KeyChangedError)) show({ type: 'error', message: errorText(t, error) });
    }
  };

  const retry = async (id: string) => {
    if (!localUser) return;
    try {
      await retryMessage(localUser, id);
    } catch (error) {
      show({ type: 'error', message: errorText(t, error) });
    }
  };

  // Offline path: hand the encrypted block to the system share sheet (or clipboard).
  const share = async () => {
    const body = text.trim();
    if (!body || !localUser) return;
    try {
      const block = await exportMessage(localUser, peer, body);
      setText('');
      if (navigator.share) {
        await navigator.share({ text: block }).catch(() => undefined);
      } else {
        await navigator.clipboard.writeText(block);
        show({ type: 'success', message: t('copied_encrypted') });
      }
    } catch (error) {
      show({ type: 'error', message: errorText(t, error) });
    }
  };

  const trust = async () => {
    await acceptNewKey(peer);
    syncMailbox().catch(() => undefined);
  };

  return (
    <Screen
      padded={false}
      title={nameOf(peer)}
      subtitle={
        <span className='inline-flex items-center gap-1'>
          <LockIcon size={11} />
          {peer}
        </span>
      }
      leading={<Avatar address={peer} size='sm' />}
      onBack={() => navigate('#/chats')}
      action={
        <IconButton
          label={t('keys')}
          onClick={() => setShowKeys(value => !value)}
          className={showKeys ? 'bg-[var(--mc-accent)]/12' : undefined}
        >
          <ShieldIcon />
        </IconButton>
      }
      footer={
        <form
          className='flex items-end gap-1.5 border-t border-[var(--mc-border)] ps-3 pe-2 pt-2 pb-[max(0.5rem,var(--safe-bottom))]'
          onSubmit={send}
        >
          <Textarea
            minRows={1}
            maxRows={6}
            maxLength={maxMessageLength}
            value={text}
            placeholder={t('message_placeholder')}
            disabled={Boolean(contact?.pendingKey)}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !('ontouchstart' in window)) {
                event.preventDefault();
                send();
              }
            }}
            className='min-h-10 flex-1 resize-none rounded-[20px] border border-[var(--mc-border)] bg-[var(--mc-input)] px-4 py-2 text-base leading-6 text-[var(--mc-text)] transition outline-none focus:border-[var(--mc-accent)]'
          />
          <IconButton
            type='submit'
            tone='accent'
            label={t('send')}
            disabled={!text.trim()}
            className='rtl:-scale-x-100'
          >
            <SendIcon size={20} />
          </IconButton>
        </form>
      }
    >
      <div className='flex min-h-full flex-col px-3 py-2'>
        {showKeys && (
          <section className='mb-2 rounded-2xl bg-[var(--mc-panel)] p-4 text-sm'>
            <div className='mb-3 flex items-center gap-2 font-semibold text-[var(--mc-text)]'>
              <ShieldIcon size={18} className='text-[var(--mc-accent)]' />
              {t('keys')}
            </div>
            <div className='mb-1 text-xs text-[var(--mc-muted)]'>{nameOf(peer)}</div>
            <Fingerprint value={contactFingerprint} />
            <div className='mt-3 mb-1 text-xs text-[var(--mc-muted)]'>{t('you')}</div>
            <Fingerprint value={myFingerprint} />
            <p className='mt-3 text-xs text-[var(--mc-muted)]'>{t('fingerprint_hint')}</p>

            <div className='mt-4 border-t border-[var(--mc-border)] pt-4'>
              <div className='mb-1 font-semibold text-[var(--mc-text)]'>{t('offline_title')}</div>
              <p className='mb-3 text-xs text-[var(--mc-muted)]'>{t('offline_text')}</p>
              <Button
                variant='secondary'
                className='h-9 w-full text-sm'
                onClick={share}
                disabled={!text.trim() || Boolean(contact?.pendingKey)}
              >
                <ShareIcon size={18} />
                {t('share_encrypted')}
              </Button>
            </div>
          </section>
        )}

        {contact?.pendingKey && (
          <div className='mb-2'>
            <Notice tone='danger' title={t('key_changed_title')} icon={<ShieldIcon size={20} />}>
              <p className='mb-3'>{t('key_changed_text', { address: peer })}</p>
              <div className='mb-1 text-xs opacity-75'>{t('previous_key')}</div>
              <Fingerprint value={contactFingerprint} />
              <div className='mt-2 mb-1 text-xs opacity-75'>{t('current_key')}</div>
              <Fingerprint value={pendingFingerprint} />
              <Button variant='danger' className='mt-3 h-9 text-sm' onClick={trust}>
                {t('trust_new_key')}
              </Button>
            </Notice>
          </div>
        )}

        {messages?.length === 0 && (
          <div className='m-auto flex max-w-64 flex-col items-center gap-3 py-10 text-center'>
            <span className='flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mc-accent)]/12 text-[var(--mc-accent)]'>
              <LockIcon size={26} />
            </span>
            <p className='text-sm text-[var(--mc-muted)]'>{t('chat_empty')}</p>
          </div>
        )}

        {messages?.length ? <div className='flex-1' /> : null}
        {messages?.map((message, index) => {
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const newDay = !previous || dayKey(previous.sentAt) !== dayKey(message.sentAt);
          return (
            <React.Fragment key={message.id}>
              {newDay && <DaySeparator timestamp={message.sentAt} />}
              <Bubble
                message={message}
                first={newDay || !sameGroup(previous, message)}
                last={!sameGroup(message, next)}
                onRetry={retry}
              />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} className='h-2 shrink-0' />
      </div>
    </Screen>
  );
};

export default ConversationView;
