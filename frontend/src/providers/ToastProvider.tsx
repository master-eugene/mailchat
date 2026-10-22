import React, { createContext, FC, ReactNode, useCallback, useMemo, useState } from 'react';

import Toast, { ToastWithID } from '../components/Toast';
import { IToast } from '../types/interfaces';

export declare interface IToastContext {
  show: (toast: IToast) => number;
  hide: (id: number) => void;
}

export const ToastContext = createContext<IToastContext>({
  show: (__: IToast) => 0,
  hide: () => {},
});

type Props = {
  children: ReactNode;
};

const ToastProvider: FC<Props> = ({ children }) => {
  const [list, setList] = useState<ToastWithID[]>([]);

  const show = useCallback((newToast: IToast) => {
    const newToastId = Date.now();

    setList(currentToasts => [...currentToasts, { id: newToastId, ...newToast }]);

    return newToastId;
  }, []);

  const hide = useCallback((toastId: number) => {
    setList(currentToasts => {
      const index = currentToasts.findIndex(t => t.id === toastId);

      if (index >= 0) {
        const newToasts = [...currentToasts];
        newToasts.splice(index, 1);
        return newToasts;
      }

      return currentToasts;
    });
  }, []);

  const value = useMemo<IToastContext>(
    () => ({
      show,
      hide,
    }),
    [hide, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {list.map((toast, index) => {
        return (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            position={toast.position}
            index={index}
            onFinished={hide}
          />
        );
      })}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
