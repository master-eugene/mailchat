import React, { FC, FormEvent, useState } from 'react';
import Textarea from 'react-textarea-autosize';

import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { extractEncodedEnvelope } from '../mail/envelope';
import { navigate } from '../router/useHashRoute';
import { Button, Screen } from '../ui';

// Offline path: paste an encrypted block received over any channel (mail app, messenger, SMS).
const OpenView: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const [input, setInput] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const encoded = extractEncodedEnvelope(input);
    if (!encoded) {
      show({ type: 'error', message: t('error_open_invalid') });
      return;
    }

    navigate(`#/read?m=${encoded}`, { replace: true });
  };

  return (
    <Screen title={t('open_message')} onBack={() => navigate('#/chats')}>
      <form className='flex flex-col gap-3' onSubmit={submit}>
        <p className='text-sm text-[var(--mc-muted)]'>{t('open_text')}</p>
        <Textarea
          minRows={8}
          maxRows={16}
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder='-----BEGIN MAILCHAT MESSAGE-----'
          className='resize-none rounded-xl border border-[var(--mc-border)] bg-[var(--mc-input)] px-3 py-2 font-mono text-xs text-[var(--mc-text)] outline-none focus:border-[var(--mc-accent)]'
        />
        <Button type='submit' disabled={!input.trim()}>
          {t('decrypt')}
        </Button>
      </form>
    </Screen>
  );
};

export default OpenView;
