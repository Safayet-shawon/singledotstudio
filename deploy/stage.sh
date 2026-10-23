#!/bin/sh
# Builds the folder that is deployed to Vercel: vercel.json + frontend/ + backend/ (without build output or secrets).
# Usage: sh deploy/stage.sh /path/to/empty-or-existing/stage-folder
set -e
OUT="${1:?usage: stage.sh <stage folder>}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
rm -rf "$OUT/frontend" "$OUT/backend"
cp -R "$HERE/frontend" "$OUT/frontend"
mkdir -p "$OUT/backend"
( cd "$HERE/backend" && for f in .mvn mvnw pom.xml Dockerfile.vercel src; do cp -R "$f" "$OUT/backend/$f"; done )
cp "$HERE/deploy/vercel.json" "$OUT/vercel.json"
echo "staged in $OUT"
