#!/bin/sh
# Creates the server's secrets on first start (kept in the data volume), applies database
# migrations, then starts MailChat. Nobody installing MailChat has to generate keys by hand.
set -e

SECRETS=/data/secrets.env

if [ ! -f "$SECRETS" ]; then
  umask 077
  node -e "
    const crypto = require('crypto');
    const webPush = require('web-push');
    const vapid = webPush.generateVAPIDKeys();
    console.log('JWT_SECRET=' + crypto.randomBytes(48).toString('base64url'));
    console.log('VAPID_PUBLIC_KEY=' + vapid.publicKey);
    console.log('VAPID_PRIVATE_KEY=' + vapid.privateKey);
  " > "$SECRETS"
  echo "Created server secrets in $SECRETS"
fi

set -a
# shellcheck source=/dev/null
. "$SECRETS"
set +a

npx prisma migrate deploy
exec "$@"
