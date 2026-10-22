import React, { FC, FormEvent, useState } from 'react';
import Textarea from 'react-textarea-autosize';

import { useAuth } from '../auth/useAuth';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { Button, TextField } from '../ui';
import { CheckIcon, PasteIcon } from '../ui/icons';
import classNames from '../utils/classNames';
import { errorText } from '../utils/errorText';

const looksLikeBackup = (value: string) => value.includes('mailchat-key-backup');

// The backup can come as the downloaded file or as its text (e.g. sent through a messenger).
const ImportKeyForm: FC<{ onDone?: () => void }> = ({ onDone }) => {
  const { t } = useLocale();
  const { show } = useToasts();
  const { importKey } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    // The backup text pasted into the passphrase box by mistake: move it where it belongs.
    if (looksLikeBackup(passphrase)) {
      setPasted(passphrase.trim());
      setPasting(true);
      setPassphrase('');
      show({ type: 'info', message: t('backup_in_passphrase') });
      return;
    }

    const hasBackup = pasting ? pasted.trim().length > 0 : Boolean(file);
    if (!hasBackup) {
      show({ type: 'warning', message: pasting ? t('backup_paste_missing') : t('backup_missing') });
      return;
    }
    if (!passphrase) {
      show({ type: 'warning', message: t('passphrase_missing') });
      return;
    }

    setLoading(true);
    try {
      const content = pasting ? pasted.trim() : await file!.text();
      await importKey(content, passphrase);
      show({ type: 'success', message: t('key_imported') });
      onDone?.();
    } catch (error) {
      show({ type: 'error', message: errorText(t, error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className='flex flex-col gap-3' onSubmit={submit}>
      <div className='flex flex-col gap-1.5'>
        <span className='text-sm font-medium text-[var(--mc-muted)]'>{t('backup_file')}</span>

        {pasting ? (
          <Textarea
            minRows={4}
            maxRows={8}
            value={pasted}
            onChange={event => setPasted(event.target.value)}
            placeholder={t('backup_paste_placeholder')}
            spellCheck={false}
            autoCapitalize='none'
            autoCorrect='off'
            className='resize-none rounded-xl border border-[var(--mc-border)] bg-[var(--mc-input)] px-3 py-2 font-mono text-xs text-[var(--mc-text)] outline-none focus:border-[var(--mc-accent)] focus:ring-2 focus:ring-[var(--mc-accent)]/25'
          />
        ) : (
          <>
            {/* The real file input covers the button (invisible), so a tap opens the picker natively;
                iOS doesn't reliably open a hidden input from script. No `accept` filter either:
                iPhone often greys out downloaded .json files when one is set. */}
            <label
              className={classNames(
                'relative flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border px-3 text-start text-base transition focus-within:ring-2 focus-within:ring-[var(--mc-accent)]/25',
                file
                  ? 'border-[var(--mc-accent)]/50 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]'
                  : 'border-dashed border-[var(--mc-border)] bg-[var(--mc-input)] text-[var(--mc-muted)] hover:border-[var(--mc-accent)]',
              )}
            >
              {file && <CheckIcon size={18} className='shrink-0 text-[var(--mc-accent)]' />}
              <span className='flex-1 truncate'>{file ? file.name : t('choose_backup_file')}</span>
              <input
                type='file'
                aria-label={t('choose_backup_file')}
                className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                onChange={event => {
                  const chosen = event.target.files?.[0] ?? null;
                  if (chosen) setFile(chosen);
                }}
              />
            </label>
          </>
        )}

        <button
          type='button'
          onClick={() => setPasting(value => !value)}
          className='flex items-center gap-1.5 self-start py-1 text-sm text-[var(--mc-accent)]'
        >
          <PasteIcon size={16} />
          {pasting ? t('backup_use_file') : t('backup_paste_instead')}
        </button>
      </div>

      <TextField
        label={t('passphrase')}
        type='password'
        autoComplete='off'
        value={passphrase}
        onChange={event => setPassphrase(event.target.value)}
      />
      <Button type='submit' loading={loading}>
        {t('import')}
      </Button>
    </form>
  );
};

export default ImportKeyForm;
