/**
 * Test helpers for pi-trust-defer.
 *
 * Provides a mock ExtensionAPI and factories for building test contexts.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const noop = () => {};

export interface MockPi extends ExtensionAPI {
  _eventHandlers: Map<string, Array<(...args: any[]) => void>>;
  _registeredTools: string[];
  _registeredCommands: Array<{ name: string; config: any }>;
}

export function createMockPi(): MockPi {
  const eventHandlers = new Map<string, Array<(...args: any[]) => void>>();

  const mock: MockPi = {
    _eventHandlers: eventHandlers,
    _registeredTools: [],
    _registeredCommands: [],

    on(event: string, handler: any) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event)!.push(handler);
    },
    registerTool(tool: any): void {
      mock._registeredTools.push(tool.name);
    },
    registerCommand(name: string, config: any) {
      mock._registeredCommands.push({ name, config });
    },
    registerShortcut: noop as any,
    registerFlag: noop as any,
    getFlag: noop as any,
    registerMessageRenderer: noop as any,
    sendMessage: noop as any,
    sendUserMessage: noop as any,
    appendEntry: noop as any,
    setSessionName: noop as any,
    getSessionName: noop as any,
    setLabel: noop as any,
    exec: noop as any,
    setModel: noop as any,
    getThinkingLevel: noop as any,
    setThinkingLevel: noop as any,
    registerProvider: noop as any,
    unregisterProvider: noop as any,
    getAllTools: noop as any,
    getActiveTools: noop as any,
    setActiveTools: noop as any,
    getCommands: noop as any,
    events: {} as any,
  } as MockPi;

  return mock;
}

export interface MockProjectTrustContext {
  cwd: string;
  mode: string;
  hasUI: boolean;
  ui: {
    notify: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    input: ReturnType<typeof vi.fn>;
  };
}

export function makeProjectTrustContext(
  overrides: Partial<MockProjectTrustContext> = {},
): MockProjectTrustContext {
  return {
    cwd: "/fake/project",
    mode: "tui",
    hasUI: true,
    ui: {
      notify: vi.fn(),
      select: vi.fn(),
      confirm: vi.fn(),
      input: vi.fn(),
    },
    ...overrides,
  };
}
