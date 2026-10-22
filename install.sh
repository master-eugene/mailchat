#!/usr/bin/env bash
# One-command MailChat install for a fresh Linux server (Ubuntu, Debian, Fedora, ...):
#
#   curl -fsSL https://raw.githubusercontent.com/master-eugene/mailchat/main/install.sh | sudo bash
#
# It installs git, downloads MailChat to /opt/mailchat, adds the `mailchat` command and runs
# `mailchat install`, which asks two questions (domain and email) and does the rest.
#
# Optional settings (put them before `bash`, e.g. `... | sudo MAILCHAT_DOMAIN=chat.example.com bash`):
#   MAILCHAT_DOMAIN, MAILCHAT_EMAIL   answer the questions in advance (no prompts)
#   MAILCHAT_DIR                      install folder (default /opt/mailchat)
#   MAILCHAT_REPO, MAILCHAT_BRANCH    where to download from
set -euo pipefail

# Everything is inside main() so a partly downloaded script never runs.
main() {
  local repo="${MAILCHAT_REPO:-https://github.com/master-eugene/mailchat.git}"
  local branch="${MAILCHAT_BRANCH:-main}"
  local dir="${MAILCHAT_DIR:-/opt/mailchat}"

  say() { printf '\033[1m%s\033[0m\n' "$*"; }
  ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
  die() {
    printf '\033[31m✗ %s\033[0m\n' "$*" >&2
    exit 1
  }

  say "MailChat one-command install"
  echo

  [ "$(uname -s)" = "Linux" ] || die "This script is for Linux servers. On a Mac or Windows PC, see docs/INSTALL.md."
  [ "$(id -u)" -eq 0 ] || die "Please run it with sudo:  curl -fsSL https://raw.githubusercontent.com/master-eugene/mailchat/main/install.sh | sudo bash"

  if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
    say "Installing git and curl..."
    if command -v apt-get >/dev/null 2>&1; then
      DEBIAN_FRONTEND=noninteractive apt-get update -qq
      DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl ca-certificates >/dev/null
    elif command -v dnf >/dev/null 2>&1; then
      dnf install -y -q git curl
    elif command -v yum >/dev/null 2>&1; then
      yum install -y -q git curl
    elif command -v apk >/dev/null 2>&1; then
      apk add --quiet git curl bash
    else
      die "Couldn't install git automatically. Install git and curl, then run this again."
    fi
    ok "git and curl installed"
  fi

  if [ -d "$dir/.git" ]; then
    say "Updating MailChat in $dir..."
    git -C "$dir" pull --ff-only --quiet
  elif [ -e "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ]; then
    die "$dir already exists and isn't a MailChat download. Move it away or set MAILCHAT_DIR."
  else
    say "Downloading MailChat to $dir..."
    git clone --quiet --depth 1 --branch "$branch" "$repo" "$dir"
  fi
  ok "MailChat downloaded"

  "$dir/mailchat" link
  echo

  # The installer reads its questions from the terminal, so it works even though this
  # script itself arrived through a pipe.
  exec "$dir/mailchat" install
}

main "$@"
