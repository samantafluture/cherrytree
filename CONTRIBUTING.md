# Contributing to CherryTree

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### Setup

```bash
git clone https://github.com/samantafluture/cherrytree.git
cd cherrytree
pnpm install
docker compose up -d        # Start PostgreSQL
cp .env.example .env        # Configure environment
pnpm dev                    # Start client + server
```

### Verify

```bash
pnpm lint                   # ESLint (includes import/no-cycle)
pnpm typecheck              # TypeScript strict check
pnpm test                   # All tests
curl http://localhost:3040/health  # Server health check
```

## Architectural Rules

CherryTree enforces 7 composability rules. Read `CLAUDE.md` for the full list.
The most critical:

1. **One responsibility per file.** If a file does two things, split it.
2. **One-directional dependencies.** `routes → services → db`. Never reverse.
3. **Barrel imports only.** Import from `index.ts`, never from internal files.
4. **No files over 200 lines.** Decompose before committing.
5. **No `any`.** No circular imports. No inline styles. No external state/CSS libs.

`pnpm lint` enforces these via `eslint-plugin-import/no-cycle`.

## Pull Request Process

1. Create a branch: `phase-N/description` or `fix/description`
2. Write tests alongside implementation
3. Run the checklist in `CLAUDE.md` Section 12
4. Ensure `pnpm lint && pnpm typecheck && pnpm test` all pass
5. Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
6. Keep PRs focused — one concern per PR

## Project Structure

See `CLAUDE.md` Section 4 for the full structure and where new code goes.
