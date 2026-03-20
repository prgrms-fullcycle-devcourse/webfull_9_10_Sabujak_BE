#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_BASE="origin/main"
DEFAULT_OUTPUT="$ROOT_DIR/.antigravity/tmp/pr-review-input.md"

BASE_REF="$DEFAULT_BASE"
REVIEW_MODE="auto"
OUTPUT_PATH="$DEFAULT_OUTPUT"
PR_BODY_FILE=""
PR_TITLE=""
GH_PR_SELECTOR=""
USE_GH="true"
PR_NUMBER=""
PR_URL=""
PR_HEAD_REF=""
PR_BODY_SOURCE_HINT=""
TARGET_REF="HEAD"
TARGET_REF_SOURCE="current HEAD"
GH_BASE_REF_NAME=""

print_usage() {
  cat <<'EOF'
Usage: bash scripts/generate-pr-review-input.sh [options]

Options:
  --base <ref>         Base ref to diff against. Default: origin/main
  --mode <mode>        quick | deep | auto. Default: auto
  --pr-body <file>     Markdown or text file containing the PR description
  --title <title>      Optional PR title to include in the generated input
  --gh-pr <selector>   Fetch PR metadata via gh. Use a PR number or 'current'
  --no-gh              Disable GitHub PR metadata auto-fetch
  --output <file>      Output markdown path
  -h, --help           Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      continue
      ;;
    --base)
      BASE_REF="$2"
      shift 2
      ;;
    --mode)
      REVIEW_MODE="$2"
      shift 2
      ;;
    --pr-body)
      PR_BODY_FILE="$2"
      shift 2
      ;;
    --title)
      PR_TITLE="$2"
      shift 2
      ;;
    --gh-pr)
      GH_PR_SELECTOR="$2"
      shift 2
      ;;
    --no-gh)
      USE_GH="false"
      shift
      ;;
    --output)
      OUTPUT_PATH="$2"
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

if [[ "$REVIEW_MODE" != "auto" && "$REVIEW_MODE" != "quick" && "$REVIEW_MODE" != "deep" ]]; then
  echo "Invalid --mode value: $REVIEW_MODE" >&2
  exit 1
fi

cd "$ROOT_DIR"

gh_can_use() {
  command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1
}

gh_view_field() {
  local selector="$1"
  local field="$2"
  local template="$3"

  if [[ "$selector" == "current" || -z "$selector" ]]; then
    gh pr view --json "$field" --template "$template"
  else
    gh pr view "$selector" --json "$field" --template "$template"
  fi
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must run inside a git repository." >&2
  exit 1
fi

if [[ "$USE_GH" == "true" ]]; then
  if [[ -n "$GH_PR_SELECTOR" ]] && ! gh_can_use; then
    echo "GitHub PR metadata was requested with --gh-pr, but gh is not authenticated." >&2
    echo "Run 'gh auth login' or omit --gh-pr." >&2
    exit 1
  fi

  if [[ -z "$GH_PR_SELECTOR" ]] && gh_can_use; then
    GH_PR_SELECTOR="current"
  fi
fi

if [[ "$USE_GH" == "true" && -n "$GH_PR_SELECTOR" ]]; then
  if PR_NUMBER="$(gh_view_field "$GH_PR_SELECTOR" number '{{.number}}' 2>/dev/null)" \
    && PR_URL="$(gh_view_field "$GH_PR_SELECTOR" url '{{.url}}' 2>/dev/null)" \
    && PR_HEAD_REF="$(gh_view_field "$GH_PR_SELECTOR" headRefName '{{.headRefName}}' 2>/dev/null)" \
    && GH_BASE_REF_NAME="$(gh_view_field "$GH_PR_SELECTOR" baseRefName '{{.baseRefName}}' 2>/dev/null)"; then
    GH_PR_TITLE="$(gh_view_field "$GH_PR_SELECTOR" title '{{.title}}' 2>/dev/null || true)"
    GH_PR_BODY="$(gh_view_field "$GH_PR_SELECTOR" body '{{.body}}' 2>/dev/null || true)"

    if [[ -z "$PR_TITLE" && -n "$GH_PR_TITLE" ]]; then
      PR_TITLE="$GH_PR_TITLE"
    fi

    if [[ -z "$PR_BODY_FILE" && -n "$GH_PR_BODY" ]]; then
      PR_DESCRIPTION="$GH_PR_BODY"
      PR_DESCRIPTION_SOURCE="GitHub PR #$PR_NUMBER"
      PR_BODY_SOURCE_HINT="gh"
    fi

    if [[ "$BASE_REF" == "$DEFAULT_BASE" ]] && [[ -n "$GH_BASE_REF_NAME" ]] && git rev-parse --verify "origin/$GH_BASE_REF_NAME" >/dev/null 2>&1; then
      BASE_REF="origin/$GH_BASE_REF_NAME"
    fi
  elif [[ -n "$GH_PR_SELECTOR" && "$GH_PR_SELECTOR" != "current" ]]; then
    echo "Failed to fetch PR metadata for selector: $GH_PR_SELECTOR" >&2
    exit 1
  fi
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "Base ref not found: $BASE_REF" >&2
  echo "Run 'git fetch origin' or pass --base <ref>." >&2
  exit 1
fi

if [[ -n "$PR_HEAD_REF" ]]; then
  if git rev-parse --verify "origin/$PR_HEAD_REF" >/dev/null 2>&1; then
    TARGET_REF="origin/$PR_HEAD_REF"
    TARGET_REF_SOURCE="GitHub PR head branch"
  elif git rev-parse --verify "$PR_HEAD_REF" >/dev/null 2>&1; then
    TARGET_REF="$PR_HEAD_REF"
    TARGET_REF_SOURCE="local branch matching GitHub PR head"
  else
    echo "PR head ref not found locally: $PR_HEAD_REF" >&2
    echo "Run 'git fetch origin' so origin/$PR_HEAD_REF is available, or checkout the PR branch locally." >&2
    exit 1
  fi
fi

MERGE_BASE="$(git merge-base "$BASE_REF" "$TARGET_REF")"
DIFF_LABEL="$MERGE_BASE...$TARGET_REF"
CHANGED_FILES="$(git diff --name-only "$MERGE_BASE...$TARGET_REF")"
DIFF_CONTENT="$(git diff --unified=3 "$MERGE_BASE...$TARGET_REF")"
DIFF_STAT="$(git diff --shortstat "$MERGE_BASE...$TARGET_REF" || true)"

if [[ -z "$CHANGED_FILES" ]]; then
  CHANGED_FILES="$(git diff --name-only HEAD)"
  DIFF_CONTENT="$(git diff --unified=3 HEAD)"
  DIFF_STAT="$(git diff --shortstat HEAD || true)"
  DIFF_LABEL="working-tree diff against HEAD"
  TARGET_REF="HEAD"
  TARGET_REF_SOURCE="working tree"
fi

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No diff found between $BASE_REF and $TARGET_REF, and no local working-tree changes were found." >&2
  exit 1
fi

FILE_COUNT="$(printf '%s\n' "$CHANGED_FILES" | sed '/^$/d' | wc -l | tr -d ' ')"
INSERTIONS="$(printf '%s\n' "$DIFF_STAT" | sed -n 's/.* \([0-9][0-9]*\) insertion.*/\1/p')"
DELETIONS="$(printf '%s\n' "$DIFF_STAT" | sed -n 's/.* \([0-9][0-9]*\) deletion.*/\1/p')"
INSERTIONS="${INSERTIONS:-0}"
DELETIONS="${DELETIONS:-0}"
TOTAL_LINE_CHURN="$((INSERTIONS + DELETIONS))"

count_file_matches() {
  local pattern="$1"
  local count
  count="$(printf '%s\n' "$CHANGED_FILES" | grep -E -c "$pattern" || true)"
  echo "${count:-0}"
}

diff_contains() {
  local pattern="$1"
  if printf '%s\n' "$DIFF_CONTENT" | grep -E -q "$pattern"; then
    echo "true"
  else
    echo "false"
  fi
}

RISKY_FILE_COUNT="$(count_file_matches '(^|/)(route|routes|controller|controllers|middleware|middlewares|service|services|repo|repos|repository|repositories|schema|schemas|auth|transaction|db|database)')"
AUTH_FILE_COUNT="$(count_file_matches '(^|/)(auth|permission|permissions|role|roles|session|token|jwt)')"
WRITE_PATH_FILE_COUNT="$(count_file_matches '(^|/)(service|services|repo|repos|repository|repositories|db|database|schema|schemas|transaction|transactions)')"
MIDDLEWARE_FILE_COUNT="$(count_file_matches '(^|/)(middleware|middlewares|route|routes|controller|controllers)')"
TEST_FILE_COUNT="$(count_file_matches '(^|/)(__tests__|test|tests)/|(\.spec\.|\.test\.)')"
DOC_FILE_COUNT="$(count_file_matches '(^docs/|\.md$|\.mdx$|\.txt$|\.adoc$)')"
CONFIG_FILE_COUNT="$(count_file_matches '(^|/)(package\.json|pnpm-lock\.yaml|tsconfig.*\.json|eslint.*|prettier.*|\.github/)')"
MIGRATION_FILE_COUNT="$(count_file_matches '(^|/)(migrations?|drizzle|sql)/')"

HAS_VALIDATION_SIGNAL="$(diff_contains 'safeParse|parse\(|z\.object|zod')"
HAS_RESPONSE_SIGNAL="$(diff_contains 'res\.(status|json|send|end|download|redirect)|next\(')"
HAS_ASYNC_SIGNAL="$(diff_contains 'async |await |Promise\.|catchAsync|next\(|throw new ')"
HAS_WRITE_SIGNAL="$(diff_contains '\b(insert|update|delete|upsert|create|patch)\b|INSERT INTO|UPDATE |DELETE FROM|transaction|commit|rollback')"
HAS_MIDDLEWARE_SIGNAL="$(diff_contains 'app\.use|router\.use|express\.Router|middleware')"
HAS_AUTH_SIGNAL="$(diff_contains 'authorize|authorization|authenticate|auth|role|permission|jwt|token|session')"
HAS_SCHEMA_SIGNAL="$(diff_contains 'req\.(body|query|params)|zod|schema|validate')"

AUTO_SCORE=0
AUTO_REASONS=()

if [[ "$FILE_COUNT" -gt 3 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 1))
  AUTO_REASONS+=("more than 3 changed files")
fi

if [[ "$FILE_COUNT" -gt 8 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 2))
  AUTO_REASONS+=("more than 8 changed files")
fi

if [[ "$TOTAL_LINE_CHURN" -gt 120 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 1))
  AUTO_REASONS+=("line churn over 120")
fi

if [[ "$TOTAL_LINE_CHURN" -gt 300 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 2))
  AUTO_REASONS+=("line churn over 300")
fi

if [[ "$RISKY_FILE_COUNT" -gt 0 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 2))
  AUTO_REASONS+=("backend risk files changed")
fi

if [[ "$AUTH_FILE_COUNT" -gt 0 || "$MIGRATION_FILE_COUNT" -gt 0 ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 2))
  AUTO_REASONS+=("auth or migration related files changed")
fi

if [[ "$HAS_WRITE_SIGNAL" == "true" ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 2))
  AUTO_REASONS+=("write-path or transaction signals in diff")
fi

if [[ "$HAS_MIDDLEWARE_SIGNAL" == "true" || "$HAS_AUTH_SIGNAL" == "true" ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 1))
  AUTO_REASONS+=("middleware or auth flow signals in diff")
fi

if [[ "$HAS_VALIDATION_SIGNAL" == "true" || "$HAS_SCHEMA_SIGNAL" == "true" || "$HAS_RESPONSE_SIGNAL" == "true" || "$HAS_ASYNC_SIGNAL" == "true" ]]; then
  AUTO_SCORE=$((AUTO_SCORE + 1))
  AUTO_REASONS+=("request handling or async control-flow changed")
fi

if [[ "$FILE_COUNT" -eq "$TEST_FILE_COUNT" && "$FILE_COUNT" -gt 0 ]]; then
  AUTO_SCORE=$((AUTO_SCORE - 2))
  AUTO_REASONS+=("test-only change")
fi

if [[ "$FILE_COUNT" -eq "$DOC_FILE_COUNT" && "$FILE_COUNT" -gt 0 ]]; then
  AUTO_SCORE=$((AUTO_SCORE - 2))
  AUTO_REASONS+=("docs-only change")
fi

if [[ "$FILE_COUNT" -eq "$CONFIG_FILE_COUNT" && "$FILE_COUNT" -gt 0 && "$RISKY_FILE_COUNT" -eq 0 ]]; then
  AUTO_SCORE=$((AUTO_SCORE - 1))
  AUTO_REASONS+=("config-only change")
fi

AUTO_MODE="quick"
if [[ "$AUTO_SCORE" -ge 3 ]]; then
  AUTO_MODE="deep"
fi

if [[ ${#AUTO_REASONS[@]} -eq 0 ]]; then
  AUTO_REASONS=("small diff with limited backend-risk signals")
fi

AUTO_REASON_TEXT="$(printf '%s; ' "${AUTO_REASONS[@]}")"
AUTO_REASON_TEXT="${AUTO_REASON_TEXT%; }"

FINAL_MODE="$REVIEW_MODE"
if [[ "$REVIEW_MODE" == "auto" ]]; then
  FINAL_MODE="$AUTO_MODE"
fi

if [[ -n "$PR_BODY_FILE" ]]; then
  if [[ ! -f "$PR_BODY_FILE" ]]; then
    echo "PR body file not found: $PR_BODY_FILE" >&2
    exit 1
  fi
  PR_DESCRIPTION="$(cat "$PR_BODY_FILE")"
  PR_DESCRIPTION_SOURCE="provided file: $PR_BODY_FILE"
elif [[ -z "${PR_BODY_SOURCE_HINT:-}" ]]; then
  PR_DESCRIPTION="$(git log -1 --pretty=format:'%s%n%n%b')"
  PR_DESCRIPTION_SOURCE="latest commit message fallback"
fi

if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE="$(git log -1 --pretty=format:'%s')"
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

cat >"$OUTPUT_PATH" <<EOF
# Antigravity PR Review Input

Use \`.antigravity/skills/pr-review/SKILL.md\`.

If Antigravity allows model selection, use Gemini 3.1 Pro for this review.

Follow:
- \`.antigravity/skills/pr-review/workflow.md\`
- \`.antigravity/skills/pr-review/prompts/summarize.md\`
- \`.antigravity/skills/pr-review/prompts/risk-analysis.md\`
- \`.antigravity/skills/pr-review/prompts/code-review.md\`
- \`.antigravity/skills/pr-review/prompts/edge-case.md\`
- \`.antigravity/skills/pr-review/prompts/final-verdict.md\`
- \`.antigravity/skills/pr-review/references/review-rules.md\`
- \`.antigravity/skills/pr-review/references/express-checklist.md\`

Hard constraints:
- Review git diffs, not full files
- No style, naming, formatting, or lint feedback
- Only report evidence-backed issues
- Use severity: critical | major | minor
- If context is incomplete, mark it as needs follow-up instead of speculating

Return sections:
- PR Summary
- Risky Files
- Findings
- Edge Case Risks
- Merge Decision

## Review Meta
- Base ref: \`$BASE_REF\`
- Merge base: \`$MERGE_BASE\`
- Target ref: \`$TARGET_REF\`
- Target ref source: $TARGET_REF_SOURCE
- Diff source: \`$DIFF_LABEL\`
- Review mode: \`$FINAL_MODE\`
- Auto mode recommendation: \`$AUTO_MODE\`
- Auto mode score: \`$AUTO_SCORE\`
- Auto mode reasons: $AUTO_REASON_TEXT
- Changed files: \`$FILE_COUNT\`
- Total line churn: \`$TOTAL_LINE_CHURN\`
- Risky file matches: \`$RISKY_FILE_COUNT\`
- Auth-related files: \`$AUTH_FILE_COUNT\`
- Middleware/controller files: \`$MIDDLEWARE_FILE_COUNT\`
- Write-path files: \`$WRITE_PATH_FILE_COUNT\`
- Migration files: \`$MIGRATION_FILE_COUNT\`
- GitHub PR number: \`${PR_NUMBER:-n/a}\`
- GitHub PR url: ${PR_URL:-n/a}
- GitHub head ref: \`${PR_HEAD_REF:-n/a}\`

## PR Title
$PR_TITLE

## PR Description
Source: $PR_DESCRIPTION_SOURCE

$PR_DESCRIPTION

## Changed Files
\`\`\`text
$CHANGED_FILES
\`\`\`

## Git Diff
\`\`\`diff
$DIFF_CONTENT
\`\`\`
EOF

echo "Generated review input: $OUTPUT_PATH"
echo "Mode: $FINAL_MODE (auto recommendation: $AUTO_MODE)"
echo "Changed files: $FILE_COUNT, line churn: $TOTAL_LINE_CHURN"
