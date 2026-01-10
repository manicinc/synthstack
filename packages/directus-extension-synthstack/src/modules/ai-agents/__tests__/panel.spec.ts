import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AIAgentsPanel from '../panel.vue';
import * as license from '../../../lib/license';

// Mock the license module
vi.mock('../../../lib/license', () => ({
  verifyLicense: vi.fn(),
  hasFeature: vi.fn(),
  getUpgradeUrl: vi.fn(() => 'https://synthstack.app/pricing?feature=ai_agents'),
  TIER_FEATURES: {
    community: ['dashboard', 'content_management'],
    pro: ['dashboard', 'content_management', 'workflows', 'ai_agents'],
    agency: ['dashboard', 'content_management', 'workflows', 'ai_agents', 'white_label']
  }
}));

// Mock Directus SDK
const mockApi = {
  get: vi.fn()
};

const mockSettingsStore = {
  settings: {
    synthstack_license_key: undefined
  }
};

vi.mock('@directus/extensions-sdk', () => ({
  useApi: () => mockApi,
  useStores: () => ({
    useSettingsStore: () => mockSettingsStore
  })
}));

// Mock window
const mockWindowOpen = vi.fn();

Object.defineProperty(global, 'window', {
  value: {
    open: mockWindowOpen
  },
  writable: true
});

// Stub components
const stubs = {
  'v-button': {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled', 'kind', 'icon', 'x-small']
  },
  'v-icon': {
    template: '<span class="v-icon" :data-name="name"></span>',
    props: ['name']
  },
  'v-chip': {
    template: '<span class="chip" :class="$attrs.class"><slot /></span>',
    props: ['x-small']
  },
  'v-progress-circular': {
    template: '<div class="progress"></div>',
    props: ['indeterminate', 'x-small']
  }
};

describe('AI Agents Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('License Gate', () => {
    it('shows license gate for non-pro users', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'community',
        features: license.TIER_FEATURES.community,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.license-gate').exists()).toBe(true);
      expect(wrapper.text()).toContain('AI Agents require a Pro license');
    });

    it('hides license gate for pro users', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.license-gate').exists()).toBe(false);
    });

    it('has upgrade button in license gate', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'community',
        features: license.TIER_FEATURES.community,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      const upgradeButton = wrapper.find('.license-gate button');
      expect(upgradeButton.exists()).toBe(true);
      expect(upgradeButton.text()).toContain('Upgrade');
    });
  });

  describe('Agents List', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('fetches and displays agent list', async () => {
      const mockAgents = [
        { id: 'ceo', name: 'CEO', role: 'Strategic Planning', status: 'active', icon: 'psychology', color: '#667eea', invocations: 100, avgResponseTime: 1000 }
      ];
      mockApi.get.mockResolvedValue({ data: mockAgents });

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      expect(mockApi.get).toHaveBeenCalledWith('/synthstack/agents');
      expect(wrapper.text()).toContain('CEO');
      expect(wrapper.text()).toContain('Strategic Planning');
    });

    it('shows empty state when no agents', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      // Component uses mock data on empty/error, but structure should exist
      expect(wrapper.find('.agents-list').exists()).toBe(true);
    });

    it('uses mock data as fallback on API error', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      // Mock data includes CEO, CTO, CMO, CFO
      expect(wrapper.text()).toContain('CEO');
      expect(wrapper.text()).toContain('CTO');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('filters by status when agentFilter is active', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { agentFilter: 'active' }
      });
      await flushPromises();

      // With active filter, only active agents should show
      // Mock data has 3 active (CEO, CTO, CFO) and 1 idle (CMO)
      const agentCards = wrapper.findAll('.agent-card');
      expect(agentCards.length).toBe(3);
    });

    it('shows all agents when no filter', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { agentFilter: undefined }
      });
      await flushPromises();

      // All 4 mock agents should show
      const agentCards = wrapper.findAll('.agent-card');
      expect(agentCards.length).toBe(4);
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('calculates total invocations correctly', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showMetrics: true }
      });
      await flushPromises();

      // Mock data: CEO=234, CTO=189, CMO=156, CFO=98 = 677
      expect(wrapper.text()).toContain('677');
      expect(wrapper.text()).toContain('Invocations');
    });

    it('calculates average response time correctly', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showMetrics: true }
      });
      await flushPromises();

      // Mock data: (1250+980+1100+890)/4 = 1055ms
      expect(wrapper.text()).toContain('1055ms');
      expect(wrapper.text()).toContain('Avg Response');
    });

    it('hides metrics when showMetrics is false', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showMetrics: false }
      });
      await flushPromises();

      expect(wrapper.find('.metrics').exists()).toBe(false);
    });
  });

  describe('Props', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('shows header when showHeader is true', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showHeader: true }
      });
      await flushPromises();

      expect(wrapper.find('.panel-header').exists()).toBe(true);
      expect(wrapper.text()).toContain('AI Co-Founders');
    });

    it('hides header when showHeader is false', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showHeader: false }
      });
      await flushPromises();

      expect(wrapper.find('.panel-header').exists()).toBe(false);
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('shows loading state initially', () => {
      const wrapper = mount(AIAgentsPanel, { global: { stubs } });

      expect(wrapper.find('.loading').exists()).toBe(true);
    });

    it('hides loading state after data loads', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.loading').exists()).toBe(false);
    });
  });

  describe('Agent Selection', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('has clickable agent cards', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      const agentCards = wrapper.findAll('.agent-card');
      expect(agentCards.length).toBeGreaterThan(0);
      // Agent cards are clickable elements
      expect(agentCards[0].attributes('style')).toBeUndefined(); // No disabled style
    });
  });

  describe('Refresh', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('has refresh button in header', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const wrapper = mount(AIAgentsPanel, {
        global: { stubs },
        props: { showHeader: true }
      });
      await flushPromises();

      const refreshButton = wrapper.find('.panel-header button');
      expect(refreshButton.exists()).toBe(true);
    });
  });

  describe('Status Display', () => {
    beforeEach(() => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });
      (license.hasFeature as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('displays agent status as chip', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      const chips = wrapper.findAll('.chip');
      expect(chips.length).toBeGreaterThan(0);
    });

    it('applies correct class for active status', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      const activeChips = wrapper.findAll('.chip.active');
      expect(activeChips.length).toBe(3); // CEO, CTO, CFO are active in mock
    });

    it('applies correct class for idle status', async () => {
      mockApi.get.mockRejectedValue(new Error('Use mock'));

      const wrapper = mount(AIAgentsPanel, { global: { stubs } });
      await flushPromises();

      const idleChips = wrapper.findAll('.chip.idle');
      expect(idleChips.length).toBe(1); // CMO is idle in mock
    });
  });
});
