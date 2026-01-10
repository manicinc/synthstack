<template>
  <section
    class="admin-section"
    aria-labelledby="admin-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="admin-title">
          {{ t('landing.admin.title') }}
        </h2>
        <p>{{ t('landing.admin.subtitle') }}</p>
      </header>

      <!-- 3D Admin Interface Preview -->
      <div class="admin-3d-wrapper">
        <!-- Floating particles background -->
        <div class="admin-particles">
          <div
            v-for="i in 20"
            :key="i"
            class="particle"
            :style="particleStyle(i)"
          />
        </div>

        <!-- Glow orbs -->
        <div class="admin-glow-orb orb-1" />
        <div class="admin-glow-orb orb-2" />

        <!-- Main 3D Interface -->
        <div class="admin-3d-scene">
          <div
            class="admin-interface"
            :class="{ 'tab-active': activeAdminTab }"
          >
            <!-- Browser chrome -->
            <div class="interface-chrome">
              <div class="chrome-dots">
                <span class="dot" />
                <span class="dot" />
                <span class="dot" />
              </div>
              <div class="chrome-url">
                <q-icon
                  name="lock"
                  size="12px"
                />
                <span>admin.synthstack.io</span>
              </div>
              <div class="chrome-actions">
                <q-icon
                  name="refresh"
                  size="14px"
                />
                <q-icon
                  name="more_vert"
                  size="14px"
                />
              </div>
            </div>

            <!-- Tab navigation -->
            <div
              class="interface-tabs"
              role="tablist"
              aria-label="Admin interface tabs"
            >
              <button
                v-for="tab in adminTabs"
                :key="tab.id"
                class="tab-btn"
                :class="{ active: activeAdminTab === tab.id }"
                :aria-label="`${tab.label} tab`"
                :aria-current="activeAdminTab === tab.id ? 'page' : undefined"
                role="tab"
                :aria-selected="activeAdminTab === tab.id"
                @click="activeAdminTab = tab.id"
              >
                <q-icon
                  :name="tab.icon"
                  size="16px"
                  aria-hidden="true"
                />
                <span>{{ tab.label }}</span>
              </button>
            </div>

            <!-- Interface content -->
            <div class="interface-body">
              <!-- Sidebar -->
              <AdminSidebar
                :active-item="activeSidebarItem"
                @update:active-item="activeSidebarItem = $event"
              />

              <!-- Main content area - changes based on tab -->
              <div class="interface-main">
                <AdminDashboardTab v-if="activeAdminTab === 'dashboard'" />
                <AdminContentTab v-if="activeAdminTab === 'content'" />
                <AdminUsersTab v-if="activeAdminTab === 'users'" />
                <AdminAnalyticsTab v-if="activeAdminTab === 'analytics'" />
                <AdminLLMCostsTab v-if="activeAdminTab === 'llm-costs'" />
                <AdminSettingsTab v-if="activeAdminTab === 'settings'" />
              </div>
            </div>
          </div>

          <!-- Floating feature labels -->
          <div class="feature-labels">
            <div class="feature-label label-1">
              <q-icon
                name="payments"
                size="16px"
              />
              <span>LLM Cost Tracking</span>
            </div>
            <div class="feature-label label-2">
              <q-icon
                name="insights"
                size="16px"
              />
              <span>Real-time Analytics</span>
            </div>
            <div class="feature-label label-3">
              <q-icon
                name="notifications_active"
                size="16px"
              />
              <span>Budget Alerts</span>
            </div>
            <div class="feature-label label-4">
              <q-icon
                name="api"
                size="16px"
              />
              <span>Multi-Provider AI</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="admin-cta">
        <a
          :href="adminUrl"
          target="_blank"
          class="admin-demo-btn"
        >
          <q-icon
            name="open_in_new"
            size="18px"
          />
          Try Live Admin Demo
        </a>
        <router-link
          to="/docs"
          class="admin-docs-btn"
        >
          <q-icon
            name="menu_book"
            size="18px"
          />
          View Documentation
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBranding } from '@/composables/useBranding'
import AdminSidebar from './admin/AdminSidebar.vue'
import AdminDashboardTab from './admin/AdminDashboardTab.vue'
import AdminContentTab from './admin/AdminContentTab.vue'
import AdminUsersTab from './admin/AdminUsersTab.vue'
import AdminAnalyticsTab from './admin/AdminAnalyticsTab.vue'
import AdminSettingsTab from './admin/AdminSettingsTab.vue'
import AdminLLMCostsTab from './admin/AdminLLMCostsTab.vue'

const { t } = useI18n()
const { demo } = useBranding()

const adminUrl = demo.adminUrl

const activeAdminTab = ref('dashboard')
const activeSidebarItem = ref('dashboard')

const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'content', label: 'Content', icon: 'article' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'analytics', label: 'Analytics', icon: 'insights' },
  { id: 'llm-costs', label: 'LLM Costs', icon: 'payments' },
  { id: 'settings', label: 'Settings', icon: 'tune' }
]

// Generate random particle positions on mount
const particlePositions = Array.from({ length: 20 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100
}))

function particleStyle(index: number) {
  return {
    '--delay': `${index * 0.3}s`,
    '--x': `${particlePositions[index - 1]?.x || 0}%`,
    '--y': `${particlePositions[index - 1]?.y || 0}%`
  }
}
</script>

<style lang="scss" scoped>
.admin-section {
  padding: 100px 24px;
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(99, 102, 241, 0.03) 50%,
    var(--bg-base) 100%
  );
  overflow: hidden;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
  }

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
}

// 3D Wrapper with perspective
.admin-3d-wrapper {
  position: relative;
  max-width: 1100px;
  margin: 0 auto 60px;
  perspective: 1200px;
}

// Floating particles
.admin-particles {
  position: absolute;
  inset: -50px;
  pointer-events: none;
  overflow: hidden;

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: rgba(99, 102, 241, 0.6);
    border-radius: 50%;
    left: var(--x);
    top: var(--y);
    animation: float-particle 8s ease-in-out infinite;
    animation-delay: var(--delay);
  }
}

@keyframes float-particle {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
  50% { transform: translateY(-30px) scale(1.5); opacity: 1; }
}

// Glow orbs
.admin-glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;

  &.orb-1 {
    width: 300px;
    height: 300px;
    background: rgba(99, 102, 241, 0.3);
    top: -100px;
    left: -100px;
    animation: pulse-orb 6s ease-in-out infinite;
  }

  &.orb-2 {
    width: 250px;
    height: 250px;
    background: rgba(139, 92, 246, 0.25);
    bottom: -100px;
    right: -100px;
    animation: pulse-orb 6s ease-in-out infinite reverse;
  }
}

@keyframes pulse-orb {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

// 3D Scene container
.admin-3d-scene {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(2deg) rotateY(-3deg);
  transition: transform 0.5s ease;

  &:hover {
    transform: rotateX(0deg) rotateY(0deg);
  }
}

// Main interface container
.admin-interface {
  background: linear-gradient(145deg, #0c0f1a 0%, #0f172a 100%);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 50px 100px -20px rgba(0, 0, 0, 0.7),
    0 30px 60px -30px rgba(99, 102, 241, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transform: translateZ(20px);
}

// Browser chrome
.interface-chrome {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1e293b 0%, #172033 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.chrome-dots {
  display: flex;
  gap: 8px;

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;

    &:nth-child(1) { background: #ef4444; }
    &:nth-child(2) { background: #eab308; }
    &:nth-child(3) { background: #22c55e; }
  }
}

.chrome-url {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 16px;
  border-radius: 6px;
  margin: 0 40px;

  .q-icon { color: #22c55e; }
}

.chrome-actions {
  display: flex;
  gap: 12px;
  color: #94a3b8;
}

// Tab navigation
.interface-tabs {
  display: flex;
  gap: 2px;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.03);
  }

  &.active {
    color: #fb923c;
    background: rgba(234, 88, 12, 0.08);
    border-bottom-color: #ea580c;
  }
}

// Interface body
.interface-body {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 400px;
}

// Main content area
.interface-main {
  padding: 20px;
  background: #0a0e1a;
}

// Floating feature labels
.feature-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.feature-label {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(234, 88, 12, 0.3);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #e2e8f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  transform: translateZ(40px);
  animation: float-label 4s ease-in-out infinite;

  .q-icon { color: #fb923c; }

  &.label-1 {
    top: 20%;
    left: -60px;
    animation-delay: 0s;
  }

  &.label-2 {
    top: 50%;
    right: -80px;
    animation-delay: 1s;
  }

  &.label-3 {
    bottom: 30%;
    left: -70px;
    animation-delay: 2s;
  }

  &.label-4 {
    bottom: 15%;
    right: -60px;
    animation-delay: 3s;
  }
}

@keyframes float-label {
  0%, 100% { transform: translateZ(40px) translateY(0); }
  50% { transform: translateZ(40px) translateY(-8px); }
}

// CTA Buttons
.admin-cta {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-demo-btn,
.admin-docs-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.3s ease;
}

.admin-demo-btn {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgba(234, 88, 12, 0.4);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(234, 88, 12, 0.5);
  }
}

.admin-docs-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
  }
}

// Mobile responsive
@media (max-width: 900px) {
  .admin-3d-wrapper {
    perspective: none;
    margin: 0 auto 40px;
  }

  .admin-3d-scene {
    transform: none;

    &:hover { transform: none; }
  }

  .admin-interface {
    transform: none;
  }

  .feature-labels {
    display: none;
  }

  .admin-glow-orb {
    opacity: 0.3;
  }

  .interface-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { display: none; }
  }

  .tab-btn {
    padding: 10px 14px;
    font-size: 0.8rem;
    white-space: nowrap;

    span { display: none; }
  }

  .interface-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .admin-section {
    padding: 60px 16px;
  }

  .chrome-url {
    display: none;
  }
}

// Light mode overrides
:global(.body--light) .admin-section {
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(13, 148, 136, 0.05) 50%, var(--bg-base) 100%) !important;
}

:global(.body--light) .admin-section .section-header h2 {
  color: var(--text-primary) !important;
}

:global(.body--light) .admin-section .section-header p {
  color: var(--text-secondary) !important;
}

:global(.body--light) .admin-docs-btn {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-default) !important;
}

:global(.body--light) .admin-docs-btn:hover {
  background: rgba(0, 0, 0, 0.08) !important;
}
</style>

