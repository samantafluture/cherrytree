# CherryTree — Development Workflow

Read this at the start of every phase. No exceptions.

---

## Before Starting a Phase

1. **Read `CLAUDE.md`** — ensure architectural rules are loaded
2. **Read the phase requirements** in `cherrytree-impl-plan.md`
3. **Create a feature branch** from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feat/phase-N-description
   ```

## During a Phase

1. **Write tests alongside implementation** — not after
2. **Run quality checks frequently:**
   ```bash
   pnpm lint          # Includes import/no-cycle
   pnpm typecheck     # TypeScript strict
   pnpm test          # All tests pass
   ```
3. **Watch for structural signals:**
   - File approaching 200 lines? Decompose immediately
   - Circular import? Fix the dependency, don't work around it
   - Need to mock the world for a test? Fix the coupling

## Before Considering a Phase Done

1. **Run the full composability checkpoint** (CLAUDE.md Section 12):
   - [ ] Every directory has a barrel `index.ts`
   - [ ] No file exceeds 200 lines
   - [ ] No circular imports (`pnpm lint` passes)
   - [ ] Dependencies flow in correct direction
   - [ ] All imports use barrel paths
   - [ ] JSDoc headers on all exported functions/classes
   - [ ] Tests mirror source structure
   - [ ] No `any` types, no inline styles, no external libs
   - [ ] Conventional commit message

2. **Run full verification:**

   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```

3. **Self-review the diff:**
   ```bash
   git diff main...HEAD
   ```
   Check for: dependency direction violations, barrel bypassing, mixed responsibilities

## Git Workflow (End of Phase)

1. **Stage and commit** with conventional commits:

   ```bash
   git add <specific-files>
   git commit -m "feat: description of what was done"
   ```

2. **Push and create PR:**

   ```bash
   git push -u origin feat/phase-N-description
   gh pr create --title "Phase N: Description" --body "..."
   ```

3. **PR description format:**

   ```markdown
   ## Summary

   - What was built/changed (bullet points)

   ## Composability Checklist

   - [x] All items from the checkpoint above

   ## Test plan

   - How to verify this works
   ```

4. **Merge to `main`** via PR (builds the habit for contributors)

## Conventions

| Convention | Rule                                                          |
| ---------- | ------------------------------------------------------------- |
| Commits    | `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`      |
| Branches   | `feat/phase-N-description`                                    |
| Types      | No `any` — use `unknown` and narrow                           |
| Errors     | Custom classes extending base `AppError`                      |
| Naming     | camelCase (code), kebab-case (files), PascalCase (components) |
| Imports    | Always from barrel `index.ts`                                 |
| File size  | Max ~200 lines                                                |

## After Each Claude Code Session

- Run `pnpm lint` — check for `no-cycle` violations
- If any file > 200 lines: decompose before committing
- Keep `CLAUDE.md` updated as the project evolves
- Update memory files with patterns learned
