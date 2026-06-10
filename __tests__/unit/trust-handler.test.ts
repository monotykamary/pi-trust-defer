/**
 * Unit tests for the project_trust event handler logic.
 */

import { describe, it, expect, vi } from "vitest";
import { createMockPi, makeProjectTrustContext } from "../helpers/mock-pi.js";

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

async function loadExtension() {
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

describe("project_trust handler", () => {
  it("returns { trusted: 'no' } by default", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("project_trust")?.[0];
    expect(handler).toBeDefined();

    const ctx = makeProjectTrustContext();
    const result = await handler!({ type: "project_trust", cwd: "/fake/project" }, ctx);

    expect(result).toEqual({ trusted: "no" });
  });

  it("returns { trusted: 'no' } consistently across calls", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("project_trust")?.[0];
    const ctx = makeProjectTrustContext();

    const result1 = await handler!({ type: "project_trust", cwd: "/fake/project" }, ctx);
    const result2 = await handler!({ type: "project_trust", cwd: "/fake/project" }, ctx);

    expect(result1).toEqual({ trusted: "no" });
    expect(result2).toEqual({ trusted: "no" });
  });
});


