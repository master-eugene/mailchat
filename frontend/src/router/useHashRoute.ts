import { useEffect, useState } from 'react';

// Routes live in the URL fragment on purpose: the fragment is never sent to any server,
// so encrypted payloads in links stay out of server logs.
export type Route =
  | { name: 'chats' | 'new' | 'open' | 'account' }
  | { name: 'chat'; peer: string }
  | { name: 'read'; payload: string };

export const parseRoute = (hash: string): Route => {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  const [section, ...rest] = path.split('/');

  switch (section) {
    case 'new':
    case 'open':
    case 'account':
      return { name: section };
    case 'chat':
      return rest[0] ? { name: 'chat', peer: decodeURIComponent(rest.join('/')) } : { name: 'chats' };
    case 'read':
      return { name: 'read', payload: params.get('m') ?? '' };
    default:
      return { name: 'chats' };
  }
};

export const chatHash = (peer: string) => `#/chat/${encodeURIComponent(peer)}`;

export const navigate = (hash: string, options: { replace?: boolean } = {}) => {
  if (options.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
};

export const useHashRoute = () => {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
};
