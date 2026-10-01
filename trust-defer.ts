/** Defer startup trust without persisting a decision; /trust + /reload opts in. */
import { dirname } from "node:path";
import type { ExtensionAPI, ProjectTrustEventResult } from "@earendil-works/pi-coding-agent";
import { ProjectTrustStore, SettingsManager } from "@earendil-works/pi-coding-agent";

const PATCH = Symbol.for("pi-trust-defer.reload.v2");

/** Pi 1.0 reload preserves trust; use the manager's own file paths, never a
 * process-global cwd. In-memory/custom-storage SDK managers have no paths and
 * must keep their host's explicit policy. Installation is reload-idempotent. */
export function installTrustReloadHook(): void {
  const original = SettingsManager.prototype.reload;
  if ((original as unknown as Record<symbol, unknown>)[PATCH]) return;
  const wrapped: typeof original = async function (this: SettingsManager) {
    const paths = (this as unknown as { settingsPaths?: { project?: string; global?: string } }).settingsPaths;
    if (!this.isProjectTrusted() && paths?.project && paths.global) {
      try {
        const store = new ProjectTrustStore(dirname(paths.global));
        if (store.get(dirname(dirname(paths.project))) === true) this.setProjectTrusted(true);
      } catch {
        // Fail closed if the trust store is unreadable.
      }
    }
    return original.call(this);
  };
  Object.defineProperty(wrapped, PATCH, { value: true });
  SettingsManager.prototype.reload = wrapped;
}

export default function trustDefer(pi: ExtensionAPI) {
  installTrustReloadHook();
  pi.on("project_trust", async (): Promise<ProjectTrustEventResult> => ({ trusted: "no" }));
}
