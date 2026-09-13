#!/usr/bin/env bash
#
# autopull.sh — keep a git checkout of hvsweb in sync with GitHub on a timer.
#
# hvsweb (jonpetersen/hvsweb) is a public Astro site cloned over HTTPS, so
# `git fetch` needs no credentials — unlike vault-autocommit.sh this script
# never pushes and never needs an SSH identity. Pushing to main from any Mac
# deploys the site; this script's only job is to keep this MacBook's
# checkout fast-forwarded to origin/main so `git log`/local builds reflect
# what's live. It is intentionally a read-only pull, never a write:
#   - it only ever fast-forwards (`git merge --ff-only`); it never resets,
#     rebases, stashes, or forces anything, and never runs `npm install`
#   - any local state that isn't a clean fast-forward (dirty tree, unpushed
#     commits, a different branch, a diverged history) is left completely
#     alone for a human to sort out
#
# Installed as a LaunchAgent (see launchd/). Safe to run by hand.
#
# Design notes (matching vault-autocommit.sh):
#   - Exits 0 on every expected "can't work right now" condition, so
#     launchd doesn't treat routine no-ops as failures.
#   - Skips if another git process holds the index lock, rather than
#     racing it.

set -uo pipefail

# launchd may hand us an unreadable cwd; move somewhere safe before anything
# else touches the filesystem.
cd "$HOME" 2>/dev/null || cd / 2>/dev/null || true

REPO="${HVSWEB_REPO:-$HOME/dev/hvsweb}"
BRANCH="${HVSWEB_BRANCH:-main}"
LOG="${HVSWEB_AUTOPULL_LOG:-$HOME/Library/Logs/hvsweb-autopull.log}"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

mkdir -p "$(dirname "$LOG")" 2>/dev/null
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

# Checkout absent (machine not set up yet, or path is wrong) — nothing to do.
[ -d "$REPO/.git" ] || { log "skip: no .git at $REPO"; exit 0; }
cd "$REPO" || { log "skip: cannot cd to $REPO"; exit 0; }

# Another git process is mid-operation — try again next tick.
[ -e .git/index.lock ] && { log "skip: index.lock present"; exit 0; }

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$current_branch" != "$BRANCH" ]; then
  log "skip: on branch '$current_branch', not '$BRANCH'"
  exit 0
fi

# Uncommitted changes to TRACKED files must block the pull; untracked files
# are fine and must not block it (`--untracked-files=no` excludes them from
# the porcelain output).
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "skip: uncommitted changes to tracked files"
  exit 0
fi

if ! git fetch -q origin 2>/dev/null; then
  log "skip: fetch failed (offline?)"
  exit 0
fi

local_sha="$(git rev-parse HEAD 2>/dev/null)"
remote_sha="$(git rev-parse "origin/$BRANCH" 2>/dev/null)"

if [ -z "$remote_sha" ]; then
  log "skip: origin/$BRANCH not found"
  exit 0
fi

if [ "$local_sha" = "$remote_sha" ]; then
  # Already up to date — stay quiet, no log spam.
  exit 0
fi

# --ff-only is the actual safety guard here: it succeeds only when a clean
# fast-forward is possible, and refuses to touch the working tree or HEAD
# in every other case (local commits not yet pushed, or a genuine
# divergence) — never a merge commit, reset, or rebase.
if git merge --ff-only -q "origin/$BRANCH" 2>/dev/null; then
  new_sha="$(git rev-parse HEAD 2>/dev/null)"
  if [ "$new_sha" != "$local_sha" ]; then
    log "pulled ${local_sha:0:7}..${new_sha:0:7}"
  else
    # Merge was a no-op: origin/$BRANCH was already an ancestor of HEAD,
    # i.e. local commits not yet pushed.
    ahead="$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null)"
    log "local ahead by ${ahead:-?}, not touching"
  fi
  exit 0
fi

# ff-only refused a merge: the only remaining case is genuine divergence.
log "DIVERGED — resolve by hand"
exit 0
