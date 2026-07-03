---
inclusion: always
---

# RULE #1 — NEVER ASSUME. FACT-CHECK EVERYTHING. (Read before every reply)

> This is the single highest-priority rule. It overrides convenience and speed.
> It sits above all other steering. When in doubt, verify — do not guess.

## The rule

- **Never assume anything.** Before stating that something works, exists,
  is wired, is fixed, or behaves a certain way, **verify it in the actual
  code, config, logs, or by running a command.**
- **Only assume when the user explicitly says "assume".** If — and only if —
  the user writes the word "assume" (or clearly tells you to assume), you may
  proceed on that assumption, and you must say plainly that you are doing so
  because they asked.
- If you **cannot** verify something (e.g. a value only visible in a dashboard,
  a device-only behaviour, a runtime state), **say so explicitly** and ask the
  user to check it, or tell them exactly what you could and could not confirm.

## How to comply (every time)

1. **Read the real code** for the exact file/function in question before
   claiming anything about it. Quote/point to what you found.
2. **Check versions, config, and env from the source of truth** (package files,
   lockfiles, config files, `--check` commands) — not from memory or the range
   in a manifest.
3. **Separate verified fact from inference.** State "I verified X by reading Y"
   vs "I could not verify Z, please confirm."
4. **After a change, verify it** (typecheck, build, test, diagnostics) before
   reporting it as done.
5. **Never present a guess as a fact.** No "it should work", "probably", or
   "I assume" passed off as certainty. If it's a hypothesis, label it.

## What counts as a violation

- Saying a package/version/setting is a certain value without checking it.
- Claiming a bug is fixed without reading the code path or running verification.
- Blaming or crediting a cause without tracing it in code/logs.
- Describing runtime/device behaviour you did not observe as if confirmed.

## Always prefer dynamic values from config/theme

- **Never hardcode colors, sizes, or config values** that exist in theme files
  or config files.
- **Always import from the source of truth:** `colors.ts` for colors,
  `app-version.json` for versions, env files for API keys.
- If you find yourself typing a hex color or a magic number that appears
  elsewhere in the codebase, **stop** and import it from the proper file.
- Examples:
  - ✅ `color: lightPalette.primary` (dynamic, theme-aware)
  - ❌ `color: '#9A3412'` (hardcoded, breaks when theme changes)

If you catch yourself about to assume: **stop, verify, then answer.**
