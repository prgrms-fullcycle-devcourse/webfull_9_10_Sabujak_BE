#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OUTPUT_DIR="$ROOT_DIR/docs/reviews"
INPUT_CONTEXT_PATH="$ROOT_DIR/.antigravity/tmp/pr-review-input.md"
OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
SOURCE_PATH=""
OUTPUT_PATH=""
TITLE=""
REVIEWER="Antigravity Gemini 3.1 Pro"
PR_NUMBER=""
PR_URL=""
BRANCH_NAME=""

print_usage() {
  cat <<'EOF'
Usage: bash scripts/save-pr-review.sh [options]

Options:
  --source <file>      Markdown file containing the review result
  --output <file>      Exact output path to write
  --dir <dir>          Output directory. Default: docs/reviews
  --title <title>      Review title override
  --reviewer <name>    Reviewer name. Default: Antigravity Gemini 3.1 Pro
  --pr-number <num>    PR number override
  --pr-url <url>       PR URL override
  --input <file>       Generated review input file for metadata lookup
  -h, --help           Show help

If --source is omitted, this script reads review markdown from stdin.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      continue
      ;;
    --source)
      SOURCE_PATH="$2"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    --dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --title)
      TITLE="$2"
      shift 2
      ;;
    --reviewer)
      REVIEWER="$2"
      shift 2
      ;;
    --pr-number)
      PR_NUMBER="$2"
      shift 2
      ;;
    --pr-url)
      PR_URL="$2"
      shift 2
      ;;
    --input)
      INPUT_CONTEXT_PATH="$2"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

extract_meta_value() {
  local label="$1"
  local path="$2"

  if [[ ! -f "$path" ]]; then
    return 1
  fi

  awk -v label="$label" '
    index($0, "- " label ": ") == 1 {
      print substr($0, length("- " label ": ") + 1)
      exit
    }
  ' "$path" | sed 's/^`//; s/`$//'
}

extract_pr_title() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    return 1
  fi

  awk '
    /^## PR Title$/ { capture=1; next }
    /^## / && capture { exit }
    capture { print }
  ' "$path" | sed '/^$/d' | head -n 1
}

if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME="$(git branch --show-current)"
fi

if [[ -z "$TITLE" ]]; then
  TITLE="$(extract_pr_title "$INPUT_CONTEXT_PATH" || true)"
fi

if [[ -z "$PR_NUMBER" ]]; then
  PR_NUMBER="$(extract_meta_value "GitHub PR number" "$INPUT_CONTEXT_PATH" || true)"
  if [[ "$PR_NUMBER" == "n/a" ]]; then
    PR_NUMBER=""
  fi
fi

if [[ -z "$PR_URL" ]]; then
  PR_URL="$(extract_meta_value "GitHub PR url" "$INPUT_CONTEXT_PATH" || true)"
  if [[ "$PR_URL" == "n/a" ]]; then
    PR_URL=""
  fi
fi

BASE_REF="$(extract_meta_value "Base ref" "$INPUT_CONTEXT_PATH" || true)"
REVIEW_MODE="$(extract_meta_value "Review mode" "$INPUT_CONTEXT_PATH" || true)"

if [[ -n "$SOURCE_PATH" ]]; then
  if [[ ! -f "$SOURCE_PATH" ]]; then
    echo "Review source file not found: $SOURCE_PATH" >&2
    exit 1
  fi
  REVIEW_BODY="$(cat "$SOURCE_PATH")"
elif [[ ! -t 0 ]]; then
  REVIEW_BODY="$(cat)"
else
  echo "Provide --source <file> or pipe the review markdown via stdin." >&2
  exit 1
fi

if [[ -z "$REVIEW_BODY" ]]; then
  echo "Review body is empty." >&2
  exit 1
fi

DATE_PREFIX="$(date +%F)"
FILE_STEM=""

if [[ -n "$OUTPUT_PATH" ]]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
else
  mkdir -p "$OUTPUT_DIR"
  if [[ -n "$PR_NUMBER" ]]; then
    FILE_STEM="pr-${PR_NUMBER}"
  else
    FILE_STEM="$(slugify "$BRANCH_NAME")"
  fi

  if [[ -n "$TITLE" ]]; then
    TITLE_SLUG="$(slugify "$TITLE")"
    if [[ -n "$TITLE_SLUG" ]]; then
      FILE_STEM="${FILE_STEM}-${TITLE_SLUG}"
    fi
  fi

  OUTPUT_PATH="$OUTPUT_DIR/${DATE_PREFIX}-${FILE_STEM}.md"
fi

cat >"$OUTPUT_PATH" <<EOF
# PR Review Result

- Reviewer: $REVIEWER
- Saved at: $(date '+%Y-%m-%d %H:%M:%S %Z')
- Branch: \`${BRANCH_NAME:-n/a}\`
- Base ref: \`${BASE_REF:-n/a}\`
- Review mode: \`${REVIEW_MODE:-n/a}\`
- PR number: \`${PR_NUMBER:-n/a}\`
- PR url: ${PR_URL:-n/a}
- Title: ${TITLE:-n/a}

$REVIEW_BODY
EOF

echo "Saved review result: $OUTPUT_PATH"
