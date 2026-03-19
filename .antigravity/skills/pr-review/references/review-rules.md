# Review Rules

## Scope

- Review only the PR description, changed file list, and git diff.
- Prefer hunk-level reasoning over full-file assumptions.
- Focus on correctness, safety, reliability, contract stability, and data integrity.

## What Not To Report

- Style or formatting feedback
- Naming preferences
- Comment wording
- Generic refactor advice without runtime consequence
- Speculation that is not supported by the diff

## What Every Finding Must Include

- Severity: `critical`, `major`, or `minor`
- File or changed area
- Concrete code evidence from the diff
- Clear user or system impact
- Confidence level or explicit `needs follow-up` status when context is incomplete

## Evidence Standard

- A finding must be anchored in a changed line, changed branch, changed call pattern, or changed control flow visible in the diff.
- If the risk depends on unseen code, phrase it as a follow-up risk rather than a confirmed defect.
- Avoid vague wording such as "might be wrong" unless followed by the exact missing assumption.

## Prioritization

- Prefer issues that can break requests, corrupt data, weaken validation, bypass auth, cause partial writes, or mis-handle async errors.
- Prefer a short list of real issues over a long list of weak concerns.
- Collapse duplicate observations into one finding with stronger evidence.

## Severity Guide

### Critical

- Security exposure
- Authorization bypass
- High-confidence data corruption
- High-confidence outage or severe request-path breakage

### Major

- Broken request validation
- Incorrect response behavior
- Async or error-handling regression with user-visible effect
- Transaction or repository bug that can create inconsistent state
- Concurrency risk with realistic production impact

### Minor

- Real but limited-scope correctness issue
- Narrow failure mode with contained blast radius
- Operationally relevant issue that is not likely to block most traffic

## Output Discipline

- Be direct and concise.
- Do not repeat the same evidence in multiple sections.
- If no confirmed issues exist, say so clearly.
