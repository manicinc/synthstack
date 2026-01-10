<template>
  <div class="tab-content users-content">
    <div class="content-header">
      <h3>User Management</h3>
      <button class="btn-primary">
        <q-icon
          name="person_add"
          size="16px"
        /> Invite
      </button>
    </div>
    <div class="users-table">
      <div class="table-header">
        <span>User</span>
        <span>Role</span>
        <span>Status</span>
        <span>Plan</span>
      </div>
      <div
        v-for="user in usersList"
        :key="user.id"
        class="table-row"
      >
        <div class="user-cell">
          <div
            class="user-avatar-sm"
            :style="{ background: user.color }"
          >
            {{ user.initials }}
          </div>
          <span>{{ user.name }}</span>
        </div>
        <span class="role-badge">{{ user.role }}</span>
        <span
          class="status-dot"
          :class="user.status"
        />
        <span
          class="plan-badge"
          :class="user.plan"
        >{{ user.plan }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const usersList = [
  { id: 1, name: 'Sarah Chen', initials: 'SC', color: '#6366f1', role: 'Admin', status: 'online', plan: 'pro' },
  { id: 2, name: 'Mike Johnson', initials: 'MJ', color: '#22c55e', role: 'Editor', status: 'online', plan: 'pro' },
  { id: 3, name: 'Alex Rivera', initials: 'AR', color: '#f59e0b', role: 'Viewer', status: 'offline', plan: 'free' },
  { id: 4, name: 'Emma Wilson', initials: 'EW', color: '#ec4899', role: 'Editor', status: 'online', plan: 'team' }
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

.users-table {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 0.5fr 1fr;
  gap: 16px;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  span {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 0.5fr 1fr;
  gap: 16px;
  padding: 14px 18px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease;

  &:last-child { border-bottom: none; }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    font-size: 0.9rem;
    font-weight: 500;
    color: #e2e8f0;
  }
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.role-badge {
  font-size: 0.8rem;
  color: #94a3b8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.online { background: #22c55e; }
  &.offline { background: #64748b; }
}

.plan-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: capitalize;

  &.pro {
    background: rgba(99, 102, 241, 0.2);
    color: #818cf8;
  }

  &.team {
    background: rgba(234, 88, 12, 0.2);
    color: #fb923c;
  }

  &.free {
    background: rgba(100, 116, 139, 0.2);
    color: #94a3b8;
  }
}

@media (max-width: 600px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .table-header span:nth-child(3),
  .table-header span:nth-child(4),
  .table-row .status-dot,
  .table-row .plan-badge {
    display: none;
  }
}
</style>


