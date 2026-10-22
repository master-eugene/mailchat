import { isAxiosError } from 'axios';

import { getApiErrorCode } from '../api/httpClient';
import type { TranslateFn } from '../locale/i18n';

type ErrorKey = Parameters<TranslateFn>[0];

const codeKeys: Record<string, ErrorKey> = {
  not_approved: 'error_not_approved',
  username_taken: 'error_username_taken',
  user_not_found: 'error_user_not_found',
  key_changed: 'key_changed_title',
  delivery_failed: 'error_delivery_failed',
  push_not_configured: 'error_push_not_configured',
  decrypt_failed: 'error_decrypt_failed',
  envelope_mismatch: 'error_envelope_mismatch',
  backup_invalid: 'error_backup_invalid',
  backup_wrong_passphrase: 'error_backup_wrong_passphrase',
  backup_other_account: 'error_backup_other_account',
};

// Turns API, crypto and backup errors into a translated message for a toast.
export const errorText = (t: TranslateFn, error: unknown, fallback: ErrorKey = 'error_generic') => {
  const code = getApiErrorCode(error) ?? (error instanceof Error ? error.message : undefined);
  if (code && codeKeys[code]) return t(codeKeys[code]);

  if (isAxiosError(error)) {
    if (!error.response) return t('error_network');
    if (error.response.status === 429) return t('error_too_many_requests');
    if (error.response.status === 400) return t('error_invalid_input');
  }

  return t(fallback);
};
