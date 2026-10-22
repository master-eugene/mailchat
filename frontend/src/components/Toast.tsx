import React, { AnimationEvent, CSSProperties, memo, useCallback, useEffect, useMemo, useState } from 'react';

import { IToast } from '../types/interfaces';
import classNames from '../utils/classNames';

const minimalShowTime = 1500;
const additionalWordsFactor = 333;

export interface ToastWithID extends IToast {
  id: number;
}

const iconColor: Record<NonNullable<IToast['type']>, string> = {
  success: '#34c759',
  info: '#2a8ad8',
  warning: '#ff9f0a',
  error: '#ff453a',
};

const iconPath: Record<NonNullable<IToast['type']>, string> = {
  success: 'M7 12.5l3.2 3.2L17 9',
  info: 'M12 11v6M12 7.5v.01',
  warning: 'M12 7v6M12 16.5v.01',
  error: 'M8.5 8.5l7 7M15.5 8.5l-7 7',
};

interface Props extends ToastWithID {
  index: number;
  onFinished(toastId: number): void;
}

const Toast: React.FC<Props> = ({ id, message, type = 'success', position = 'top', duration, index, onFinished }) => {
  const [status, setStatus] = useState<'show' | 'hide'>('show');

  useEffect(() => {
    const timerId = setTimeout(
      () => {
        setStatus('hide');
      },
      duration || minimalShowTime + additionalWordsFactor * message.split(' ').length,
    );

    return () => {
      clearTimeout(timerId);
    };
  }, []);

  const animationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName === 'toast-top-out' || event.animationName === 'toast-bottom-out') {
        onFinished(id);
      }
    },
    [id, onFinished],
  );

  const classes = useMemo(() => {
    return classNames(
      // Fixed and centered on the screen, whatever the page layout is.
      'fixed inset-x-0 mx-auto box-border flex min-h-14 w-[calc(100%-2rem)] max-w-md items-center rounded-2xl border border-white/15 bg-[#27282d] p-3 shadow-xl',
      status === 'show' &&
        position === 'top' &&
        'animate-[toast-top-in_0.2s_cubic-bezier(0.19,0.54,0.42,1.26)_forwards]',
      status === 'hide' && position === 'top' && 'animate-[toast-top-out_0.2s_ease_forwards]',
      status === 'show' &&
        position === 'bottom' &&
        'animate-[toast-bottom-in_0.2s_cubic-bezier(0.19,0.54,0.42,1.26)_forwards]',
      status === 'hide' && position === 'bottom' && 'animate-[toast-bottom-out_0.2s_ease_forwards]',
    );
  }, [position, status]);

  const style = useMemo<CSSProperties>(
    () => ({
      top: position === 'top' ? 'calc(env(safe-area-inset-top) + 16px)' : undefined,
      bottom: position === 'bottom' ? 'calc(env(safe-area-inset-bottom) + 16px)' : undefined,
      zIndex: 10000 + index,
    }),
    [index],
  );

  return (
    <div className={classes} style={style} onAnimationEnd={animationEnd}>
      <div className='mr-3 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(120,120,128,0.12)]'>
        <svg viewBox='0 0 24 24' className='h-[23px] w-[23px]' aria-hidden='true'>
          <circle cx='12' cy='12' r='11' fill={iconColor[type]} />
          <path
            d={iconPath[type]}
            stroke='#fff'
            strokeWidth='2.2'
            strokeLinecap='round'
            strokeLinejoin='round'
            fill='none'
          />
        </svg>
      </div>
      <div className='flex-1 text-base leading-5 font-medium text-white'>{message}</div>
    </div>
  );
};

export default memo(Toast);
