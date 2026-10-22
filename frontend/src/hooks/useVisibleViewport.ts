import { useEffect } from 'react';

// iOS doesn't shrink the page when the on-screen keyboard opens; it slides the whole page up,
// taking the message bar with it. Sizing the app to the visible area (and undoing the slide)
// keeps the header and the message bar where they belong, like a native app.
const useVisibleViewport = () => {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--app-height', `${Math.round(viewport.height)}px`);
      // Keyboard up: the visible area is much shorter than the window. The home-bar space at the
      // bottom (safe area) is then covered by the keyboard, so it isn't reserved (see style.css).
      root.dataset.keyboard = window.innerHeight - viewport.height > 120 ? 'open' : 'closed';
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--app-height');
      delete root.dataset.keyboard;
    };
  }, []);
};

export default useVisibleViewport;
