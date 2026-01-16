<template>
  <q-card
    class="model-card"
    flat
    bordered
  >
    <!-- Thumbnail -->
    <div
      class="card-thumbnail"
      @click="goToModel"
    >
      <img
        v-if="model.thumbnail"
        :src="model.thumbnail"
        :alt="model.title"
      >
      <div
        v-else
        class="placeholder-thumb"
      >
        <q-icon
          name="view_in_ar"
          size="48px"
        />
      </div>
      <div class="card-badges">
        <q-badge
          :color="licenseColor"
          :label="model.license?.toUpperCase()"
        />
        <q-badge
          v-if="model.featured"
          color="warning"
          icon="star"
          label="Featured"
        />
      </div>
    </div>

    <!-- Content -->
    <q-card-section class="card-content">
      <h4
        class="card-title"
        @click="goToModel"
      >
        {{ model.title }}
      </h4>
      <div class="card-creator">
        <router-link :to="`/community/creators/${model.creatorId}`">
          {{ model.creator }}
        </router-link>
      </div>
      
      <div class="card-meta">
        <span
          class="material-badge"
          :class="model.material?.toLowerCase()"
        >
          {{ model.material }}
        </span>
      </div>
    </q-card-section>

    <!-- Stats & Actions -->
    <q-card-section class="card-stats">
      <div class="stat-row">
        <button 
          class="vote-btn" 
          :class="{ voted: hasVoted }"
          @click="toggleVote"
        >
          <q-icon :name="hasVoted ? 'thumb_up' : 'thumb_up_off_alt'" />
          <span>{{ model.votes }}</span>
        </button>
        
        <div class="stat">
          <q-icon name="download" />
          <span>{{ formatNumber(model.downloads) }}</span>
        </div>
        
        <div class="stat">
          <q-icon name="chat_bubble_outline" />
          <span>{{ model.comments || 0 }}</span>
        </div>
      </div>
    </q-card-section>

    <!-- Actions -->
    <q-card-actions class="card-actions">
      <q-btn
        flat
        color="primary"
        label="View"
        icon="visibility"
        @click="goToModel"
      />
      <q-btn
        flat
        color="primary"
        label="Download"
        icon="download"
        @click="handleDownload"
      />
      <q-btn
        flat
        round
        icon="more_vert"
      >
        <q-menu>
          <q-list dense>
            <q-item
              v-close-popup
              clickable
              @click="shareModel"
            >
              <q-item-section avatar>
                <q-icon name="share" />
              </q-item-section>
              <q-item-section>Share</q-item-section>
            </q-item>
            <q-item
              v-close-popup
              clickable
              @click="reportModel"
            >
              <q-item-section avatar>
                <q-icon name="flag" />
              </q-item-section>
              <q-item-section>Report</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

interface Model {
  id: string
  title: string
  creator: string
  creatorId?: string
  votes: number
  downloads: number
  comments?: number
  thumbnail?: string
  license?: string
  material?: string
  featured?: boolean
}

const props = defineProps<{
  model: Model
}>()

const emit = defineEmits<{
  (e: 'vote', id: string): void
  (e: 'download', id: string): void
}>()

const router = useRouter()
const $q = useQuasar()

const hasVoted = ref(false)

const licenseColor = computed(() => {
  const colors: Record<string, string> = {
    'cc-by': 'green',
    'cc-by-sa': 'teal',
    'cc-by-nc': 'orange',
    'cc-by-nc-sa': 'deep-orange',
    'cc0': 'blue',
    'gpl': 'purple'
  }
  return colors[props.model.license || ''] || 'grey'
})

function formatNumber(num: number) {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function goToModel() {
  router.push(`/community/models/${props.model.id}`)
}

function toggleVote() {
  hasVoted.value = !hasVoted.value
  if (hasVoted.value) {
    emit('vote', props.model.id)
  }
}

function handleDownload() {
  emit('download', props.model.id)
  $q.notify({ message: 'Download started!', position: 'bottom-right' })
}

function shareModel() {
  const url = `${window.location.origin}/community/models/${props.model.id}`
  navigator.clipboard.writeText(url)
  $q.notify({ type: 'positive', message: 'Link copied!', position: 'bottom-right' })
}

function reportModel() {
  $q.dialog({
    title: 'Report Model',
    message: 'Why are you reporting this model?',
    options: {
      type: 'radio',
      model: 'spam',
      items: [
        { label: 'Spam or misleading', value: 'spam' },
        { label: 'Inappropriate content', value: 'inappropriate' },
        { label: 'Copyright violation', value: 'copyright' },
        { label: 'Other', value: 'other' }
      ]
    },
    cancel: true
  }).onOk((_reason: string) => {
    $q.notify({ type: 'positive', message: 'Report submitted. Thank you!', position: 'bottom-right' })
  })
}
</script>

<style lang="scss" scoped>
.model-card {
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
}

.card-thumbnail {
  position: relative;
  aspect-ratio: 4/3;
  background: var(--color-bg-tertiary);
  cursor: pointer;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .placeholder-thumb {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
  }
  
  .card-badges {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    gap: 8px;
  }
}

.card-content {
  padding: 16px 16px 8px;
}

.card-title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  
  &:hover { color: var(--q-primary); }
}

.card-creator {
  font-size: 0.85rem;
  margin-bottom: 8px;
  
  a {
    color: var(--color-text-secondary);
    text-decoration: none;
    
    &:hover { color: var(--q-primary); }
  }
}

.card-meta {
  .material-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--color-bg-tertiary);
    
    &.pla { color: #10b981; }
    &.petg { color: #f97316; }
    &.abs { color: #ef4444; }
    &.tpu { color: #8b5cf6; }
  }
}

.card-stats {
  padding: 8px 16px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);
  
  &:hover {
    border-color: var(--q-primary);
    color: var(--q-primary);
  }
  
  &.voted {
    background: var(--q-primary);
    border-color: var(--q-primary);
    color: white;
  }
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.card-actions {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-border);
}
</style>

