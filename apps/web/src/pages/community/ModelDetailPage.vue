<template>
  <q-page class="model-detail-page">
    <div class="page-container">
      <div class="back-nav">
        <router-link to="/community">
          <q-icon name="arrow_back" /> Back to Community
        </router-link>
      </div>

      <div class="model-layout">
        <!-- Model Preview -->
        <div class="preview-section">
          <div class="main-preview">
            <div class="preview-placeholder">
              <q-icon
                name="view_in_ar"
                size="80px"
              />
            </div>
          </div>
          <div class="thumbnail-strip">
            <div class="thumb active" />
            <div class="thumb" />
            <div class="thumb" />
          </div>
        </div>

        <!-- Model Info -->
        <div class="info-section">
          <div class="model-header">
            <h1>{{ model.title }}</h1>
            <div class="model-meta">
              <router-link
                :to="`/community/creators/${model.creatorId}`"
                class="creator-link"
              >
                <q-avatar
                  size="32px"
                  color="primary"
                  text-color="white"
                >
                  {{ model.creator?.charAt(0) }}
                </q-avatar>
                <span>{{ model.creator }}</span>
              </router-link>
              <span class="divider">•</span>
              <span>{{ model.createdAt }}</span>
            </div>
          </div>

          <div class="model-stats">
            <button
              class="vote-btn"
              :class="{ voted: hasVoted }"
              @click="toggleVote"
            >
              <q-icon :name="hasVoted ? 'thumb_up' : 'thumb_up_off_alt'" />
              <span>{{ model.votes }}</span>
            </button>
            <div class="stat">
              <q-icon name="download" /> {{ model.downloads }}
            </div>
            <div class="stat">
              <q-icon name="chat_bubble_outline" /> {{ model.comments }}
            </div>
          </div>

          <div class="model-actions">
            <q-btn
              color="primary"
              icon="download"
              label="Download Model"
              size="lg"
              @click="download"
            />
            <q-btn
              flat
              icon="share"
              @click="share"
            />
            <q-btn
              flat
              icon="flag"
              @click="report"
            />
          </div>

          <q-tabs
            v-model="activeTab"
            align="left"
            class="info-tabs"
          >
            <q-tab
              name="details"
              label="Details"
            />
            <q-tab
              name="settings"
              label="Print Settings"
            />
            <q-tab
              name="license"
              label="License"
            />
          </q-tabs>

          <q-tab-panels
            v-model="activeTab"
            class="tab-content"
          >
            <q-tab-panel name="details">
              <p class="description">
                {{ model.description }}
              </p>
              <div class="tags">
                <q-chip
                  v-for="tag in model.tags"
                  :key="tag"
                  dense
                >
                  {{ tag }}
                </q-chip>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="settings">
              <div class="settings-grid">
                <div class="setting-item">
                  <span class="label">Material</span>
                  <span class="value">{{ model.material }}</span>
                </div>
                <div class="setting-item">
                  <span class="label">Layer Height</span>
                  <span class="value">{{ model.layerHeight }}</span>
                </div>
                <div class="setting-item">
                  <span class="label">Infill</span>
                  <span class="value">{{ model.infill }}</span>
                </div>
                <div class="setting-item">
                  <span class="label">Supports</span>
                  <span class="value">{{ model.supports }}</span>
                </div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="license">
              <div class="license-info">
                <q-icon
                  name="gavel"
                  size="32px"
                />
                <div>
                  <strong>{{ model.license }}</strong>
                  <p>{{ model.licenseDescription }}</p>
                </div>
              </div>
              <p class="copyright">
                © {{ model.copyrightYear }} {{ model.copyrightHolder }}
              </p>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h2>Comments ({{ model.comments }})</h2>
        <div class="comment-form">
          <q-input
            v-model="newComment"
            outlined
            placeholder="Add a comment..."
            type="textarea"
            rows="2"
          />
          <q-btn
            color="primary"
            label="Post"
            :disable="!newComment"
            @click="postComment"
          />
        </div>
        <div class="comments-list">
          <div
            v-for="c in comments"
            :key="c.id"
            class="comment"
          >
            <q-avatar
              size="40px"
              color="grey"
            >
              {{ c.author.charAt(0) }}
            </q-avatar>
            <div class="comment-body">
              <div class="comment-header">
                <strong>{{ c.author }}</strong>
                <span>{{ c.createdAt }}</span>
              </div>
              <p>{{ c.content }}</p>
              <div class="comment-actions">
                <button @click="likeComment(c.id)">
                  <q-icon name="thumb_up_off_alt" /> {{ c.likes }}
                </button>
                <button @click="replyTo(c)">
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useCommunityStore } from '@/stores/community'

const route = useRoute()
const $q = useQuasar()
const communityStore = useCommunityStore()

const activeTab = ref('details')
const hasVoted = ref(false)
const newComment = ref('')

const model = computed(() => communityStore.modelDetail || {
  id: route.params.id as string,
  title: 'Loading...',
  author: '',
  creator: '',
  creatorId: '',
  createdAt: '',
  description: '',
  votes: 0,
  downloads: 0,
  comments: 0,
  tags: [] as string[],
  material: '',
  layerHeight: '',
  infill: '',
  supports: '',
  license: '',
  licenseDescription: '',
  copyrightYear: '',
  copyrightHolder: ''
})

const comments = ref([
  { id: '1', author: 'Maker42', content: 'Printed this on my Prusa, came out great!', createdAt: '2 days ago', likes: 5 },
  { id: '2', author: 'TechPrint', content: 'What infill did you use?', createdAt: '1 day ago', likes: 2 }
])

function toggleVote() {
  hasVoted.value = !hasVoted.value
  if (communityStore.modelDetail) {
    communityStore.modelDetail.votes = (communityStore.modelDetail.votes || 0) + (hasVoted.value ? 1 : -1)
  }
}

function download() {
  if (communityStore.modelDetail) {
    communityStore.modelDetail.downloads = (communityStore.modelDetail.downloads || 0) + 1
  }
  $q.notify({ message: 'Download started!', position: 'bottom-right' })
}

function share() {
  navigator.clipboard.writeText(window.location.href)
  $q.notify({ type: 'positive', message: 'Link copied!', position: 'bottom-right' })
}

function report() {
  $q.dialog({
    title: 'Report Model',
    message: 'Why are you reporting this?',
    options: { type: 'radio', model: 'spam', items: [
      { label: 'Spam', value: 'spam' },
      { label: 'Copyright', value: 'copyright' },
      { label: 'Inappropriate', value: 'inappropriate' }
    ]},
    cancel: true
  }).onOk(() => $q.notify({ type: 'positive', message: 'Report submitted' }))
}

function postComment() {
  if (newComment.value) {
    comments.value.unshift({
      id: Date.now().toString(),
      author: 'You',
      content: newComment.value,
      createdAt: 'Just now',
      likes: 0
    })
    newComment.value = ''
    if (communityStore.modelDetail) {
      communityStore.modelDetail.comments = (communityStore.modelDetail.comments || 0) + 1
    }
  }
}

function likeComment(id: string) {
  const c = comments.value.find(c => c.id === id)
  if (c) c.likes++
}

function replyTo(comment: any) {
  newComment.value = `@${comment.author} `
}

onMounted(() => {
  communityStore.fetchModelById(route.params.id as string)
})
</script>

<style lang="scss" scoped>
.model-detail-page {
  padding: 40px 24px 80px;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.back-nav {
  margin-bottom: 24px;
  
  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-secondary);
    text-decoration: none;
    
    &:hover { color: var(--q-primary); }
  }
}

.model-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.preview-section {
  .main-preview {
    aspect-ratio: 4/3;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }
  
  .thumbnail-strip {
    display: flex;
    gap: 12px;
    
    .thumb {
      width: 80px;
      height: 60px;
      background: var(--color-bg-secondary);
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      
      &.active { border-color: var(--q-primary); }
    }
  }
}

.info-section {
  .model-header {
    margin-bottom: 20px;
    
    h1 { margin: 0 0 12px; font-size: 1.75rem; }
  }
  
  .model-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }
  
  .creator-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: inherit;
    text-decoration: none;
    
    &:hover { color: var(--q-primary); }
  }
}

.model-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  
  .vote-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--color-text-secondary);
    
    &:hover, &.voted {
      background: var(--q-primary);
      border-color: var(--q-primary);
      color: white;
    }
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-muted);
  }
}

.model-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.info-tabs {
  margin-bottom: 0;
}

.tab-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-top: -1px;
}

.description {
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  
  .setting-item {
    .label { display: block; font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 4px; }
    .value { font-weight: 500; }
  }
}

.license-info {
  display: flex;
  gap: 16px;
  
  strong { display: block; margin-bottom: 4px; }
  p { margin: 0; font-size: 0.9rem; color: var(--color-text-secondary); }
}

.copyright {
  margin-top: 16px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.comments-section {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  
  h2 { margin: 0 0 24px; }
}

.comment-form {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  
  > :first-child { flex: 1; }
}

.comment {
  display: flex;
  gap: 16px;
  padding: 20px 0;
  border-top: 1px solid var(--color-border);
}

.comment-body {
  flex: 1;
  
  .comment-header {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    
    span { font-size: 0.85rem; color: var(--color-text-muted); }
  }
  
  p { margin: 0 0 12px; color: var(--color-text-secondary); }
  
  .comment-actions {
    display: flex;
    gap: 16px;
    
    button {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      
      &:hover { color: var(--q-primary); }
    }
  }
}

@media (max-width: 900px) {
  .model-layout { grid-template-columns: 1fr; }
}
</style>


