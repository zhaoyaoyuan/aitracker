# Cursor Sessions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add privacy-preserving, read-only discovery of local Cursor Composer sessions.

**Architecture:** Register a `cursor-session-v1` reader in the existing session-reader factory. The reader opens Cursor's `User/globalStorage/state.vscdb` read-only, projects metadata from `composerHeaders`, excludes subagent rows, and emits the existing `SessionRecord` shape without conversation content. Cursor remains read-only because no stable local resume command is available.

**Tech Stack:** TypeScript, Node `node:sqlite`, Node test runner, generated tool registry.

---

### Task 1: Add failing Cursor scanner coverage

**Files:**

- Modify: `src/lib/local-sessions/scanner.server.test.ts`

1. Create a fixture `state.vscdb` with normal, archived, and subagent Composer headers.
2. Assert normal and archived sessions are returned, subagents are excluded, workspace/title/timestamps are mapped, and no private fields leak.
3. Run the focused test and confirm failure because Cursor is not a session source.

### Task 2: Implement the read-only Cursor reader

**Files:**

- Modify: `src/lib/local-sessions/scanner.server.ts`
- Modify: `src/lib/tool-registry/contracts.ts`
- Modify: `src/lib/local-sessions/types.ts`
- Modify: `src/lib/tool-registry/definitions/cursor.tool.json`
- Modify: `src/lib/local-sessions/resume-id.test.ts`

1. Add `cursor-session-v1` and `cursor` to session contracts.
2. Read bounded `composerHeaders` rows from `User/globalStorage/state.vscdb` in read-only mode.
3. Parse only header metadata, exclude subagents, tolerate missing/locked/old-schema databases, and mark records read-only.
4. Configure Cursor sessions as `mode: read` with an app-data root.
5. Run focused tests until green.

### Task 3: Regenerate and verify

**Files:**

- Regenerate: `src/lib/tool-registry/definitions.generated.ts`
- Regenerate: `src/lib/tool-registry/public-manifest.generated.ts`

1. Run registry generators.
2. Run Cursor/session tests, registry verification, typecheck, and lint for touched files.
3. Inspect the final diff for generated-only expected changes and privacy regressions.
