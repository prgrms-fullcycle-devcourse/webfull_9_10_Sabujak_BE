---
name: pr-review
description: Antigravity skill for high-signal PR review on Express + TypeScript backends using PR description, file list, and git diff as the only inputs.
metadata:
  short-description: Diff-focused backend PR review
---

# PR Review Skill

## Use This When

- Reviewing a backend PR for an Express + TypeScript service
- The available inputs are PR description, changed file list, and git diff
- You want findings about correctness, safety, validation, async behavior, data integrity, or operational risk
- You need a reusable review workflow that can be applied consistently across multiple PRs

## Do Not Use This When

- The task is full-file refactoring, implementation, or architecture design rather than PR review
- The review goal is style, naming, formatting, or lint feedback
- There is no diff available

## Review Modes

### Quick Review Mode

Use for small PRs, focused patches, or low-risk changes.

- Summarize intent and likely blast radius
- Identify at most 3 risky files
- Review only the highest-risk hunks
- Produce only findings that have direct code evidence

### Deep Review Mode

Use for large PRs, multi-module changes, or data-path/auth/payment/write-path updates.

- Summarize intent, change surface, and failure modes
- Rank risky files by severity and dependency impact
- Review all risky diffs and any cross-file interactions
- Run explicit edge-case analysis before final verdict

## Workflow

1. Read the PR description, file list, and git diff only.
2. Classify the review as `quick` or `deep` based on PR size and risk.
3. Summarize the PR intent, affected layers, and likely blast radius with [`workflow.md`](workflow.md) Step 1 and [`prompts/summarize.md`](prompts/summarize.md).
4. Identify risky files and modules with [`workflow.md`](workflow.md) Step 2 and [`prompts/risk-analysis.md`](prompts/risk-analysis.md).
5. Perform deep diff review on risky files using [`prompts/code-review.md`](prompts/code-review.md).
6. Run failure-mode and edge-case analysis using [`prompts/edge-case.md`](prompts/edge-case.md).
7. Produce a final merge decision with [`prompts/final-verdict.md`](prompts/final-verdict.md).
8. Cross-check findings against [`references/review-rules.md`](references/review-rules.md) and [`references/express-checklist.md`](references/express-checklist.md) before returning the review.

## Guardrails

- Review git diff hunks, not entire files unless the diff itself requires cross-hunk reasoning.
- Do not give style, naming, formatting, or lint feedback.
- Only report an issue when the diff contains enough evidence to support it.
- Every finding must include severity, impacted file or hunk, and concrete code evidence from the diff.
- Prefer missed validation, incorrect error handling, race conditions, broken control flow, bad transaction boundaries, and response-contract regressions over minor concerns.
- If evidence is incomplete, mark it as `needs follow-up` instead of inventing behavior.
- Avoid repeating the same issue across multiple sections.
- Keep output compact and ranked by user impact.

## Output Expectations

- Clean Markdown
- Structured sections with stable headings
- Severity classification: `critical`, `major`, `minor`
- High signal only: findings, supporting evidence, risk summary, merge verdict
- The entire review output must be written in Korean

## Project Review References

- [Workflow](workflow.md)
- [Review Rules](references/review-rules.md)
- [Express Checklist](references/express-checklist.md)
