/**
 * Integration tests for the extension entry point.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPi, makeCommandContext } from "../helpers/mock-pi.js";

// Mock hasProjectTrustInputs and ProjectTrustStore before loading the extension
vi.mock("@earendil-works/pi-coding-agent", () => {
  return {
    getAgentDir: () => "/fake/.pi/agent",
    hasProjectTrustInputs: vi.fn().mockReturnValue(true),
    ProjectTrustStore: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    })),
    SettingsManager: {
      prototype: {
        reload: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
});

async function loadExtension(): Promise<(pi: any) => void> {
  vi.resetModules();
  // Re-mock after resetModules
  vi.doMock("@earendil-works/pi-coding-agent", () => ({
    getAgentDir: () => "/fake/.pi/agent",
    hasProjectTrustInputs: vi.fn().mockReturnValue(true),
    ProjectTrustStore: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    })),
    SettingsManager: {
      prototype: {
        reload: vi.fn().mockResolvedValue(undefined),
      },
    },
  }));
  const mod = await import("../../trust-defer.js");
  return mod.default;
}

describe("extension registration", () => {
  it("registers a project_trust handler", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("project_trust")?.[0];
    expect(handler).toBeDefined();
  });

  it("registers a /trustnow command", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const cmd = pi._registeredCommands.find((c) => c.name === "trustnow");
    expect(cmd).toBeDefined();
    expect(cmd!.config.description).toContain("Trust");
    expect(cmd!.config.description).toContain("reload");
  });
});
