# Express + TypeScript Review Checklist

## Request Flow

- Is middleware order still correct for auth, parsing, validation, and error handling?
- Could a newly inserted middleware short-circuit requests unexpectedly?
- Are route params, query values, and body payloads still interpreted consistently?

## Async Error Handling

- Do async controllers and middleware still forward errors to `next()` or a shared async wrapper?
- Was any `await` removed or any promise created without being handled?
- Can the diff cause a response to be sent twice or after an error path?

## Request Validation

- Are `req.body`, `req.query`, and `req.params` still validated before use?
- Did the diff weaken, bypass, or relocate validation in a way that changes behavior?
- Do new optional fields or enum branches have safe defaults and error paths?

## Response Consistency

- Did the response status code change in a way that breaks API expectations?
- Did the JSON shape or success/error envelope change without visible handling for compatibility?
- Are not-found, conflict, forbidden, and validation failures still mapped consistently?

## Service and Repository Boundaries

- Does the controller keep orchestration concerns separate from data access?
- Did business rules move into routes or middleware in a way that can cause duplication or drift?
- Does the repository still encapsulate persistence details cleanly enough to avoid leaking DB-specific behavior upward?

## Transaction Handling

- Do related writes still happen in one transaction where required?
- Can one side effect succeed while a later DB write fails?
- Are rollback expectations preserved when an error occurs mid-flow?

## Race Condition Risk

- Can concurrent requests now pass the same pre-check and write conflicting state?
- Did the diff replace atomic behavior with read-then-write logic?
- Are idempotency, retries, or duplicate submissions handled safely on write paths?

## Shared Utility Risk

- Does the diff change a helper or middleware used by multiple routes?
- Could the same change affect auth, logging, serialization, or error mapping globally?
