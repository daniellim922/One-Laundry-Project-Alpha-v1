#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
DRY_RUN=0

usage() {
  echo "Usage: $0 [--dry-run] <target> <iterations>"
  echo "  <target>      plans/*.md path, GitHub issue URL, or GitHub issue number"
  echo "  <iterations>  positive integer"
}

fail() {
  echo "Error: $1" >&2
  exit 1
}

require_command() {
  local name="$1"

  if ! command -v "$name" >/dev/null 2>&1; then
    fail "Missing required command: $name"
  fi
}

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi

TARGET_INPUT="$1"
ITERATIONS="$2"

if ! [[ "$ITERATIONS" =~ ^[1-9][0-9]*$ ]]; then
  fail "Iterations must be a positive integer."
fi

require_command git
require_command node
require_command codex

cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "This script must run inside a git repository."
fi

CONFIG_JSON=$(node scripts/afk-ralph/render-config.mjs "$TARGET_INPUT")

read_json_field() {
  local field_path="$1"

  printf '%s' "$CONFIG_JSON" | node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const path = process.argv[1].split(".");
    let value = data;
    for (const segment of path) value = value[segment];
    process.stdout.write(String(value));
  ' "$field_path"
}

MODE=$(read_json_field "mode")
TARGET=$(read_json_field "target")
DISPLAY_TARGET=$(read_json_field "displayTarget")
PROMPT=$(read_json_field "prompt")

CODEX_COMMAND=()
while IFS= read -r line; do
  CODEX_COMMAND+=("$line")
done < <(
  printf '%s' "$CONFIG_JSON" | node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    for (const part of data.command) console.log(part);
  '
)

if [[ "$MODE" == "plan" ]]; then
  if [[ ! -f "$TARGET" ]]; then
    fail "Plan file not found: $TARGET"
  fi
else
  require_command gh
  if [[ "$DRY_RUN" -eq 0 ]]; then
    if ! gh auth status >/dev/null 2>&1; then
      fail "GitHub CLI is not authenticated."
    fi
    if ! gh issue view "$TARGET" >/dev/null 2>&1; then
      fail "Cannot read GitHub issue #$TARGET from the current repository."
    fi
  fi
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree must be clean before starting the loop."
  fi

  touch progress.txt
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Mode: $MODE"
  echo "Target: $DISPLAY_TARGET"
  echo "Iterations: $ITERATIONS"
  echo "Command: ${CODEX_COMMAND[*]}"
  echo
  echo "Prompt:"
  printf '%s\n' "$PROMPT"
  exit 0
fi

for ((i = 1; i <= ITERATIONS; i++)); do
  echo "Starting iteration $i/$ITERATIONS for $DISPLAY_TARGET"

  RESULT=$(printf '%s\n' "$PROMPT" | "${CODEX_COMMAND[@]}")
  echo "$RESULT"

  if [[ "$RESULT" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done

echo "Reached iteration limit without completion."
