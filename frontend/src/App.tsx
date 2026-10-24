import React, { FC, useEffect, useState } from 'react';

import './assets/style.css';

import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import useLocale from './hooks/useLocale';
import useVisibleViewport from './hooks/useVisibleViewport';
import { flushAcks } from './mail/receive';
import { startRealtime, type ConnectionState } from './mail/realtime';
import { failStaleSends } from './mail/send';
import ToastProvider from './providers/ToastProvider';
import { refreshPushSubscription, registerServiceWorker } from './push/notifications';
import { navigate, useHashRoute, type Route } from './router/useHashRoute';
import { ThemeProvider } from './theme/ThemeProvider';
import { Spinner } from './ui';
import { ChatsIcon, UserIcon } from './ui/icons';
import classNames from './utils/classNames';
import AccountView from './views/AccountView';
import AuthView from './views/AuthView';
import ChatsView from './views/ChatsView';
import ConversationView from './views/ConversationView';
import MissingKeyView from './views/MissingKeyView';
import NewChatView from './views/NewChatView';
import OpenView from './views/OpenView';
import ReadView from './views/ReadView';

registerServiceWorker().catch(() => undefined);

const tabs = [
  { route: 'chats', hash: '#/chats', label: 'chats', Icon: ChatsIcon },
  { route: 'account', hash: '#/account', label: 'account', Icon: UserIcon },
] as const;

const Messenger: FC<{ route: Route }> = ({ route }) => {
  const { t } = useLocale();
  const { localUser } = useAuth();
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  useEffect(() => {
    if (!localUser) return;
    failStaleSends(localUser.id);
    flushAcks();
    refreshPushSubscription().catch(() => undefined);
    return startRealtime(setConnection);
  }, [localUser]);

  // Tapping a notification while the app is open: the service worker asks us to open that chat.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'open' && typeof event.data.hash === 'string') navigate(event.data.hash);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const screen = (() => {
    switch (route.name) {
      case 'chat':
        return <ConversationView key={route.peer} peer={route.peer} />;
      case 'new':
        return <NewChatView />;
      case 'open':
        return <OpenView />;
      case 'read':
        return <ReadView payload={route.payload} />;
      case 'account':
        return <AccountView />;
      default:
        return <ChatsView connection={connection} />;
    }
  })();

  const showTabs = route.name === 'chats' || route.name === 'account';

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='min-h-0 flex-1'>{screen}</div>
      {showTabs && (
        <nav className='mc-tabbar flex shrink-0 border-t border-[var(--mc-border)] bg-[var(--mc-panel)] pb-[var(--safe-bottom)]'>
          {tabs.map(({ route: tab, hash, label, Icon }) => (
            <button
              key={tab}
              type='button'
              aria-current={route.name === tab ? 'page' : undefined}
              className={classNames(
                'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition',
                route.name === tab ? 'text-[var(--mc-accent)]' : 'text-[var(--mc-muted)] hover:text-[var(--mc-text)]',
              )}
              onClick={() => navigate(hash)}
            >
              <Icon size={24} />
              {t(label)}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

const Root: FC = () => {
  const { status } = useAuth();
  const route = useHashRoute();

  if (status === 'loading') return <Spinner />;
  if (status === 'signed_out') return <AuthView />;
  if (status === 'missing_key') return <MissingKeyView />;

  return <Messenger route={route} />;
};

const App: FC = () => {
  useVisibleViewport();

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className='mx-auto h-full w-full max-w-2xl bg-[var(--mc-bg)] pt-[env(safe-area-inset-top)]'>
            <Root />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
