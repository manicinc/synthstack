/**
 * Node-RED Test Helper Utilities
 *
 * Shared utilities for testing custom Node-RED nodes.
 * Uses node-red-node-test-helper for realistic node testing.
 */

import { vi, Mock } from 'vitest';

// Mock RED object for testing
export interface MockRED {
  nodes: {
    createNode: Mock;
    registerType: Mock;
  };
  util: {
    cloneMessage: Mock;
  };
  httpAdmin: {
    get: Mock;
    post: Mock;
  };
  settings: {
    functionGlobalContext: Record<string, unknown>;
  };
}

export function createMockRED(): MockRED {
  return {
    nodes: {
      createNode: vi.fn((node, config) => {
        node.id = config.id || 'test-node-id';
        node.type = config.type || 'test-node';
        node.name = config.name || '';
        node._events = {};
        node.on = vi.fn((event, handler) => {
          node._events[event] = handler;
        });
        node.emit = vi.fn((event, ...args) => {
          if (node._events[event]) {
            node._events[event](...args);
          }
        });
        node.send = vi.fn();
        node.done = vi.fn();
        node.error = vi.fn();
        node.warn = vi.fn();
        node.log = vi.fn();
        node.status = vi.fn();
        node.context = vi.fn(() => ({
          get: vi.fn(),
          set: vi.fn(),
          global: {
            get: vi.fn(),
            set: vi.fn(),
          },
          flow: {
            get: vi.fn(),
            set: vi.fn(),
          },
        }));
      }),
      registerType: vi.fn(),
    },
    util: {
      cloneMessage: vi.fn((msg) => JSON.parse(JSON.stringify(msg))),
    },
    httpAdmin: {
      get: vi.fn(),
      post: vi.fn(),
    },
    settings: {
      functionGlobalContext: {},
    },
  };
}

// Mock node instance for testing
export interface MockNode {
  id: string;
  type: string;
  name: string;
  _events: Record<string, (...args: unknown[]) => void | Promise<void>>;
  on: Mock;
  emit: Mock;
  send: Mock;
  done: Mock;
  error: Mock;
  warn: Mock;
  log: Mock;
  status: Mock;
  context: Mock;
  credentials?: Record<string, string>;
}

export function createMockNode(config: Partial<MockNode> = {}): MockNode {
  const node: MockNode = {
    id: config.id || 'test-node-id',
    type: config.type || 'test-node',
    name: config.name || '',
    _events: {},
    on: vi.fn((event, handler) => {
      node._events[event] = handler;
    }),
    emit: vi.fn((event, ...args) => {
      if (node._events[event]) {
        node._events[event](...args);
      }
    }),
    send: vi.fn(),
    done: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    status: vi.fn(),
    context: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      global: {
        get: vi.fn(),
        set: vi.fn(),
      },
      flow: {
        get: vi.fn(),
        set: vi.fn(),
      },
    })),
    credentials: config.credentials || {},
  };
  return node;
}

// Mock message for testing
export interface MockMessage {
  _msgid?: string;
  payload?: unknown;
  topic?: string;
  [key: string]: unknown;
}

export function createMockMessage(payload: unknown = {}, extra: Record<string, unknown> = {}): MockMessage {
  return {
    _msgid: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    payload,
    ...extra,
  };
}

// Mock HTTP response
export interface MockResponse {
  ok: boolean;
  status: number;
  json: Mock;
  text: Mock;
}

export function createMockResponse(data: unknown, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

// Helper to wait for async operations
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to trigger input event
export async function triggerInput(node: MockNode, msg: MockMessage): Promise<void> {
  if (node._events.input) {
    await node._events.input(msg, node.send, node.done);
  }
}

// Helper to assert status was set
export function assertStatus(node: MockNode, fill: string, shape: string, textPattern?: string | RegExp) {
  expect(node.status).toHaveBeenCalled();
  const lastCall = (node.status as Mock).mock.calls[(node.status as Mock).mock.calls.length - 1][0];
  expect(lastCall.fill).toBe(fill);
  expect(lastCall.shape).toBe(shape);
  if (textPattern) {
    if (typeof textPattern === 'string') {
      expect(lastCall.text).toContain(textPattern);
    } else {
      expect(lastCall.text).toMatch(textPattern);
    }
  }
}

// Helper to assert message was sent
export function assertSent(node: MockNode, output: number, payloadMatcher?: unknown) {
  expect(node.send).toHaveBeenCalled();
  const lastCall = (node.send as Mock).mock.calls[(node.send as Mock).mock.calls.length - 1][0];
  
  // Check correct output index
  if (output === 0) {
    expect(lastCall[0]).not.toBeNull();
  } else if (output === 1) {
    expect(lastCall[1]).not.toBeNull();
  }
  
  // Check payload if provided
  if (payloadMatcher !== undefined) {
    const msg = lastCall[output];
    if (typeof payloadMatcher === 'function') {
      expect(payloadMatcher(msg?.payload)).toBe(true);
    } else {
      expect(msg?.payload).toEqual(payloadMatcher);
    }
  }
}

// Helper to assert error was sent to output 2
export function assertErrorSent(node: MockNode, errorPattern?: string | RegExp) {
  assertSent(node, 1);
  if (errorPattern) {
    const lastCall = (node.send as Mock).mock.calls[(node.send as Mock).mock.calls.length - 1][0];
    const errorMsg = lastCall[1];
    if (typeof errorPattern === 'string') {
      expect(errorMsg?.payload?.error || errorMsg?.error).toContain(errorPattern);
    } else {
      expect(errorMsg?.payload?.error || errorMsg?.error).toMatch(errorPattern);
    }
  }
}

// Mock fetch for API calls
export function mockFetch(responses: Record<string, unknown>) {
  return vi.fn((url: string) => {
    const key = Object.keys(responses).find(k => url.includes(k));
    if (key) {
      return Promise.resolve(createMockResponse(responses[key]));
    }
    return Promise.resolve(createMockResponse({ error: 'Not found' }, 404));
  });
}

// Config type for nodes
export interface NodeConfig {
  id: string;
  type: string;
  name?: string;
  [key: string]: unknown;
}

export function createNodeConfig(type: string, overrides: Partial<NodeConfig> = {}): NodeConfig {
  return {
    id: `${type}-test-${Date.now()}`,
    type,
    name: `Test ${type}`,
    ...overrides,
  };
}


