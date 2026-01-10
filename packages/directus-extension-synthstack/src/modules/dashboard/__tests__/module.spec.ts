import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardModule from '../module.vue';
import * as license from '../../../lib/license';

// Mock the license module
vi.mock('../../../lib/license', () => ({
  verifyLicense: vi.fn(),
  hasFeature: vi.fn(),
  getUpgradeUrl: vi.fn(() => 'https://synthstack.app/pricing'),
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

// Mock global window
const mockWindowOpen = vi.fn();
const mockWindowLocation = { href: '' };

Object.defineProperty(global, 'window', {
  value: {
    open: mockWindowOpen,
    location: mockWindowLocation
  },
  writable: true
});

// Create stub components for Directus UI components
const stubs = {
  'private-view': {
    template: '<div class="private-view"><slot /><slot name="title-outer:prepend" /><slot name="headline" /><slot name="actions" /></div>'
  },
  'v-button': {
    template: '<button :disabled="disabled" class="v-button"><slot /></button>',
    props: ['disabled', 'kind', 'secondary', 'icon', 'rounded']
  },
  'v-icon': {
    template: '<span class="v-icon" :data-name="name"></span>',
    props: ['name', 'left', 'large', 'x-large']
  },
  'v-breadcrumb': {
    template: '<nav class="breadcrumb"></nav>',
    props: ['items']
  },
  'v-progress-circular': {
    template: '<div class="progress"></div>',
    props: ['indeterminate']
  },
  'v-chip': {
    template: '<span class="chip" :class="$attrs.class"><slot /></span>',
    props: ['x-small', 'small']
  }
};

describe('Dashboard Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: null });
    (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
      tier: 'community',
      features: license.TIER_FEATURES.community,
      valid: true
    });
    (license.hasFeature as ReturnType<typeof vi.fn>).mockImplementation(
      (lic, feature) => lic.features.includes(feature)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State & Lifecycle', () => {
    it('shows loading state initially', () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      expect(wrapper.find('.loading-state').exists()).toBe(true);
    });

    it('calls verifyLicense on mount', async () => {
      mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(license.verifyLicense).toHaveBeenCalled();
    });

    it('fetches dashboard data on mount', async () => {
      mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(mockApi.get).toHaveBeenCalledWith('/synthstack/stats');
    });

    it('hides loading state after data loads', async () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });

    it('shows error state on failure', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.error-state').exists()).toBe(true);
    });
  });

  describe('License Display', () => {
    it('shows upgrade button for community tier', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'community',
        features: license.TIER_FEATURES.community,
        valid: true
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('Upgrade');
    });

    it('shows license banner for community tier', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'community',
        features: license.TIER_FEATURES.community,
        valid: true
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.license-banner').exists()).toBe(true);
    });

    it('disables workflow button when no workflows feature', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'community',
        features: license.TIER_FEATURES.community,
        valid: true
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      const workflowButton = wrapper.findAll('.action-card').find(
        b => b.text().includes('New Workflow')
      );
      expect(workflowButton?.attributes('disabled')).toBeDefined();
    });

    it('enables workflow button when workflows feature available', async () => {
      (license.verifyLicense as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'pro',
        features: license.TIER_FEATURES.pro,
        valid: true
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      const workflowButton = wrapper.findAll('.action-card').find(
        b => b.text().includes('New Workflow')
      );
      expect(workflowButton?.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Stats Display', () => {
    it('displays workflow count', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/synthstack/stats') {
          return Promise.resolve({
            data: { workflows: 5, executionsToday: 10, activeAgents: 2, successRate: 95 }
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('5');
      expect(wrapper.text()).toContain('Active Workflows');
    });

    it('displays executions today', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/synthstack/stats') {
          return Promise.resolve({
            data: { workflows: 5, executionsToday: 42, activeAgents: 2, successRate: 95 }
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('42');
      expect(wrapper.text()).toContain('Executions Today');
    });

    it('displays active agents count', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/synthstack/stats') {
          return Promise.resolve({
            data: { workflows: 5, executionsToday: 10, activeAgents: 3, successRate: 95 }
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('3');
      expect(wrapper.text()).toContain('AI Agents');
    });

    it('displays success rate percentage', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/synthstack/stats') {
          return Promise.resolve({
            data: { workflows: 5, executionsToday: 10, activeAgents: 2, successRate: 98.5 }
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('98.5%');
      expect(wrapper.text()).toContain('Success Rate');
    });

    it('uses mock data when API fails', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      // Should show mock stats (12 workflows from mock data)
      expect(wrapper.text()).toContain('12');
    });
  });

  describe('Activity List', () => {
    it('renders activity items', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/activity')) {
          return Promise.resolve({
            data: [
              { id: '1', type: 'workflow_executed', title: 'Test Flow', status: 'success', timestamp: new Date() }
            ]
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.find('.activity-list').exists()).toBe(true);
    });
  });

  describe('Health Display', () => {
    it('renders health status for all services', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/synthstack/health') {
          return Promise.resolve({
            data: {
              apiGateway: 'healthy',
              nodeRed: 'healthy',
              database: 'healthy',
              mlService: 'healthy'
            }
          });
        }
        return Promise.resolve({ data: null });
      });

      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('API Gateway');
      expect(wrapper.text()).toContain('Node-RED');
      expect(wrapper.text()).toContain('Database');
      expect(wrapper.text()).toContain('ML Service');
    });
  });

  describe('Component Structure', () => {
    it('has refresh button', async () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('Refresh');
    });

    it('has quick actions section', async () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('Quick Actions');
    });

    it('has open editor action', async () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('Open Editor');
    });

    it('has data model action', async () => {
      const wrapper = mount(DashboardModule, { global: { stubs } });
      await flushPromises();

      expect(wrapper.text()).toContain('Data Model');
    });
  });
});
