<template>
  <q-page class="history-page">
    <div class="page-header">
      <h1>Generation History</h1>
      <p>View all your past profile generations</p>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Search history..."
        class="search-input"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-select
        v-model="dateFilter"
        :options="dateOptions"
        dense
        outlined
        emit-value
        map-options
        class="filter-select"
      />
    </div>

    <!-- Timeline -->
    <q-timeline color="primary">
      <q-timeline-entry
        v-for="item in historyItems"
        :key="item.id"
        :subtitle="item.date"
        :icon="item.icon"
        :color="item.color"
      >
        <template #title>
          <div class="timeline-title">
            {{ item.title }}
          </div>
        </template>
        
        <q-card class="timeline-card">
          <q-card-section>
            <div class="history-details">
              <div class="detail-row">
                <span class="detail-label">Printer</span>
                <span class="detail-value">{{ item.printer }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Filament</span>
                <span class="detail-value">{{ item.filament }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quality</span>
                <span class="detail-value">{{ item.quality }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Slicer</span>
                <span class="detail-value">{{ item.slicer }}</span>
              </div>
            </div>
          </q-card-section>
          <q-card-actions>
            <q-btn
              flat
              size="sm"
              icon="download"
              label="Download"
              color="primary"
            />
            <q-btn
              flat
              size="sm"
              icon="refresh"
              label="Regenerate"
            />
            <q-space />
            <q-btn
              flat
              size="sm"
              icon="delete"
              color="negative"
              @click="deleteItem(item)"
            />
          </q-card-actions>
        </q-card>
      </q-timeline-entry>
    </q-timeline>

    <!-- Empty State -->
    <div
      v-if="historyItems.length === 0"
      class="empty-state"
    >
      <q-icon
        name="history"
        size="80px"
        color="grey-5"
      />
      <h3>No history yet</h3>
      <p>Your generation history will appear here</p>
      <q-btn
        color="primary"
        label="Generate Your First Profile"
        to="/app/generate"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const search = ref('')
const dateFilter = ref('all')

const dateOptions = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

const historyItems = ref([
  {
    id: '1',
    title: 'PLA High Quality Profile',
    date: 'Today, 2:30 PM',
    icon: 'check_circle',
    color: 'positive',
    printer: 'Prusa MK4',
    filament: 'Polymaker PLA Black',
    quality: 'High (0.12mm)',
    slicer: 'PrusaSlicer'
  },
  {
    id: '2',
    title: 'PETG Functional Profile',
    date: 'Yesterday, 10:15 AM',
    icon: 'check_circle',
    color: 'positive',
    printer: 'Bambu Lab X1C',
    filament: 'Prusament PETG Orange',
    quality: 'Standard (0.20mm)',
    slicer: 'Bambu Studio'
  },
  {
    id: '3',
    title: 'TPU Flexible Profile',
    date: 'Dec 1, 2024',
    icon: 'check_circle',
    color: 'positive',
    printer: 'Ender 3 V3',
    filament: 'Overture TPU Clear',
    quality: 'Standard (0.20mm)',
    slicer: 'Cura'
  },
  {
    id: '4',
    title: 'ABS Engineering Profile',
    date: 'Nov 28, 2024',
    icon: 'warning',
    color: 'warning',
    printer: 'Voron 2.4',
    filament: 'Hatchbox ABS White',
    quality: 'Draft (0.28mm)',
    slicer: 'OrcaSlicer'
  }
])

function deleteItem(item: any) {
  $q.dialog({
    title: 'Delete History Item',
    message: `Are you sure you want to delete "${item.title}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    historyItems.value = historyItems.value.filter(h => h.id !== item.id)
    $q.notify({ type: 'positive', message: 'Item deleted' })
  })
}
</script>

<style lang="scss" scoped>
.history-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
  }
}

.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  
  .search-input {
    flex: 1;
    max-width: 400px;
  }
  
  .filter-select {
    min-width: 150px;
  }
}

.timeline-title {
  font-weight: 600;
  font-size: 1.125rem;
}

.timeline-card {
  margin-top: 8px;
}

.history-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-row {
  .detail-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  
  .detail-value {
    font-weight: 500;
  }
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  
  h3 {
    margin: 16px 0 8px;
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

@media (max-width: 600px) {
  .history-page {
    padding: 16px;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .history-details {
    grid-template-columns: 1fr;
  }
}
</style>
