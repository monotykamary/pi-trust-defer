import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProjectTrustStore, SettingsManager } from "@earendil-works/pi-coding-agent";
import { installTrustReloadHook } from "../../trust-defer.js";

describe("Pi 0.99 manager-local trust reload", () => {
  it("is idempotent and never grants a sibling or in-memory session's trust", async () => {
    const root = mkdtempSync(join(tmpdir(), "trust99-"));
    try {
      const agent = join(root, "agent");
      const a = join(root, "a"), b = join(root, "b");
      mkdirSync(agent);
      for (const cwd of [a,b]) { mkdirSync(join(cwd, ".pi"), { recursive: true }); writeFileSync(join(cwd, ".pi/settings.json"), JSON.stringify({ defaultModel: cwd })); }
      const first = SettingsManager.create(a, agent, { projectTrusted: false });
      const sibling = SettingsManager.create(b, agent, { projectTrusted: false });
      const memory = SettingsManager.inMemory({}, { projectTrusted: false });
      installTrustReloadHook();
      const wrapped = SettingsManager.prototype.reload;
      installTrustReloadHook();
      expect(SettingsManager.prototype.reload).toBe(wrapped);
      new ProjectTrustStore(agent).set(a, true);
      await Promise.all([first.reload(), sibling.reload(), memory.reload()]);
      expect(first.isProjectTrusted()).toBe(true);
      expect(first.getProjectSettings().defaultModel).toBe(a);
      expect(sibling.isProjectTrusted()).toBe(false);
      expect(sibling.getProjectSettings()).toEqual({});
      expect(memory.isProjectTrusted()).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
