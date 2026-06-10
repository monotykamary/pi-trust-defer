/**
 * Integration tests for the extension entry point.
 */

import { describe, it, expect, vi } from "vitest";
import { createMockPi } from "../helpers/mock-pi.js";

vi.mock("@earendil-works/pi-coding-agent", () => ({
  getAgentDir: () => "/fake/.pi/agent",
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

async function loadExtension(): Promise<(pi: any) => void> {
  vi.resetModules();
  vi.doMock("@earendil-works/pi-coding-agent", () => ({
    getAgentDir: () => "/fake/.pi/agent",
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
  it("registers project_trust and session_start handlers, no commands", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    expect(pi._eventHandlers.get("project_trust")?.[0]).toBeDefined();
    expect(pi._eventHandlers.get("session_start")?.[0]).toBeDefined();

    // No custom commands — user uses built-in /trust + /reload
    expect(pi._registeredCommands).toHaveLength(0);
  });
});
