import React, { FC, useEffect, useState } from 'react';

import useLocale from '../hooks/useLocale';
import { flushAcks, receiveEnvelope } from '../mail/receive';
import { chatHash, navigate } from '../router/useHashRoute';
import { Notice, Screen, Spinner } from '../ui';

// Opens a message from an email link or a pasted block and files it into its chat.
// Works offline: decryption happens entirely on this device.
const ReadView: FC<{ payload: string }> = ({ payload }) => {
  const { t } = useLocale();
  const [error, setError] = useState('');

  useEffect(() => {
    receiveEnvelope(payload).then(result => {
      switch (result.status) {
        case 'saved':
        case 'duplicate':
          flushAcks();
          // Replacing the URL also drops the ciphertext from browser history.
          navigate(chatHash(result.message.peer), { replace: true });
          return;
        case 'key_changed':
          navigate(chatHash(result.peer), { replace: true });
          return;
        case 'wrong_account':
          setError(t('error_wrong_account', { address: result.to }));
          return;
        case 'decrypt_failed':
          setError(t('error_decrypt_failed'));
          return;
        default:
          setError(t('error_open_invalid'));
      }
    });
  }, [payload, t]);

  return (
    <Screen title={t('open_message')} onBack={() => navigate('#/chats')}>
      {error ? <Notice tone='danger'>{error}</Notice> : <Spinner />}
    </Screen>
  );
};

export default ReadView;
