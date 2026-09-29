<div align="center">

# 🚫⏩ pi-trust-defer

**Skip the startup trust prompt in [pi](https://github.com/earendil-works/pi-coding-agent)**

_Auto-decline project trust at startup so you're immediately interactive. Use `/trust` + `/reload` when you're ready._

[![pi extension](https://img.shields.io/badge/pi-extension-blueviolet)](https://github.com/earendil-works/pi-coding-agent)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## Pi 0.99 compatibility (1.2.13)

Tested with Pi **0.99.0**. Host-provided Pi packages and TypeBox are peers (`*`), not bundled runtime dependencies; development uses exact Pi 0.99.0 pins and host-compatible TypeBox where needed.

The reload hook is idempotent and uses each SettingsManager's own project and agent-directory paths. It no longer applies one session's cwd to another; in-memory/custom-storage managers keep their host's trust policy.

Run `bun run test:host` for the offline real-host load, native codemode/nested-call, module-identity and reload checks. Set `PI99_HOST_PACKAGE` to an installed Pi package directory to test that host explicitly; add `PI99_HOST_ENTRY=bundle` to check the bundled CLI runtime's constructors.

## The Problem

When Pi finds protected project resources (such as `.pi/settings.json`, extensions or skills), unresolved trust can block interactive startup. Context files such as `AGENTS.md` and `CLAUDE.md` load regardless of project trust; a bare `.pi/` directory does not trigger trust.

```
 Trust project folder?
 /Users/you/my-project

 This allows pi to read project instructions (AGENTS.md/CLAUDE.md)...

 → Trust
   Trust (this session only)
   Do not trust
   Do not trust (this session only)
```

You're blocked until you choose. Every. Single. Time. Even in projects you've never needed project instructions for.

---

## The Solution

**pi-trust-defer** intercepts the `project_trust` event and auto-declines, so pi starts immediately. Pi's built-in untrusted notification still appears, and the existing `/trust` + `/reload` applies the decision without a restart.

| Step | Before | After |
|------|--------|-------|
| Startup | **Blocked** by trust prompt | **Immediate** — no prompt |
| Trust later | `/trust` → "restart pi" | `/trust` → `/reload` — no restart |

---

## How It Works

```
pi starts
  → project_trust event fires
  → Extension returns { trusted: "no" }
  → pi is immediately interactive (no startup selector)

User types "/trust" (builtin)
  → Saves "trusted: true" to ~/.pi/agent/trust.json

User types "/reload" (builtin)
  → SettingsManager.prototype.reload is patched to check trust.json
  → Detects projectTrusted=false but trust.json=true → flips flag
  → Project-local resources load — no restart
```

The `SettingsManager` patch checks trust.json on each reload when `projectTrusted` is `false`. This is fine because `/reload` is user-initiated and infrequent — the single `proper-lockfile` acquisition per reload is negligible.

---

## Why not `defaultProjectTrust: "never"`?

Pi 0.79.1 added the `defaultProjectTrust` setting (`"ask"` / `"always"` / `"never"`), which has partial overlap with this extension. Here's the difference:

| | `defaultProjectTrust: "never"` | pi-trust-defer |
|---|---|---|
| Auto-declines trust | ✓ | ✓ |
| No startup prompt | ✓ — `"never"` returns immediately, no selector shown | ✓ — `project_trust` returns `{ trusted: "no" }` |
| Per-session only | ✗ — it's a global fallback, not a per-session decision | ✓ — declines in-memory, no persisted decision |
| `/trust` overrides per-project | ✓ — `/trust` saves per-project, overriding the fallback | ✓ — `/trust` saves per-project "yes" |
| `/reload` picks up `/trust` | ✗ — `reload()` keeps the initial `projectTrusted` flag; needs a restart | ✓ — patched `reload()` re-checks trust.json |

Applied per-project vs. globally is the first real difference: `defaultProjectTrust` is a single global setting, so `"never"` auto-declines trust in *every* project. pi-trust-defer is loaded as an extension, leaving the global default untouched and declining per-session without writing a decision to trust.json — so `/trust` + `/reload` still works the way you'd expect.

The bigger difference is `/reload`. Pi's `SettingsManager.prototype.reload()` preserves `projectTrusted` from the initial session and never re-reads the trust store, so even after `/trust` writes a `true` decision, `/reload` will not load project-local resources — you have to restart pi. This extension patches `reload()` to re-check trust.json, so `/trust` → `/reload` applies without a restart.

`defaultProjectTrust: "never"` is a good fit if you want to globally auto-decline and don't mind restarting after `/trust`. pi-trust-defer is for the common case where you *sometimes* want to trust projects after verifying them and want `/trust` + `/reload` to work in place.

---

## Installation

### Option 1: Install via pi package (Recommended)

```bash
pi install npm:pi-trust-defer
```

Or add to your `settings.json`:

```json
{
  "packages": [
    "npm:pi-trust-defer"
  ]
}
```

Or install from GitHub:

```bash
pi install https://github.com/monotykamary/pi-trust-defer
```

### Option 2: Global Installation

```bash
cp trust-defer.ts ~/.pi/agent/extensions/
```

### Project-local loading

Project extensions load only after trust is resolved, so they cannot defer the startup trust prompt. Use a personal install or explicit `-e` instead.

### Option 4: Quick Test

```bash
pi -e ./trust-defer.ts
```

## Usage

Once loaded, the extension works automatically — no new commands to learn. Just use the built-in `/trust` and `/reload`:

| Step | What you type |
|-------|--------------|
| 1 | (pi starts immediately — no trust prompt) |
| 2 | `/trust` — save trust decision |
| 3 | `/reload` — apply without restart |

### What about non-interactive modes?

In `--mode json`, `--mode rpc`, and `-p` modes, the `project_trust` event fires but the extension has no UI. It returns `{ trusted: "no" }` — consistent with the existing non-interactive behavior of declining trust by default.

Pass `--approve` / `-a` to trust the project in non-interactive modes, just like without the extension.

---

## Architecture

| Component | Purpose |
|-----------|---------|
| `project_trust` handler | Intercepts the trust event, returns `{ trusted: "no" }` |
| `SettingsManager.prototype.reload` patch | On reload, if `projectTrusted` is `false` but trust.json says `true`, flips the flag |

The extension uses the public `project_trust` event. The reload hook additionally relies on Pi 0.99's per-instance `settingsPaths` layout; managers without file paths are deliberately left unchanged.

The `SettingsManager` prototype patch is the only "internal" touch. It's needed because the built-in `/reload` preserves `projectTrusted=false` from the initial session, and the extension API doesn't expose a way to flip it. The patch is minimal: on each `reload()`, if `isProjectTrusted()` is `false` and the trust store says `true`, call `setProjectTrusted(true)`. Since `/reload` is user-initiated and infrequent, the trust store read is fine — a single `proper-lockfile` acquisition, not a hot loop.

---

## Development

```bash
npm install          # install dev dependencies
npm run typecheck   # type check
npm run lint:dead   # check for unused exports
npm test            # run tests
npm test:coverage   # run tests with coverage
```

## License

MIT
