import React, { FC, FormEvent, useState } from 'react';

import { useAuth } from '../auth/useAuth';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { KeyChangedError, resolveRecipient } from '../mail/send';
import { chatHash, navigate } from '../router/useHashRoute';
import { Button, Screen, TextField } from '../ui';
import { errorText } from '../utils/errorText';

const NewChatView: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const { localUser } = useAuth();
  const domain = localUser?.address.split('@')[1] ?? 'mailchat.example';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await resolveRecipient(query);
      navigate(chatHash(user.address), { replace: true });
    } catch (error) {
      if (error instanceof KeyChangedError) {
        navigate(chatHash(error.peer), { replace: true });
      } else {
        show({ type: 'error', message: errorText(t, error) });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title={t('new_chat')} onBack={() => navigate('#/chats')}>
      <form className='flex flex-col gap-3' onSubmit={submit}>
        <TextField
          label={t('username_or_address')}
          autoCapitalize='none'
          autoCorrect='off'
          autoFocus
          required
          value={query}
          onChange={event => setQuery(event.target.value)}
          hint={t('username_or_address_hint', { domain })}
        />
        <Button type='submit' loading={loading} disabled={query.trim().length < 3}>
          {t('start_chat')}
        </Button>
      </form>
    </Screen>
  );
};

export default NewChatView;
