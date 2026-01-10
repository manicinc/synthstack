<template>
  <q-page class="my-profiles-page">
    <div class="page-header">
      <div class="header-content">
        <h1>My Profiles</h1>
        <p>Manage your generated and saved print profiles</p>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="New Profile"
        to="/app/generate"
      />
    </div>

    <!-- Tabs -->
    <q-tabs
      v-model="tab"
      class="profiles-tabs"
      align="left"
    >
      <q-tab
        name="generated"
        label="Generated"
      />
      <q-tab
        name="saved"
        label="Saved"
      />
      <q-tab
        name="shared"
        label="Shared"
      />
    </q-tabs>

    <q-tab-panels
      v-model="tab"
      animated
    >
      <!-- Generated Profiles -->
      <q-tab-panel name="generated">
        <div class="profiles-list">
          <q-card
            v-for="profile in generatedProfiles"
            :key="profile.id"
            class="profile-item hover-lift"
          >
            <q-card-section horizontal>
              <q-card-section class="profile-icon">
                <q-icon
                  name="description"
                  size="40px"
                  color="primary"
                />
              </q-card-section>
              <q-card-section>
                <div class="profile-name">
                  {{ profile.name }}
                </div>
                <div class="profile-meta">
                  <q-chip size="sm">
                    {{ profile.material }}
                  </q-chip>
                  <q-chip
                    size="sm"
                    outline
                  >
                    {{ profile.printer }}
                  </q-chip>
                </div>
                <div class="profile-date">
                  Created {{ profile.created }}
                </div>
              </q-card-section>
              <q-space />
              <q-card-actions vertical>
                <q-btn
                  flat
                  round
                  icon="download"
                  color="primary"
                />
                <q-btn
                  flat
                  round
                  icon="share"
                />
                <q-btn
                  flat
                  round
                  icon="delete"
                  color="negative"
                />
              </q-card-actions>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <!-- Saved Profiles -->
      <q-tab-panel name="saved">
        <div class="profiles-list">
          <q-card
            v-for="profile in savedProfiles"
            :key="profile.id"
            class="profile-item hover-lift"
          >
            <q-card-section horizontal>
              <q-card-section class="profile-icon">
                <q-icon
                  name="bookmark"
                  size="40px"
                  color="secondary"
                />
              </q-card-section>
              <q-card-section>
                <div class="profile-name">
                  {{ profile.name }}
                </div>
                <div class="profile-author">
                  by {{ profile.author }}
                </div>
                <div class="profile-meta">
                  <q-chip size="sm">
                    {{ profile.material }}
                  </q-chip>
                </div>
              </q-card-section>
              <q-space />
              <q-card-actions vertical>
                <q-btn
                  flat
                  round
                  icon="download"
                  color="primary"
                />
                <q-btn
                  flat
                  round
                  icon="bookmark_remove"
                />
              </q-card-actions>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <!-- Shared Profiles -->
      <q-tab-panel name="shared">
        <div class="profiles-list">
          <q-card
            v-for="profile in sharedProfiles"
            :key="profile.id"
            class="profile-item hover-lift"
          >
            <q-card-section horizontal>
              <q-card-section class="profile-icon">
                <q-icon
                  name="share"
                  size="40px"
                  color="positive"
                />
              </q-card-section>
              <q-card-section>
                <div class="profile-name">
                  {{ profile.name }}
                </div>
                <div class="profile-stats">
                  <span><q-icon
                    name="download"
                    size="14px"
                  /> {{ profile.downloads }}</span>
                  <span><q-icon
                    name="thumb_up"
                    size="14px"
                  /> {{ profile.likes }}</span>
                </div>
              </q-card-section>
              <q-space />
              <q-card-actions vertical>
                <q-btn
                  flat
                  round
                  icon="edit"
                  color="primary"
                />
                <q-btn
                  flat
                  round
                  icon="visibility_off"
                />
              </q-card-actions>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('generated')

const generatedProfiles = ref([
  { id: '1', name: 'High Quality PLA', material: 'PLA', printer: 'Prusa MK4', created: '2 hours ago' },
  { id: '2', name: 'Speed PETG', material: 'PETG', printer: 'Bambu X1C', created: '1 day ago' },
  { id: '3', name: 'Functional Parts ABS', material: 'ABS', printer: 'Voron 2.4', created: '3 days ago' }
])

const savedProfiles = ref([
  { id: '1', name: 'Ultra Detail Minis', author: 'MiniPainter', material: 'PLA' },
  { id: '2', name: 'Fast Draft', author: 'SpeedPrinter', material: 'PLA' }
])

const sharedProfiles = ref([
  { id: '1', name: 'My PLA Settings', downloads: 156, likes: 42 },
  { id: '2', name: 'PETG Engineering', downloads: 89, likes: 28 }
])
</script>

<style lang="scss" scoped>
.my-profiles-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
  }
}

.profiles-tabs {
  margin-bottom: 24px;
}

.profiles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-item {
  .profile-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  
  .profile-name {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .profile-author {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  
  .profile-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .profile-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
  
  .profile-stats {
    display: flex;
    gap: 16px;
    font-size: 0.875rem;
    color: var(--text-secondary);
    
    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

@media (max-width: 600px) {
  .my-profiles-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
