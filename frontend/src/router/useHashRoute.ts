import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

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

// Only screen changes started inside the app animate. Back/forward through history (the iOS
// edge swipe, the browser's back button) are already animated by the system; animating them
// again shows the screen twice.
let inAppNavigation = false;

export const navigate = (hash: string, options: { replace?: boolean } = {}) => {
  // Already there: no hashchange will fire, so don't leave the flag set for a later swipe.
  if (!options.replace && window.location.hash === hash) return;
  inAppNavigation = true;
  if (options.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
};

// Tabs are level 0; screens opened from them are level 1. Going deeper slides in from the
// right, going back slides out, switching tabs cross-fades (see style.css).
const depth = (route: Route) => (route.name === 'chats' || route.name === 'account' ? 0 : 1);

type Direction = 'forward' | 'back' | 'fade';

const direction = (from: Route, to: Route): Direction => {
  if (depth(to) > depth(from)) return 'forward';
  if (depth(to) < depth(from)) return 'back';
  return 'fade';
};

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => ViewTransition };

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useHashRoute = () => {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    let current = parseRoute(window.location.hash);
    const doc = document as ViewTransitionDocument;

    const update = (event: Event) => {
      const next = parseRoute(window.location.hash);
      const previous = current;
      current = next;
      const fromApp = inAppNavigation;
      inAppNavigation = false;
      // Set by browsers that already played their own transition (e.g. a swipe gesture).
      const systemAnimated = (event as Event & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true;

      if (
        !fromApp ||
        systemAnimated ||
        document.visibilityState !== 'visible' ||
        !doc.startViewTransition ||
        reducedMotion() ||
        JSON.stringify(previous) === JSON.stringify(next)
      ) {
        setRoute(next);
        return;
      }

      document.documentElement.dataset.nav = direction(previous, next);
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        flushSync(() => setRoute(next));
      };
      const transition = doc.startViewTransition(show);
      // A transition waits for the next painted frame. If the page stops painting (app sent to
      // the background mid-tap), switch screens anyway rather than leave the old one showing.
      setTimeout(() => {
        if (!shown && current === next) {
          shown = true;
          setRoute(next);
        }
      }, 600);
      // Skipped when another navigation interrupts it; the new screen is already shown, so ignore.
      transition.ready.catch(() => undefined);
      transition.finished.catch(() => undefined).finally(() => delete document.documentElement.dataset.nav);
    };

    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
};
