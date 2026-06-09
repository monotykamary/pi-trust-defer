<div align="center">

# 🚫⏩ pi-trust-defer

**Skip the startup trust prompt in [pi](https://github.com/earendil-works/pi-coding-agent)**

_Auto-decline project trust at startup so you're immediately interactive. Use `/trustnow` when you're ready._

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

**pi-trust-defer** intercepts the `project_trust` event and auto-declines, so pi starts immediately. You get an untrusted notification in the chat area and a discoverable `/trustnow` command that saves the decision **and reloads** — no restart needed.

```
⚠ This project is not trusted. Project instructions (AGENTS.md/CLAUDE.md),
  .pi resources, and project packages are ignored. Use /trustnow to trust and reload.
```

When you're ready to trust:

| Step | Before | After |
|------|--------|-------|
| Startup | **Blocked** by trust prompt | **Immediate** — no prompt |
| Trust later | `/trust` → "restart pi" | `/trustnow` → saves + reloads |
| Untrusted session | Can't use project instructions | Same behavior, just faster to get there |

---

## How It Works

```
pi starts
  → project_trust event fires
  → Extension returns { trusted: "no" }
  → pi is immediately interactive (no startup selector)
  → Untrusted notification shown in chat

User types "/trustnow"
  → Confirmation dialog
  → Saves "trusted: true" to ~/.pi/agent/trust.json
  → SettingsManager.prototype.reload is patched to check trust.json
  → ctx.reload() picks up the new trust state
  → Project-local resources load immediately — no restart
```

The `SettingsManager` patch is necessary because `/reload` preserves the `projectTrusted` flag from the initial session creation. Without it, the reload would keep `projectTrusted=false` even after `trust.json` says `true`. The patch simply checks the trust store before each settings reload.

---

## Installation

### Option 1: Install via pi package (Recommended)

```bash
pi install https://github.com/monotykamary/pi-trust-defer@main
```

Or add to your `settings.json`:

```json
{
  "packages": [
    "https://github.com/monotykamary/pi-trust-defer@main"
  ]
}
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

Once loaded, the extension works automatically:

| Command | What it does |
|---------|-------------|
| (automatic) | Auto-declines project trust at startup |
| `/trustnow` | Trust this project + reload immediately |

### What happens when I run `/trustnow`?

1. A confirmation dialog appears asking you to trust the project
2. If confirmed, the trust decision is saved to `~/.pi/agent/trust.json`
3. pi reloads automatically — project instructions, `.pi` resources, and packages load
4. No restart required

### Can I still use the built-in `/trust`?

Yes — `/trust` still works and saves to the same trust store. But `/trust` requires a restart, while `/trustnow` reloads automatically.

### What about non-interactive modes?

In `--mode json`, `--mode rpc`, and `-p` modes, the `project_trust` event fires but the extension has no UI. It returns `{ trusted: "no" }` without showing a notification — consistent with the existing non-interactive behavior of declining trust by default.

Pass `--approve` / `-a` to trust the project in non-interactive modes, just like without the extension.

---

## Architecture

| Component | Purpose |
|-----------|---------|
| `project_trust` handler | Intercepts the trust event, returns `{ trusted: "no" }` |
| `SettingsManager.prototype.reload` patch | Checks trust.json before settings reload, flips `projectTrusted` if saved decision differs |
| `/trustnow` command | Saves trust + calls `ctx.reload()` |

The extension uses the `project_trust` event — the same mechanism that enterprise extensions use to control trust decisions automatically. This is a supported extension API, not a hack.

The `SettingsManager` prototype patch is the only "internal" touch. It's needed because the built-in `/reload` preserves `projectTrusted=false` from the initial session, and the extension API doesn't expose a way to flip it. The patch is minimal: before each `reload()`, if `isProjectTrusted()` is `false` and the trust store says `true`, call `setProjectTrusted(true)`.

---

## Development

```bash
npm install          # install dev dependencies
npm test            # run tests
npm run typecheck   # type check
npm run lint:dead   # check for unused exports
```

## License

MIT
