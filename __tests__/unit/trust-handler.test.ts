/**
 * Unit tests for the project_trust event handler logic.
 */

import { describe, it, expect, vi } from "vitest";
import { createMockPi, makeProjectTrustContext, makeSessionStartContext } from "../helpers/mock-pi.js";

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

  it("does not show a notification — that is session_start's job", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("project_trust")?.[0];
    const ctx = makeProjectTrustContext({ hasUI: true });
    await handler!({ type: "project_trust", cwd: "/fake/project" }, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
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

describe("session_start handler", () => {
  it("shows a warning notification when project is not trusted and hasUI is true", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("session_start")?.[0];
    expect(handler).toBeDefined();

    const ctx = makeSessionStartContext({ isProjectTrusted: () => false, hasUI: true });
    await handler!({ type: "session_start", reason: "startup" }, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("/trust"),
      "warning",
    );
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("/reload"),
      "warning",
    );
  });

  it("does not show a notification when project is trusted", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("session_start")?.[0];
    const ctx = makeSessionStartContext({ isProjectTrusted: () => true, hasUI: true });
    await handler!({ type: "session_start", reason: "startup" }, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("does not show a notification when hasUI is false", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("session_start")?.[0];
    const ctx = makeSessionStartContext({ isProjectTrusted: () => false, hasUI: false });
    await handler!({ type: "session_start", reason: "startup" }, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("shows notification on reload when project is still not trusted", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("session_start")?.[0];
    const ctx = makeSessionStartContext({ isProjectTrusted: () => false, hasUI: true });
    await handler!({ type: "session_start", reason: "reload" }, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("/trust"),
      "warning",
    );
  });

  it("does not show notification on reload when project became trusted", async () => {
    const factory = await loadExtension();
    const pi = createMockPi();
    factory(pi as any);

    const handler = pi._eventHandlers.get("session_start")?.[0];
    const ctx = makeSessionStartContext({ isProjectTrusted: () => true, hasUI: true });
    await handler!({ type: "session_start", reason: "reload" }, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
