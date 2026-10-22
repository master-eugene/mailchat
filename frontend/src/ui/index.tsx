import React, { ButtonHTMLAttributes, FC, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

import classNames from '../utils/classNames';
import { BackIcon, CloseIcon } from './icons';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost';
  loading?: boolean;
};

export const Button: FC<ButtonProps> = ({ variant = 'primary', loading, disabled, className, children, ...props }) => (
  <button
    type='button'
    {...props}
    disabled={disabled || loading}
    className={classNames(
      'flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
      variant === 'primary' && 'bg-[var(--mc-accent)] text-white hover:brightness-110',
      variant === 'secondary' && 'bg-[var(--mc-panel-strong)] text-[var(--mc-text)] hover:brightness-110',
      variant === 'danger' && 'bg-[var(--mc-danger)] text-white',
      variant === 'danger-soft' && 'bg-[var(--mc-danger)]/10 text-[var(--mc-danger)] hover:bg-[var(--mc-danger)]/15',
      variant === 'ghost' && 'bg-transparent text-[var(--mc-accent)] hover:bg-[var(--mc-accent)]/10',
      className,
    )}
  >
    {loading ? (
      <span className='h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent' />
    ) : (
      children
    )}
  </button>
);

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'plain' | 'accent' };

export const IconButton: FC<IconButtonProps> = ({ label, tone = 'plain', className, children, ...props }) => (
  <button
    type='button'
    aria-label={label}
    title={label}
    {...props}
    className={classNames(
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40',
      tone === 'plain' && 'text-[var(--mc-accent)] hover:bg-[var(--mc-accent)]/10',
      tone === 'accent' && 'bg-[var(--mc-accent)] text-white hover:brightness-110',
      className,
    )}
  >
    {children}
  </button>
);

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode };

export const TextField: FC<FieldProps> = ({ label, hint, className, ...props }) => (
  <label className={classNames('flex flex-col gap-1.5', className)}>
    <span className='text-sm font-medium text-[var(--mc-muted)]'>{label}</span>
    <input
      {...props}
      className='h-11 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-input)] px-3 text-base text-[var(--mc-text)] transition outline-none focus:border-[var(--mc-accent)] focus:ring-2 focus:ring-[var(--mc-accent)]/25'
    />
    {hint && <span className='text-xs text-[var(--mc-muted)]'>{hint}</span>}
  </label>
);

type NoticeProps = PropsWithChildren<{
  tone?: 'info' | 'warning' | 'danger';
  title?: string;
  icon?: ReactNode;
  onClose?: () => void;
}>;

export const Notice: FC<NoticeProps> = ({ tone = 'info', title, icon, onClose, children }) => (
  <div
    className={classNames(
      'flex gap-3 rounded-2xl px-3.5 py-3 text-sm text-[var(--mc-text)]',
      tone === 'info' && 'bg-[var(--mc-accent)]/12',
      tone === 'warning' && 'bg-amber-500/12',
      tone === 'danger' && 'bg-[var(--mc-danger)]/12',
    )}
  >
    {icon && (
      <span
        className={classNames(
          'mt-0.5 shrink-0',
          tone === 'info' && 'text-[var(--mc-accent)]',
          tone === 'warning' && 'text-amber-500',
          tone === 'danger' && 'text-[var(--mc-danger)]',
        )}
      >
        {icon}
      </span>
    )}
    <div className='min-w-0 flex-1'>
      {title && <div className='mb-0.5 font-semibold'>{title}</div>}
      <div className='leading-relaxed'>{children}</div>
    </div>
    {onClose && (
      <button
        type='button'
        aria-label='Close'
        onClick={onClose}
        className='-m-1 h-7 w-7 shrink-0 rounded-full p-1 text-[var(--mc-muted)] hover:bg-[var(--mc-text)]/10'
      >
        <CloseIcon size={20} />
      </button>
    )}
  </div>
);

// Fingerprints are shown as a tidy grid of 4-character groups, easy to read aloud.
export const Fingerprint: FC<{ value: string }> = ({ value }) => (
  <code className='grid max-w-[22rem] grid-cols-4 gap-x-3 gap-y-1 font-mono text-[15px] tracking-wider text-[var(--mc-text)]'>
    {value.split(' ').map((group, index) => (
      <span key={index}>{group}</span>
    ))}
  </code>
);

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div className='flex rounded-xl bg-[var(--mc-bg)] p-1' role='radiogroup'>
    {options.map(option => (
      <button
        key={option.value}
        type='button'
        role='radio'
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={classNames(
          'h-9 flex-1 rounded-lg text-sm font-medium transition',
          value === option.value
            ? 'bg-[var(--mc-panel)] text-[var(--mc-text)] shadow-sm ring-1 ring-[var(--mc-border)]'
            : 'text-[var(--mc-muted)] hover:text-[var(--mc-text)]',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

type ScreenProps = PropsWithChildren<{
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  padded?: boolean;
}>;

export const Screen: FC<ScreenProps> = ({
  title,
  subtitle,
  leading,
  action,
  footer,
  onBack,
  backLabel = 'Back',
  padded = true,
  children,
}) => (
  <div className='flex h-full min-h-0 w-full flex-col'>
    <header className='flex h-14 shrink-0 items-center gap-2 border-b border-[var(--mc-border)] bg-[var(--mc-bg)]/90 px-2 backdrop-blur'>
      {onBack ? (
        <IconButton label={backLabel} onClick={onBack} className='rtl:rotate-180'>
          <BackIcon size={24} />
        </IconButton>
      ) : (
        <span className='w-2' />
      )}
      {leading}
      <div className='min-w-0 flex-1'>
        <h1 className='truncate text-[17px] leading-tight font-semibold text-[var(--mc-text)]'>{title}</h1>
        {subtitle && <div className='truncate text-xs leading-tight text-[var(--mc-muted)]'>{subtitle}</div>}
      </div>
      {action}
    </header>
    <main className={classNames('min-h-0 flex-1 overflow-y-auto overscroll-contain', padded && 'px-4 py-4')}>
      {children}
    </main>
    {footer && <div className='shrink-0 bg-[var(--mc-bg)]'>{footer}</div>}
  </div>
);

export const Spinner: FC = () => (
  <div className='flex justify-center py-10'>
    <span className='h-8 w-8 animate-spin rounded-full border-2 border-[var(--mc-accent)] border-t-transparent' />
  </div>
);
