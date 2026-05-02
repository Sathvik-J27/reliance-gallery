#!/usr/bin/env bash
# setup.sh — run once after cloning to prepare the project for development.
# Usage:  bash scripts/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Project root: $PROJECT_ROOT"

# ── 1. Copy logo to public/ ────────────────────────────────────────────────
LOGO_SRC="$PROJECT_ROOT/logo.png"
LOGO_DST="$PROJECT_ROOT/public/logo.png"

if [[ -f "$LOGO_SRC" ]]; then
  cp "$LOGO_SRC" "$LOGO_DST"
  echo "==> Copied logo.png → public/logo.png"
elif [[ -f "$LOGO_DST" ]]; then
  echo "==> public/logo.png already exists, skipping."
else
  echo "WARNING: logo.png not found at project root AND not in public/."
  echo "         Please place logo.png in public/ manually before running the app."
fi

# ── 2. Create .env.local from example (if not already present) ────────────
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
ENV_LOCAL="$PROJECT_ROOT/.env.local"

if [[ ! -f "$ENV_LOCAL" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  echo "==> Created .env.local from .env.example — fill in your real values."
else
  echo "==> .env.local already exists, skipping."
fi

echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit .env.local with your Supabase credentials."
echo "  2. Run:  npm install"
echo "  3. Run:  npm run dev"
