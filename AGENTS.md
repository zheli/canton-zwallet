# Agent Guidelines — canton-zwallet

Instructions for AI agents (Claude, Copilot, etc.) working on this codebase.

---

## Test requirement — non-negotiable

**Every PR that changes logic must include tests. Tests must pass.**

This is a hard rule, not a suggestion. Before marking any task done:

1. Write or update tests covering the changed/added code
2. Run `bun run test` — it must exit 0
3. Run `bun x tsc --noEmit` — no type errors

If a change touches any file in `src/crypto/`, `src/api/`, `src/hooks/`, or `src/store/`, tests are **required**. UI-only cosmetic changes (color, spacing) may be exempt, but include a comment explaining why tests are not needed.

---

## Test framework

This project uses **[Vitest](https://vitest.dev/)** — the native test runner for Vite projects.

### Setup (first time)

```bash
bun add -d vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

Add to `vite.config.ts`:

```ts
/// <reference types="vitest" />
export default defineConfig({
  // ...existing config...
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

### Running tests

```bash
bun run test            # all tests, exit on first failure
bun run test:watch      # watch mode during development
bun run test:coverage   # coverage report in coverage/
```

---

## What to test

### Always test (pure logic — easy to unit test)

- **`src/crypto/ed25519.ts`** — `seedToKeypair`, `signBytes`, `verifyBytes`, `pubkeyToBase58`
  - Known-good test vectors; round-trip sign/verify
- **`src/crypto/storage.ts`** — `storeEncryptedKey`, `loadEncryptedKey`, `hasStoredKey`, `deleteStoredKey`
  - Use `fake-indexeddb` to avoid real browser storage
- **`src/config/networks.ts`** — network URL construction
- **`src/api/*.ts`** — API client functions
  - Mock `axios` with `vi.mock('axios')`; verify correct URLs, headers, payloads

### Test with mocks

- **`src/hooks/`** — TanStack Query hooks
  - Wrap in `QueryClientProvider` + mock fetch; test loading/error/success states
- **`src/store/`** — Zustand stores
  - Call actions directly; assert state shape

### UI smoke tests (optional but encouraged)

- **`src/views/`** — render each view, assert key elements are present
  - Use `@testing-library/react`; avoid testing implementation details

### What not to test

- `src/crypto/passkey.ts` — WebAuthn browser APIs are not testable in jsdom; mock the module at the call site instead
- Third-party library internals
- Styling / CSS

---

## Test file conventions

| Source file | Test file |
|-------------|-----------|
| `src/crypto/ed25519.ts` | `src/crypto/ed25519.test.ts` |
| `src/api/ledger.ts` | `src/api/ledger.test.ts` |
| `src/views/SendView.tsx` | `src/views/SendView.test.tsx` |

Co-locate tests with source. No separate `__tests__` directory.

---

## PR checklist

Before opening or marking a PR ready:

- [ ] `bun run test` passes (exit 0)
- [ ] `bun x tsc --noEmit` passes (no type errors)
- [ ] `bun run lint` passes (or violations are intentional with comment)
- [ ] New functions/modules have at least one test
- [ ] Tests cover both happy path and a meaningful error case
- [ ] No test is skipped with `it.skip` / `test.skip` unless there is a linked issue explaining why

---

## Coverage expectations

There is no hard coverage percentage gate, but:

- Crypto utilities (`src/crypto/`) should approach 100% — these are security-critical
- API clients (`src/api/`) should cover all exported functions
- React views need at minimum a render smoke test

Run `bun run test:coverage` and inspect `coverage/index.html` to find uncovered branches.

---

## When the backend is unavailable

API tests must **never** require a live Canton backend. Always mock:

```ts
import { vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as vi.Mocked<typeof axios>

mockedAxios.post.mockResolvedValueOnce({ data: { status: 'ok' } })
```

Tests that require real network access should be tagged `@integration` and excluded from the default `bun run test` run.
