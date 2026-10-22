import React, { FC, FormEvent, useEffect, useState } from 'react';

import { getServerInfo } from '../api/authApi';
import { getApiErrorCode } from '../api/httpClient';
import { useAuth } from '../auth/useAuth';
import useLocale from '../hooks/useLocale';
import useToasts from '../hooks/useToasts';
import { pushSupport } from '../push/notifications';
import { Button, Notice, TextField } from '../ui';
import LanguagePicker from '../ui/LanguagePicker';
import { errorText } from '../utils/errorText';
import ImportKeyForm from './ImportKeyForm';

type Mode = 'login' | 'register' | 'pending' | 'import';

// Same rule as the server: 3-32 characters, letters, digits, dot, dash or underscore.
const loginPattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;

const AuthView: FC = () => {
  const { t } = useLocale();
  const { show } = useToasts();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState('');

  useEffect(() => {
    getServerInfo()
      .then(info => setDomain(info.mailDomain))
      .catch(() => undefined);
  }, []);

  const address = domain ? `${username}@${domain}` : username;
  const usernameValid = loginPattern.test(username);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && !usernameValid) {
      show({ type: 'error', message: t('login_hint') });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(username, password);
        setMode('pending');
      } else {
        await login(username, password);
      }
    } catch (error) {
      if (getApiErrorCode(error) === 'not_approved') {
        setMode('pending');
        return;
      }
      const fallback = mode === 'login' ? 'error_invalid_login' : 'error_generic';
      show({ type: 'error', message: errorText(t, error, fallback) });
    } finally {
      setLoading(false);
    }
  };

  // While creating an account the field holds just the login; the domain is shown after it.
  const onLoginChange = (value: string) => {
    const typed = value.trim().toLowerCase();
    setUsername(mode === 'register' ? typed.split('@')[0] : typed);
  };

  return (
    <div className='flex h-full w-full items-center justify-center overflow-y-auto px-4 py-8'>
      <div className='flex w-full max-w-sm flex-col gap-5'>
        <div className='flex flex-col items-center text-center'>
          <img src='/icon-192.png' alt='' className='mb-3 h-16 w-16 rounded-[22%] shadow-md' />
          <div className='text-3xl font-bold text-[var(--mc-text)]'>MailChat</div>
          <div className='mt-1 text-sm text-[var(--mc-muted)]'>{t('tagline')}</div>
        </div>

        <div className='rounded-3xl bg-[var(--mc-panel)] p-5 shadow-sm'>
          {mode === 'pending' && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-lg font-semibold text-[var(--mc-text)]'>{t('pending_title')}</h2>
              <p className='text-sm break-words text-[var(--mc-text)]'>{t('pending_text', { address })}</p>
              <Notice>{t('pending_key_note')}</Notice>
              <Button variant='ghost' onClick={() => setMode('login')}>
                {t('back_to_sign_in')}
              </Button>
            </div>
          )}

          {mode === 'import' && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-lg font-semibold text-[var(--mc-text)]'>{t('import_key_title')}</h2>
              <p className='text-sm text-[var(--mc-muted)]'>{t('import_key_text')}</p>
              <ImportKeyForm onDone={() => setMode('login')} />
              <Button variant='ghost' onClick={() => setMode('login')}>
                {t('back_to_sign_in')}
              </Button>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <form className='flex flex-col gap-3' onSubmit={submit}>
              <h2 className='text-lg font-semibold text-[var(--mc-text)]'>
                {mode === 'login' ? t('sign_in') : t('create_account')}
              </h2>
              {mode === 'register' && pushSupport() === 'needs_install' && (
                <Notice tone='warning'>{t('install_before_register')}</Notice>
              )}

              {mode === 'register' ? (
                <label className='flex flex-col gap-1'>
                  <span className='text-sm text-[var(--mc-muted)]'>{t('login')}</span>
                  <span className='flex h-11 items-center overflow-hidden rounded-xl border border-[var(--mc-border)] bg-[var(--mc-input)] focus-within:border-[var(--mc-accent)]'>
                    <input
                      name='username'
                      autoComplete='username'
                      autoCapitalize='none'
                      autoCorrect='off'
                      spellCheck={false}
                      required
                      dir='ltr'
                      value={username}
                      onChange={event => onLoginChange(event.target.value)}
                      className='h-full min-w-0 flex-1 bg-transparent px-3 text-base text-[var(--mc-text)] outline-none'
                    />
                    {domain && (
                      <span dir='ltr' className='max-w-[60%] truncate pr-3 text-base text-[var(--mc-muted)]'>
                        @{domain}
                      </span>
                    )}
                  </span>
                </label>
              ) : (
                <TextField
                  label={t('login')}
                  name='username'
                  autoComplete='username'
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck={false}
                  required
                  dir='ltr'
                  value={username}
                  onChange={event => onLoginChange(event.target.value)}
                />
              )}

              <TextField
                label={t('password')}
                type='password'
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                hint={mode === 'register' ? t('password_hint') : undefined}
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
              <Button type='submit' loading={loading} className='mt-1'>
                {mode === 'login' ? t('sign_in') : t('create_account')}
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setUsername(username.split('@')[0]);
                }}
              >
                {mode === 'login' ? t('no_account') : t('have_account')}
              </Button>
              {mode === 'login' && (
                <Button variant='ghost' className='h-8 text-sm' onClick={() => setMode('import')}>
                  {t('import_key_backup')}
                </Button>
              )}
            </form>
          )}
        </div>

        <LanguagePicker compact />
      </div>
    </div>
  );
};

export default AuthView;
