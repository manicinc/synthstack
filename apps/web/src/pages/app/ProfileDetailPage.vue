<template>
  <q-page class="profile-detail-page">
    <div class="page-header">
      <q-btn
        flat
        icon="arrow_back"
        label="Back"
        to="/app/profiles"
      />
    </div>

    <div class="profile-content">
      <div class="profile-main">
        <q-card class="profile-card">
          <q-card-section>
            <div class="profile-header">
              <div class="profile-info">
                <h1>{{ profile.name }}</h1>
                <div class="author-info">
                  <q-avatar
                    size="32px"
                    color="primary"
                    text-color="white"
                  >
                    {{ profile.author[0] }}
                  </q-avatar>
                  <span>by {{ profile.author }}</span>
                </div>
              </div>
              <div class="profile-badges">
                <q-badge :color="materialColor">
                  {{ profile.material }}
                </q-badge>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <h3>Description</h3>
            <p>{{ profile.description }}</p>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <h3>Settings</h3>
            <div class="settings-grid">
              <div
                v-for="(value, key) in profile.settings"
                :key="key"
                class="setting-item"
              >
                <span class="setting-label">{{ formatKey(key) }}</span>
                <span class="setting-value">{{ value }}</span>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <h3>Compatible With</h3>
            <div class="compatibility">
              <q-chip icon="print">
                {{ profile.printer }}
              </q-chip>
              <q-chip icon="palette">
                {{ profile.material }}
              </q-chip>
              <q-chip icon="apps">
                {{ profile.slicer }}
              </q-chip>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="profile-sidebar">
        <q-card class="actions-card">
          <q-card-section>
            <q-btn
              color="primary"
              icon="download"
              label="Download Profile"
              class="full-width"
              size="lg"
            />
            <div class="action-buttons">
              <q-btn
                outline
                icon="content_copy"
                label="Clone"
                class="full-width"
              />
              <q-btn
                outline
                icon="bookmark_border"
                label="Save"
                class="full-width"
              />
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stats-card">
          <q-card-section>
            <h4>Statistics</h4>
            <div class="stats-list">
              <div class="stat-row">
                <span class="stat-label">Downloads</span>
                <span class="stat-value">{{ profile.downloads.toLocaleString() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Likes</span>
                <span class="stat-value">{{ profile.likes.toLocaleString() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Rating</span>
                <span class="stat-value">
                  <q-icon
                    name="star"
                    color="warning"
                  />
                  {{ profile.rating }}
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Created</span>
                <span class="stat-value">{{ profile.created }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const profile = ref({
  id: '1',
  name: 'High Quality PLA',
  author: 'PrintMaster',
  material: 'PLA',
  printer: 'Prusa MK4',
  slicer: 'PrusaSlicer',
  description: 'Optimized for exceptional surface finish and detail. This profile has been tested extensively on various models and produces consistently great results. Perfect for decorative prints, miniatures, and anything where appearance matters.',
  downloads: 1250,
  likes: 342,
  rating: 4.8,
  created: 'Dec 1, 2024',
  settings: {
    layerHeight: '0.12mm',
    nozzleTemp: '210°C',
    bedTemp: '60°C',
    printSpeed: '50 mm/s',
    infill: '20%',
    wallCount: 3,
    topLayers: 5,
    bottomLayers: 5,
    retraction: '0.8mm',
    fanSpeed: '100%'
  }
})

const materialColor = computed(() => {
  const colors: Record<string, string> = {
    'PLA': 'teal',
    'PETG': 'orange',
    'ABS': 'red',
    'TPU': 'purple'
  }
  return colors[profile.value.material] || 'grey'
})

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}
</script>

<style lang="scss" scoped>
.profile-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  h1 {
    font-size: 1.75rem;
    margin-bottom: 8px;
  }
  
  .author-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }
}

h3 {
  margin-bottom: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  
  .setting-label {
    color: var(--text-secondary);
  }
  
  .setting-value {
    font-weight: 600;
  }
}

.compatibility {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions-card {
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }
}

.stats-card {
  margin-top: 24px;
  
  h4 {
    margin-bottom: 16px;
  }
}

.stats-list {
  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-default);
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .stat-label {
    color: var(--text-secondary);
  }
  
  .stat-value {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

@media (max-width: 900px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
  
  .profile-sidebar {
    order: -1;
  }
}

@media (max-width: 600px) {
  .profile-detail-page {
    padding: 16px;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
