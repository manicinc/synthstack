<template>
  <div class="tab-content content-content">
    <div class="content-header">
      <h3>Content Manager</h3>
      <button class="btn-primary">
        <q-icon
          name="add"
          size="16px"
        /> New Post
      </button>
    </div>
    <div class="content-list">
      <div
        v-for="item in contentItems"
        :key="item.id"
        class="content-item"
      >
        <div
          class="item-status"
          :class="item.status"
        />
        <div class="item-info">
          <span class="item-title">{{ item.title }}</span>
          <span class="item-meta">{{ item.type }} &bull; {{ item.date }}</span>
        </div>
        <div class="item-actions">
          <q-icon
            name="edit"
            size="16px"
          />
          <q-icon
            name="visibility"
            size="16px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const contentItems = [
  { id: 1, title: 'Getting Started with SynthStack', type: 'Blog', date: 'Dec 15', status: 'published' },
  { id: 2, title: 'AI Agent Configuration Guide', type: 'Docs', date: 'Dec 14', status: 'published' },
  { id: 3, title: 'New Feature: Multi-tenant Support', type: 'Blog', date: 'Dec 13', status: 'draft' },
  { id: 4, title: 'API Reference v2.0', type: 'Docs', date: 'Dec 12', status: 'published' }
]
</script>

<style lang="scss" scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(234, 88, 12, 0.4);
  }
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(234, 88, 12, 0.3);
  }
}

.item-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.published { background: #22c55e; }
  &.draft { background: #eab308; }
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

.item-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.item-actions {
  display: flex;
  gap: 12px;

  .q-icon {
    color: #64748b;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover { color: #fb923c; }
  }
}
</style>


