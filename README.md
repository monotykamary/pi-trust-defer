<div align="center">

# 🚫⏩ pi-trust-defer

**Skip the startup trust prompt in [pi](https://github.com/earendil-works/pi-coding-agent)**

_Auto-decline project trust at startup so you're immediately interactive. Use `/trust` + `/reload` when you're ready._

[![pi extension](https://img.shields.io/badge/pi-extension-blueviolet)](https://github.com/earendil-works/pi-coding-agent)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## The Problem

When you start pi in a project that contains `AGENTS.md`, `CLAUDE.md`, a `.pi/` directory, or other project-local inputs, pi shows a trust prompt **before** you can interact:

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

**pi-trust-defer** intercepts the `project_trust` event and auto-declines, so pi starts immediately. You get an untrusted notification on session start, and the existing built-in `/trust` + `/reload` applies the decision without a restart.

```
⚠ This project is not trusted. Project instructions (AGENTS.md/CLAUDE.md),
  .pi resources, and project packages are ignored. Use /trust to save a
  trust decision, then restart pi.         ← core notification

⚠ Project not trusted — instructions, .pi resources, and packages
  ignored. Use /trust to save, then /reload to apply.
                                            ← pi-trust-defer notification
```

| Step | Before | After |
|------|--------|-------|
| Startup | **Blocked** by trust prompt | **Immediate** — no prompt |
| Trust later | `/trust` → "restart pi" | `/trust` → `/reload` — no restart |
| Untrusted session | Can't use project instructions | Same behavior, just faster to get there |

---

## How It Works

```
pi starts
  → project_trust event fires
  → Extension returns { trusted: "no" }
  → pi is immediately interactive (no startup selector)
  → session_start event fires
  → ctx.isProjectTrusted() is false → untrusted notification shown

User types "/trust" (builtin)
  → Saves "trusted: true" to ~/.pi/agent/trust.json

User types "/reload" (builtin)
  → SettingsManager.prototype.reload is patched to check trust.json
  → Detects projectTrusted=false but trust.json=true → flips flag
  → session_start fires again → ctx.isProjectTrusted() is true → no notification
  → Project-local resources load — no restart
```

The `session_start` handler uses `ctx.isProjectTrusted()` (added in pi 0.79.1) to check the effective trust state on every session start — including after `/reload`. This means the untrusted notification is shown as long as the project is not trusted, and stops appearing as soon as `/trust` + `/reload` flips the state.

The `SettingsManager` patch checks trust.json on each reload when `projectTrusted` is `false`. This is fine because `/reload` is user-initiated and infrequent — the single `proper-lockfile` acquisition per reload is negligible.

---

## Why not `defaultProjectTrust: "never"`?

Pi 0.79.1 added the `defaultProjectTrust` setting (`"ask"` / `"always"` / `"never"`), which has partial overlap with this extension. Here's the difference:

| | `defaultProjectTrust: "never"` | pi-trust-defer |
|---|---|---|
| Auto-declines trust | ✓ | ✓ |
| Per-session only | ✗ — persists a global "never" fallback | ✓ — no persisted decision |
| `/trust` overrides per-project | ✗ — the global "never" still applies | ✓ — `/trust` saves per-project "yes" |
| No startup prompt | ✓ | ✓ |
| `/reload` picks up `/trust` | ✗ — need manual restart | ✓ — patched reload re-checks trust.json |
| Reminds you on each session | No — silently declines | Yes — notification on `session_start` |

`defaultProjectTrust: "never"` is a reasonable choice if you never want project instructions in any project and don't need a reminder. pi-trust-defer is for the common case where you *sometimes* want to trust projects after verifying them, without being blocked at startup.

---

## Installation

### Option 1: Install via pi package (Recommended)

```bash
pi install pi-trust-defer
```

Or add to your `settings.json`:

```json
{
  "packages": [
    "pi-trust-defer"
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

### Option 3: Project-Local Installation

```bash
mkdir -p .pi/extensions
cp trust-defer.ts .pi/extensions/
```

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

In `--mode json`, `--mode rpc`, and `-p` modes, the `project_trust` event fires but the extension has no UI. It returns `{ trusted: "no" }` without showing a notification — consistent with the existing non-interactive behavior of declining trust by default.

Pass `--approve` / `-a` to trust the project in non-interactive modes, just like without the extension.

---

## Architecture

| Component | Purpose |
|-----------|---------|
| `project_trust` handler | Intercepts the trust event, returns `{ trusted: "no" }` |
| `session_start` handler | Checks `ctx.isProjectTrusted()` and shows an untrusted notification with /trust + /reload hints |
| `SettingsManager.prototype.reload` patch | On reload, if `projectTrusted` is `false` but trust.json says `true`, flips the flag |

The extension uses the `project_trust` event and `ctx.isProjectTrusted()` — supported extension APIs, not hacks.

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
