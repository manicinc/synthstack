import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

// Set test environment variable for Supabase
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('VITE_API_URL', 'http://localhost:3003')

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/image.jpg' } }),
      })),
    },
  })),
}))

// Mock axios for API calls
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios')
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ data: { data: [] } }),
        post: vi.fn().mockResolvedValue({ data: { data: {} } }),
        put: vi.fn().mockResolvedValue({ data: { data: {} } }),
        patch: vi.fn().mockResolvedValue({ data: { data: {} } }),
        delete: vi.fn().mockResolvedValue({ data: { data: {} } }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  }
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []
  
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock Quasar notify
vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    useQuasar: vi.fn(() => ({
      notify: vi.fn(),
      screen: {
        width: 1024,
        height: 768,
        name: 'md',
        sizes: { sm: 600, md: 1024, lg: 1440, xl: 1920 },
        lt: { sm: false, md: false, lg: true, xl: true },
        gt: { xs: true, sm: true, md: false, lg: false },
        xs: false,
        sm: false,
        md: true,
        lg: false,
        xl: false,
      },
      dark: {
        isActive: false,
        set: vi.fn(),
        toggle: vi.fn(),
      },
      loading: {
        show: vi.fn(),
        hide: vi.fn(),
      },
      dialog: vi.fn(),
      bottomSheet: vi.fn(),
    })),
    Notify: {
      create: vi.fn(),
    },
    Loading: {
      show: vi.fn(),
      hide: vi.fn(),
    },
    QSpinnerDots: { template: '<div></div>' },
  }
})

// Mock Quasar components globally to avoid 'Quasar not installed' errors in shallowMount
config.global.stubs = {
  'q-btn': { template: '<button><slot /></button>' },
  'q-icon': { template: '<i></i>' },
  'q-avatar': { template: '<div><slot /></div>' },
  'q-badge': { template: '<span><slot /></span>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-separator': { template: '<hr />' },
  'q-img': { template: '<div><slot /></div>' },
  'q-input': { template: '<input />', props: ['modelValue'] },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-select': { 
    template: '<select><slot /></select>',
    props: ['modelValue', 'options', 'optionValue', 'optionLabel']
  },
  'q-page': { template: '<div><slot /></div>' },
  'q-spinner': { template: '<div></div>' },
  'q-spinner-dots': { template: '<div></div>' },
  'q-stepper': { template: '<div><slot /></div>' },
  'q-step': { template: '<div><slot /></div>' },
  'q-stepper-navigation': { template: '<div><slot /></div>' },
  'q-file': { template: '<input type="file" />' },
  'q-banner': { template: '<div><slot /></div>' },
  'q-slider': { template: '<input type="range" />' },
  'q-tabs': { template: '<div><slot /></div>' },
  'q-tab': { template: '<div><slot /></div>' },
  'q-tab-panels': { template: '<div><slot /></div>' },
  'q-tab-panel': { template: '<div><slot /></div>' },
  'q-chip': { template: '<span><slot /></span>' },
  'q-tooltip': { template: '<div><slot /></div>' },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-space': { template: '<div></div>' },
  'q-form': { template: '<form><slot /></form>' },
  'q-expansion-item': { template: '<div><slot /></div>' },
  'router-link': { template: '<a><slot /></a>' },
  'router-view': { template: '<div></div>' },
  transition: { template: '<div><slot /></div>' },
}

// Create and set active Pinia for all tests
const pinia = createPinia()
setActivePinia(pinia)
config.global.plugins = [pinia]
