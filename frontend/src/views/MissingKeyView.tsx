import React, { FC } from 'react';

import { useAuth } from '../auth/useAuth';
import useLocale from '../hooks/useLocale';
import { Button, Notice } from '../ui';
import ImportKeyForm from './ImportKeyForm';

const MissingKeyView: FC = () => {
  const { t } = useLocale();
  const { user, logout } = useAuth();

  return (
    <div className='flex h-full w-full items-center justify-center overflow-y-auto px-4 py-8'>
      <div className='flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-[var(--mc-panel)] p-5 shadow-sm'>
        <h2 className='text-lg font-semibold text-[var(--mc-text)]'>{t('missing_key_title')}</h2>
        <Notice tone='warning'>{t('missing_key_text', { address: user?.address ?? '' })}</Notice>
        <ImportKeyForm />
        <Button variant='ghost' onClick={logout}>
          {t('sign_out')}
        </Button>
      </div>
    </div>
  );
};

export default MissingKeyView;
