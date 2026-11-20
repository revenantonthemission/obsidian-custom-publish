#!/usr/bin/env bash
# The two-copy deploy (U3 NFR5.25; infrastructure-specification.md "The
# two-copy deploy"; infrastructure-design diary 2026-11-20T01:40). Both deploy
# definitions call this one script — the Justfile `deploy` recipe and the
# Jenkins Deploy stage — so the order lives in one place.
#
# 1. Mirror the build without the redirect table: an excluded destination file
#    is neither replaced nor deleted, so the old table keeps serving the old
#    rules while the pages change underneath it.
# 2. Then place the table: `cp` to a temporary name gives it a fresh
#    modification time (the server re-reads on a presence or mtime change, and
#    rsync --checksum would keep the source mtime), and `mv -f` renames it into
#    place atomically, so the server reads the old table or the new one. A
#    rule therefore never goes live before the page it names.
#    A build with no table removes the web root's, so no rule outlives its page.
#
# Usage: publish-dist.sh <dist-dir> <web-root>
set -eu

usage() {
  echo "usage: publish-dist.sh <dist-dir> <web-root>" >&2
  exit 2
}

[ "$#" -eq 2 ] || usage
DIST=$1
WEB_ROOT=$2
[ -n "$DIST" ] && [ -n "$WEB_ROOT" ] || usage
if [ ! -d "$DIST" ]; then
  echo "publish-dist: build output $DIST is not a directory" >&2
  exit 1
fi

TABLE=_redirects.json
TMP=.redirects.json.tmp

mkdir -p "$WEB_ROOT"
rsync -a --delete --exclude="/$TABLE" --exclude="/$TMP" "$DIST/" "$WEB_ROOT/"
if [ -f "$DIST/$TABLE" ]; then
  cp "$DIST/$TABLE" "$WEB_ROOT/$TMP"
  mv -f "$WEB_ROOT/$TMP" "$WEB_ROOT/$TABLE"
else
  rm -f "$WEB_ROOT/$TABLE" "$WEB_ROOT/$TMP"
fi
