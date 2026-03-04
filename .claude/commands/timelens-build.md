Build the specified TimeLens part: $ARGUMENTS

## Protocol

1. **Parse** — Extract part number from `$ARGUMENTS` (e.g., `part-5`, `part-1`)
2. **Read Design** — Load these files:
   - `docs/design/part{N}-*.md` (해당 파트 설계 문서)
   - `docs/contracts/shared-contract.md` (타입, 파일 소유권)
   - `docs/contracts/gemini-sdk-reference.md` (SDK 레퍼런스)
3. **Check Progress** — Read `PROGRESS.md`, identify incomplete items for this part
4. **Build with Ralph Cycle** — For each file to implement:
   - **Execute**: Write/modify code
   - **Verify**: Run `npx tsc --noEmit`
   - **Fix**: If errors, fix immediately
   - **Loop**: Repeat verify-fix (max 10 iterations). If stuck, STOP and report blocker
5. **Persist** — Update `PROGRESS.md`:
   - Check off completed items
   - Add session log entry with date, part, files changed, quality score
6. **Commit** — Suggest `/auto-commit` with `feat(part-N): description` format

## Rules
- Follow `CLAUDE.md` coding rules strictly
- Do NOT modify files owned by other parts (check shared-contract.md §L)
- Use `@/types/*` path aliases for type imports
- `any` and `@ts-ignore` are forbidden
- Use `@google/genai` (NOT `@google/generative-ai`)
