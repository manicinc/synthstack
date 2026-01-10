<template>
  <q-page class="my-uploads-page">
    <div class="page-container">
      <div class="page-header">
        <h1>My Uploads</h1>
        <q-btn
          color="primary"
          icon="add"
          label="Upload New Model"
          to="/community/upload"
        />
      </div>

      <q-tabs
        v-model="activeTab"
        align="left"
        class="status-tabs"
      >
        <q-tab
          name="all"
          label="All"
        />
        <q-tab
          name="pending"
          :label="`Pending (${pendingCount})`"
        />
        <q-tab
          name="approved"
          label="Approved"
        />
        <q-tab
          name="rejected"
          label="Rejected"
        />
      </q-tabs>

      <div
        v-if="filteredUploads.length === 0"
        class="empty-state"
      >
        <q-icon
          name="cloud_upload"
          size="64px"
        />
        <h3>No uploads yet</h3>
        <p>Share your first model with the community!</p>
        <q-btn
          color="primary"
          label="Upload Model"
          to="/community/upload"
        />
      </div>

      <div
        v-else
        class="uploads-list"
      >
        <div
          v-for="upload in filteredUploads"
          :key="upload.id"
          class="upload-item"
        >
          <div class="upload-thumb" />
          <div class="upload-info">
            <h4>{{ upload.title }}</h4>
            <p class="upload-meta">
              Uploaded {{ upload.createdAt }}
            </p>
            <div
              v-if="upload.status === 'approved'"
              class="upload-stats"
            >
              <span><q-icon name="thumb_up" /> {{ upload.votes }}</span>
              <span><q-icon name="download" /> {{ upload.downloads }}</span>
            </div>
          </div>
          <div class="upload-status">
            <q-badge 
              :color="statusColor(upload.status)" 
              :label="upload.status.charAt(0).toUpperCase() + upload.status.slice(1)" 
            />
          </div>
          <div class="upload-actions">
            <q-btn
              flat
              icon="visibility"
              @click="viewUpload(upload)"
            />
            <q-btn
              v-if="upload.status === 'approved'"
              flat
              icon="edit"
              @click="editUpload(upload)"
            />
            <q-btn
              flat
              icon="delete"
              color="negative"
              @click="deleteUpload(upload)"
            />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const activeTab = ref('all')

const uploads = ref([
  { id: '1', title: 'Universal Phone Stand', status: 'approved', createdAt: '3 days ago', votes: 234, downloads: 1520 },
  { id: '2', title: 'Cable Management Clip', status: 'pending', createdAt: '1 hour ago', votes: 0, downloads: 0 },
  { id: '3', title: 'Headphone Hook', status: 'approved', createdAt: '1 week ago', votes: 98, downloads: 567 }
])

const pendingCount = computed(() => uploads.value.filter(u => u.status === 'pending').length)

const filteredUploads = computed(() => {
  if (activeTab.value === 'all') return uploads.value
  return uploads.value.filter(u => u.status === activeTab.value)
})

function statusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'positive',
    rejected: 'negative'
  }
  return colors[status] || 'grey'
}

function viewUpload(upload: any) {
  router.push(`/community/models/${upload.id}`)
}

function editUpload(upload: any) {
  $q.notify({ message: 'Edit functionality coming soon' })
}

function deleteUpload(upload: any) {
  $q.dialog({
    title: 'Delete Upload',
    message: `Are you sure you want to delete "${upload.title}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    const idx = uploads.value.findIndex(u => u.id === upload.id)
    if (idx !== -1) uploads.value.splice(idx, 1)
    $q.notify({ type: 'positive', message: 'Upload deleted' })
  })
}
</script>

<style lang="scss" scoped>
.my-uploads-page {
  padding: 40px 24px 80px;
}

.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h1 { margin: 0; }
}

.status-tabs {
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  
  h3 { margin: 16px 0 8px; }
  p { color: var(--color-text-secondary); margin: 0 0 24px; }
}

.uploads-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  
  .upload-thumb {
    width: 80px;
    height: 60px;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
    flex-shrink: 0;
  }
  
  .upload-info {
    flex: 1;
    
    h4 { margin: 0 0 4px; }
    .upload-meta { margin: 0 0 8px; font-size: 0.85rem; color: var(--color-text-muted); }
    .upload-stats {
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      
      span { display: flex; align-items: center; gap: 4px; }
    }
  }
  
  .upload-actions {
    display: flex;
    gap: 4px;
  }
}
</style>




