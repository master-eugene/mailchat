import React, { FC, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import useLocale from '../hooks/useLocale';
import classNames from '../utils/classNames';
import { CheckIcon, ChevronIcon } from './icons';

// A styled dropdown instead of the native <select>, so it looks the same on every phone.
const LanguagePicker: FC<{ compact?: boolean }> = ({ compact }) => {
  const { t, currentLanguage, languages, changeLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const labelId = useId();

  const currentIndex = Math.max(
    0,
    languages.findIndex(language => language.code === currentLanguage),
  );
  const current = languages[currentIndex];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const show = () => {
    // Open upwards when there isn't room for the list below the button.
    const rect = buttonRef.current?.getBoundingClientRect();
    const listHeight = Math.min(languages.length, 6) * 44 + 12;
    setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < listHeight && rect.top > listHeight));
    setActive(currentIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    const language = languages[index];
    if (language) changeLocale(language.code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(index => (index + 1) % languages.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => (index - 1 + languages.length) % languages.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={classNames('relative flex gap-2', compact ? 'items-center justify-center' : 'flex-col')}
    >
      <span id={labelId} className={classNames('text-[var(--mc-muted)]', compact ? 'text-xs' : 'text-sm font-medium')}>
        {t('language')}
      </span>

      <div className={classNames('relative', !compact && 'w-full')}>
        <button
          ref={buttonRef}
          type='button'
          aria-haspopup='listbox'
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${listId}-value`}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
          className={classNames(
            'flex w-full items-center gap-3 rounded-xl border bg-[var(--mc-input)] text-start text-[var(--mc-text)] transition outline-none',
            open
              ? 'border-[var(--mc-accent)] ring-2 ring-[var(--mc-accent)]/25'
              : 'border-[var(--mc-border)] focus-visible:border-[var(--mc-accent)]',
            compact ? 'h-9 min-w-36 ps-3 pe-2.5 text-sm' : 'h-11 ps-3.5 pe-3 text-base',
          )}
        >
          <span id={`${listId}-value`} className='flex-1 truncate'>
            {current?.name}
          </span>
          <ChevronIcon
            size={compact ? 16 : 18}
            className={classNames(
              'shrink-0 text-[var(--mc-muted)] transition-transform',
              open ? '-rotate-90' : 'rotate-90',
            )}
          />
        </button>

        {open && (
          <ul
            id={listId}
            role='listbox'
            aria-labelledby={labelId}
            className={classNames(
              'absolute start-0 z-20 max-h-72 w-full min-w-44 overflow-y-auto rounded-xl border border-[var(--mc-border)] bg-[var(--mc-panel)] p-1.5 shadow-xl',
              openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {languages.map((language, index) => {
              const selected = language.code === currentLanguage;
              return (
                <li
                  key={language.code}
                  role='option'
                  aria-selected={selected}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={classNames(
                    'flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[var(--mc-text)]',
                    compact ? 'text-sm' : 'text-base',
                    index === active && 'bg-[var(--mc-accent)]/12',
                    selected && 'font-semibold',
                  )}
                >
                  <span className='flex-1 truncate'>{language.name}</span>
                  {selected && <CheckIcon size={16} className='shrink-0 text-[var(--mc-accent)]' />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LanguagePicker;
