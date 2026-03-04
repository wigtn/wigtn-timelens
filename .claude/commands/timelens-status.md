Report the current TimeLens build status.

## Steps

1. Read `PROGRESS.md` and summarize:
   - Current active part
   - Last session date
   - Overall completion ratio (checked / total items)
2. Run `git status --short` to show uncommitted changes
3. Run `npx tsc --noEmit 2>&1 | tail -5` to check TypeScript error count (if tsc available)
4. Display per-part completion:
   - Part 5 (Infra): X/Y complete
   - Part 1 (Core): X/Y complete
   - Part 2 (Curator UI): X/Y complete
   - Part 3 (Restoration): X/Y complete
   - Part 4 (Discovery Diary): X/Y complete
5. List any blockers from `PROGRESS.md`

## Output Format
```
=== TimeLens Build Status ===
Active Part: Part N
Last Session: YYYY-MM-DD
Overall: XX/YY (ZZ%)

Part 5 (Infra):      ██████░░ 6/8
Part 1 (Core):       ░░░░░░░░ 0/12
Part 2 (Curator UI): ░░░░░░░░ 0/10
Part 3 (Restoration):░░░░░░░░ 0/8
Part 4 (Diary):      ░░░░░░░░ 0/6

TSC Errors: N
Git: clean / N files modified

Blockers: (none)
```
