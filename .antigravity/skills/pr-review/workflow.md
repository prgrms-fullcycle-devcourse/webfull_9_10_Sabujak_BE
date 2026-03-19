You are a senior backend engineer and AI workflow designer.

I want to create an Antigravity-compatible PR review skill and workflow for my Express + TypeScript backend project.

My project already has a Codex skill system with this structure:

- .codex/skills/sabujak-backend/
  - SKILL.md
  - references/
    - backend-rules.md
    - review-checklist.md

Now I want you to create a similar system for Antigravity that focuses specifically on PR code review.

---

## 🎯 Goal

Create a "PR Review Skill + Workflow" that:

1. Reviews git diffs (not full files)
2. Focuses on real issues (not style)
3. Works well with Express + TypeScript backend
4. Can be reused across PRs
5. Produces structured, high-signal output

---

## 📁 Output Structure

Create the following files:

.antigravity/
skills/
pr-review/
SKILL.md
workflow.md
prompts/
summarize.md
risk-analysis.md
code-review.md
edge-case.md
final-verdict.md
references/
review-rules.md
express-checklist.md

---

## 📌 Requirements

### 1. SKILL.md

Define:

- name
- description
- when to use
- workflow steps
- guardrails

---

### 2. workflow.md

Design a step-by-step PR review pipeline:

Step 1: summarize PR
Step 2: extract risky files
Step 3: deep code review
Step 4: edge case analysis
Step 5: final merge decision

Each step should:

- clearly define input
- clearly define output
- reference prompt files

---

### 3. Prompt files

Each prompt must:

- be optimized for Gemini (Antigravity)
- enforce strict rules (no style comments, only real issues)
- use structured output format

Include:

#### summarize.md

- summarize PR intent and risk

#### risk-analysis.md

- identify top risky files/modules

#### code-review.md

- deep review (bugs, async issues, validation, error handling)

#### edge-case.md

- concurrency, invalid input, failure scenarios

#### final-verdict.md

- merge decision (yes/no + reasons)

---

### 4. references/review-rules.md

Define strict review rules:

- no style feedback
- must include code evidence
- must include severity
- avoid speculation

---

### 5. references/express-checklist.md

Checklist specific to Express + TypeScript:

- middleware order
- async error handling
- request validation
- response consistency
- repository/service separation
- transaction handling
- race condition risk

---

## ⚠️ Important Constraints

- Do NOT assume GitHub integration

- The input is always:
  - PR description
  - file list
  - git diff

- Optimize for:
  - large PRs (must support file-level review)
  - high signal output
  - minimal hallucination

---

## 💡 Output Style

- clean markdown
- production-ready
- no placeholders
- no vague explanations

---

## 🚀 Bonus (optional but preferred)

- Add a "quick review mode" (small PR)
- Add a "deep review mode" (large PR)
- Add severity classification (critical / major / minor)

---

Generate all files with full content.
