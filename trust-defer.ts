/**
 * Trust Defer — skip the startup trust prompt and get interactive immediately.
 *
 * Instead of blocking the startup flow with a trust selector, this extension
 * auto-declines project trust so pi is always immediately interactive. The
 * built-in /trust + /reload picks up the new trust state without a full restart.
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
 *   2. SettingsManager.prototype.reload is patched to check trust.json — so
 *      /reload after /trust picks up the new decision without restarting
 *
 * Relation to defaultProjectTrust:
 *   Pi's built-in defaultProjectTrust: "never" also auto-declines, but it
 *   persists a global "never" decision — /trust won't override it per-project.
 *   This extension returns { trusted: "no" } without remembering, so the
 *   per-session decline leaves no trace. /trust saves a per-project "yes" to
 *   trust.json, and /reload picks it up because the SettingsManager patch
 *   re-checks the store.
 */

import type { ExtensionAPI, ProjectTrustEventResult } from "@earendil-works/pi-coding-agent";
import {
  getAgentDir,
  ProjectTrustStore,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

// The cwd for the current project — captured from the project_trust event
// so the SettingsManager patch knows which entry to check.
let currentCwd: string | null = null;

// Patch SettingsManager.prototype.reload to flip projectTrusted when the
// trust store has a newer decision. Without this, /reload preserves
// projectTrusted=false from the initial session creation, even though
// trust.json now says true — so project-local resources won't load.
//
// /reload is user-initiated (not a hot loop), so checking trust.json on
// each call is fine — it's a single file-lock acquisition, not a
// repeated churn concern.
const origReload = SettingsManager.prototype.reload;
SettingsManager.prototype.reload = async function (this: SettingsManager) {
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
    // "never trust" decision. The user can /trust + /reload later.
    return { trusted: "no" };
  });

}
