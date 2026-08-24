# Better Canvas View Security Adversary Plan

Status: In progress  
Date: 2026-08-24

## Stage 0 - Exploitability Sweep

1. Trace attacker-controlled Canvas assignment, announcement, pagination, and
   link data through network, normalization, storage, and React rendering.
2. Verify exact-origin, GET-only, JSON/authentication, CSP, permission, and
   logging controls on the production code paths.
3. Construct concrete bypass attempts for markup execution, deceptive links,
   pagination escape, credential exposure, stale-snapshot destruction, and
   concurrent refresh ordering.

## Stage 1 - Scenario-Based Checklist

1. Audit extension permissions, browser-session trust, Canvas-origin requests,
   local IndexedDB exposure, logs/errors, dependency integrity, and build
   artifacts.
2. Distinguish applicable browser-extension threats from non-applicable cloud,
   IAM, and LLM threat categories.
3. Grade every supported finding as CRITICAL, HIGH, MEDIUM, or LOW using the
   security-adversary severity model.

## Stage 2 - Socratic Dialectic

1. Challenge every assumed trust boundary and claimed control against the
   concrete production path and existing tests.
2. Re-evaluate exploitability, blast radius, reproducibility, and residual risk.
3. Write the consolidated verdict to
   `.agent-tasks/security-reviewer/CRITIQUE.md` with required revisions or
   compensating controls.
