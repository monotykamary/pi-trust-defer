/**
 * Trust Defer — skip the startup trust prompt and get interactive immediately.
 *
 * Instead of blocking the startup flow with a trust selector, this extension
 * auto-declines project trust so pi is always immediately interactive. An
 * untrusted notification is shown, and /trustnow saves + reloads so project
 * resources load without a manual restart.
 *
 * Usage:
 *   mkdir -p ~/.pi/agent/extensions
 *   cp trust-defer.ts ~/.pi/agent/extensions/
 *
 * Or:
 *   pi -e ./trust-defer.ts
 *
 * How it works:
 *   1. On the project_trust event, returns { trusted: "no" } — this
 *      suppresses the built-in startup trust prompt and pi starts immediately
 *   2. On session_start, shows a notification about /trustnow
 *   3. /trustnow confirms, saves a "trusted" decision to trust.json, then
 *      triggers a reload that picks up the new trust state
 *
 * The reload works because we patch SettingsManager.prototype.reload to
 * re-check the trust store on every reload — so a /reload after /trustnow
 * picks up the new trust decision without requiring a full restart.
 */

import type { ExtensionAPI, ProjectTrustEventResult } from "@earendil-works/pi-coding-agent";
import {
  getAgentDir,
  hasProjectTrustInputs,
  ProjectTrustStore,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { TRUSTNOW_DESCRIPTION } from "./src/index.js";

// The cwd for the current project — captured from the project_trust event
// so the SettingsManager patch can check the trust store.
let currentCwd: string | null = null;

// Patch SettingsManager.prototype.reload to re-check the trust store.
// Without this, /reload would keep projectTrusted=false even after
// /trustnow saves true to trust.json, because the settings manager
// preserves its projectTrusted flag across reloads.
const origReload = SettingsManager.prototype.reload;
SettingsManager.prototype.reload = async function (this: SettingsManager) {
  // Before reloading settings, check if the trust store has a new decision
  // that differs from the current in-memory flag.
  if (!this.isProjectTrusted() && currentCwd) {
    try {
      const store = new ProjectTrustStore(getAgentDir());
      if (store.get(currentCwd) === true) {
        this.setProjectTrusted(true);
      }
    } catch {
      // Trust store read failed — keep current state
    }
  }
  return origReload.call(this);
};

export default function (pi: ExtensionAPI) {
  pi.on("project_trust", async (event, ctx): Promise<ProjectTrustEventResult> => {
    // Capture the cwd so the SettingsManager patch can use it
    currentCwd = event.cwd;

    // Auto-decline trust so pi starts immediately, without persisting a
    // "never trust" decision. The user can /trustnow later.
    if (ctx.hasUI) {
      ctx.ui.notify(
        "Project not trusted — instructions, .pi resources, and packages ignored. Use /trustnow to trust and reload.",
        "warning",
      );
    }
    return { trusted: "no" };
  });

  pi.registerCommand("trustnow", {
    description: TRUSTNOW_DESCRIPTION,
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd;
      currentCwd = cwd;

      // Nothing to trust if there are no trust inputs
      if (!hasProjectTrustInputs(cwd)) {
        ctx.ui.notify("No project trust inputs found — nothing to trust.", "info");
        return;
      }

      // Confirm with the user before saving
      const confirmed = await ctx.ui.confirm(
        "Trust this project?",
        "This allows pi to read project instructions (AGENTS.md/CLAUDE.md), load .pi settings and resources, install missing project packages, and execute project extensions. Pi will reload after saving.",
      );
      if (!confirmed) {
        ctx.ui.notify("Trust cancelled.", "info");
        return;
      }

      // Write the trust decision to the trust store
      try {
        const store = new ProjectTrustStore(getAgentDir());
        store.set(cwd, true);
      } catch (error) {
        ctx.ui.notify(
          `Failed to save trust decision: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
        return;
      }

      ctx.ui.notify("Project trusted. Reloading...", "info");

      // Trigger a reload. Our SettingsManager.prototype.reload patch
      // will detect the new trust.json entry and flip projectTrusted=true
      // before the settings are re-read, so project-local resources load.
      await ctx.reload();
    },
  });
}
