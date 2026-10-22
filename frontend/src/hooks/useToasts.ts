import { useContext } from 'react';

import { IToastContext, ToastContext } from '../providers/ToastProvider';

const useToasts = (): IToastContext => {
  const context = useContext(ToastContext);

  return context;
};

export default useToasts;
