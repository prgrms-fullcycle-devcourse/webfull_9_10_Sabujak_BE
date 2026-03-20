#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_PATH="$ROOT_DIR/.antigravity/tmp/pr-review-input.md"
PROMPT_PATH="$ROOT_DIR/.antigravity/tmp/pr-review-chat-prompt.txt"
BASE_REF="origin/main"
REVIEW_MODE="auto"
PR_BODY_FILE=""
PR_TITLE=""
DRY_RUN="false"
GH_PR_SELECTOR=""
USE_GH="true"
WINDOW_MODE="reuse"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-pr-review.sh [options]

Options:
  --base <ref>         Base ref to diff against. Default: origin/main
  --mode <mode>        quick | deep | auto. Default: auto
  --pr-body <file>     Markdown or text file containing the PR description
  --title <title>      Optional PR title to include in the generated input
  --gh-pr <selector>   Fetch PR metadata via gh. Use a PR number or 'current'
  --no-gh              Disable GitHub PR metadata auto-fetch
  --reuse-window       Reuse the last Antigravity window. Default behavior
  --new-window         Force a new Antigravity window
  --dry-run            Generate input and print the Antigravity command only
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
    --reuse-window)
      WINDOW_MODE="reuse"
      shift
      ;;
    --new-window)
      WINDOW_MODE="new"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
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

if ! command -v antigravity >/dev/null 2>&1; then
  echo "Antigravity CLI not found in PATH." >&2
  exit 1
fi

GENERATOR_CMD=(
  bash
  scripts/generate-pr-review-input.sh
  --base "$BASE_REF"
  --mode "$REVIEW_MODE"
  --output "$INPUT_PATH"
)

if [[ -n "$PR_BODY_FILE" ]]; then
  GENERATOR_CMD+=(--pr-body "$PR_BODY_FILE")
fi

if [[ -n "$PR_TITLE" ]]; then
  GENERATOR_CMD+=(--title "$PR_TITLE")
fi

if [[ "$USE_GH" == "false" ]]; then
  GENERATOR_CMD+=(--no-gh)
fi

if [[ -n "$GH_PR_SELECTOR" ]]; then
  GENERATOR_CMD+=(--gh-pr "$GH_PR_SELECTOR")
fi

"${GENERATOR_CMD[@]}"

mkdir -p "$(dirname "$PROMPT_PATH")"

cat >"$PROMPT_PATH" <<EOF
Attach the generated \`pr-review\` skill files and review this Express + TypeScript backend PR.

반드시 한국어로 리뷰 결과를 작성하세요.

다음 규칙을 정확히 따르세요:
- 첨부된 skill, workflow, prompt, reference 파일을 그대로 사용합니다
- 전체 파일이 아니라 git diff만 리뷰합니다
- 스타일, 포맷팅, 네이밍, lint 피드백은 금지합니다
- 근거가 있는 실제 이슈만 제시합니다
- 각 발견사항은 critical, major, minor 중 하나로 분류합니다

반환 섹션:
- PR 요약
- 위험 파일
- 주요 발견사항
- 엣지 케이스 위험
- 머지 결정

코드 식별자, 파일 경로, severity 라벨, verdict 값은 원문 그대로 유지해도 됩니다.

첨부된 \`pr-review-input.md\` 파일이 리뷰의 주요 입력입니다.
EOF

PROMPT_DISPLAY="반드시 한국어로, 첨부된 pr-review 스킬 파일과 pr-review-input.md를 기준으로 이 Express + TypeScript 백엔드 PR을 리뷰하세요."

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"$PROMPT_PATH" || true
fi

CHAT_CMD=(
  antigravity
  chat
  -
  --mode agent
  --maximize
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/SKILL.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/workflow.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/prompts/summarize.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/prompts/risk-analysis.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/prompts/code-review.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/prompts/edge-case.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/prompts/final-verdict.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/references/review-rules.md"
  --add-file "$ROOT_DIR/.antigravity/skills/pr-review/references/express-checklist.md"
  --add-file "$INPUT_PATH"
)

if [[ "$WINDOW_MODE" == "reuse" ]]; then
  CHAT_CMD+=(--reuse-window)
else
  CHAT_CMD+=(--new-window)
fi

if [[ "$DRY_RUN" == "true" ]]; then
  printf 'Generated input: %s\n' "$INPUT_PATH"
  printf 'Generated prompt: %s\n' "$PROMPT_PATH"
  printf 'Run command:\n'
  printf ' %q' "${CHAT_CMD[@]}"
  printf '\n'
  printf 'Prompt preview:\n%s\n' "$PROMPT_DISPLAY"
  printf 'After the review, save the result with:\n'
  printf ' bash %q --source /absolute/path/to/antigravity-review.md\n' "$ROOT_DIR/scripts/save-pr-review.sh"
  exit 0
fi

if ! cat "$PROMPT_PATH" | "${CHAT_CMD[@]}"; then
  echo "Failed to open Antigravity chat with stdin prompt." >&2
  exit 1
fi

printf 'Review input: %s\n' "$INPUT_PATH"
printf 'Review prompt: %s\n' "$PROMPT_PATH"
if command -v pbcopy >/dev/null 2>&1; then
  printf 'The review prompt was also copied to your clipboard.\n'
fi
printf 'When the review is done, save it with:\n'
printf ' bash %q --source /absolute/path/to/antigravity-review.md\n' "$ROOT_DIR/scripts/save-pr-review.sh"
