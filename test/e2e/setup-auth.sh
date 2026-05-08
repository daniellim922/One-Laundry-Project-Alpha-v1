#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${USERFLOW_BASE_URL:=http://localhost:3000}"

if [[ -z "${USERFLOW_LOGIN_EMAIL:-}" ]]; then
  echo "USERFLOW_LOGIN_EMAIL is required" >&2
  exit 1
fi

if [[ -z "${USERFLOW_LOGIN_PASSWORD:-}" ]]; then
  echo "USERFLOW_LOGIN_PASSWORD is required" >&2
  exit 1
fi

LOGIN_URL="${USERFLOW_BASE_URL%/}/login"

BIN_DIR="${ROOT}/node_modules/.bin"
AB_CMD=()
if [[ -f "${BIN_DIR}/agent-browser" ]]; then
  AB_CMD=("${BIN_DIR}/agent-browser")
elif [[ -f "${BIN_DIR}/agent-browser.cmd" ]]; then
  AB_CMD=("${BIN_DIR}/agent-browser.cmd")
elif [[ -d "${ROOT}/node_modules/agent-browser" ]]; then
  AB_CMD=(npx agent-browser)
else
  echo "agent-browser is not installed in this project." >&2
  echo "Run: npm install" >&2
  echo "If E2E fails to launch Chrome afterward, run once: npx agent-browser install" >&2
  exit 1
fi

echo "${USERFLOW_LOGIN_PASSWORD}" | "${AB_CMD[@]}" auth save one-laundry \
  --url "${LOGIN_URL}" \
  --username "${USERFLOW_LOGIN_EMAIL}" \
  --password-stdin \
  --username-selector 'input[type="email"]' \
  --password-selector 'input[type="password"]' \
  --submit-selector 'button[type="submit"]'

echo "Saved auth profile 'one-laundry' for ${LOGIN_URL}"
