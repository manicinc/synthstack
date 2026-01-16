<template>
  <div class="interface-sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">
        S
      </div>
      <span>SynthStack</span>
    </div>
    <nav class="sidebar-nav">
      <div
        v-for="item in sidebarItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: item.id === activeItem }"
        @click="$emit('update:activeItem', item.id)"
      >
        <q-icon
          :name="item.icon"
          size="18px"
        />
        <span>{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="nav-badge"
        >{{ item.badge }}</span>
      </div>
    </nav>
    <div class="sidebar-user">
      <div class="user-avatar">
        JD
      </div>
      <div class="user-info">
        <span class="user-name">John Doe</span>
        <span class="user-role">Admin</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeItem: string
}>()

defineEmits<{
  (e: 'update:activeItem', value: string): void
}>()

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'content', label: 'Content', icon: 'article', badge: '3' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
  { id: 'ai-agents', label: 'AI Agents', icon: 'smart_toy' },
  { id: 'media', label: 'Media', icon: 'image' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
]
</script>

<style lang="scss" scoped>
.interface-sidebar {
  background: linear-gradient(180deg, #131a2e 0%, #0f172a 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 20px;

  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #fff;
    font-size: 1rem;
  }

  span {
    font-weight: 700;
    font-size: 1rem;
    color: #f1f5f9;
  }
}

.sidebar-nav {
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
  }

  &.active {
    background: rgba(234, 88, 12, 0.15);
    color: #fb923c;
  }

  .nav-badge {
    margin-left: auto;
    background: #ef4444;
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
  }
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: auto;

  .user-avatar {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .user-role {
    font-size: 0.7rem;
    color: #94a3b8;
  }
}

@media (max-width: 900px) {
  .interface-sidebar {
    display: none;
  }
}
</style>


