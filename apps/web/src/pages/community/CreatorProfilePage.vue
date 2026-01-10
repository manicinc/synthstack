<template>
  <q-page class="creator-profile-page">
    <div class="profile-header">
      <div class="header-content">
        <div class="avatar">
          <q-icon
            name="person"
            size="48px"
          />
        </div>
        <div class="profile-info">
          <div class="name-row">
            <h1>{{ creator.name }}</h1>
            <q-icon
              v-if="creator.verified"
              name="verified"
              color="primary"
              size="24px"
            />
          </div>
          <p class="bio">
            {{ creator.bio }}
          </p>
          <div
            v-if="creator.website || creator.github"
            class="social-links"
          >
            <a
              v-if="creator.website"
              :href="creator.website"
              target="_blank"
            ><q-icon name="language" /> Website</a>
            <a
              v-if="creator.github"
              :href="`https://github.com/${creator.github}`"
              target="_blank"
            ><q-icon name="mdi-github" /> GitHub</a>
          </div>
        </div>
        <div class="profile-actions">
          <q-btn
            color="primary"
            :label="isFollowing ? 'Following' : 'Follow'"
            @click="toggleFollow"
          />
          <q-btn
            flat
            icon="share"
            @click="share"
          />
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat">
          <span class="value">{{ creator.models }}</span>
          <span class="label">Models</span>
        </div>
        <div class="stat">
          <span class="value">{{ formatNumber(creator.votes) }}</span>
          <span class="label">Votes</span>
        </div>
        <div class="stat">
          <span class="value">{{ formatNumber(creator.downloads) }}</span>
          <span class="label">Downloads</span>
        </div>
        <div class="stat">
          <span class="value">{{ creator.followers }}</span>
          <span class="label">Followers</span>
        </div>
      </div>
    </div>

    <div class="page-container">
      <q-tabs
        v-model="activeTab"
        align="left"
        class="profile-tabs"
      >
        <q-tab
          name="models"
          label="Models"
        />
        <q-tab
          name="about"
          label="About"
        />
      </q-tabs>

      <div
        v-if="activeTab === 'models'"
        class="models-grid"
      >
        <div
          v-for="model in models"
          :key="model.id"
          class="model-card"
        >
          <div class="thumb" />
          <h4>{{ model.title }}</h4>
          <div class="model-stats">
            <span><q-icon name="thumb_up" /> {{ model.votes }}</span>
            <span><q-icon name="download" /> {{ model.downloads }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="activeTab === 'about'"
        class="about-section"
      >
        <h3>About {{ creator.name }}</h3>
        <p>{{ creator.longBio || 'No bio provided.' }}</p>
        <p class="member-since">
          Member since {{ creator.joinedAt }}
        </p>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

const route = useRoute()
const $q = useQuasar()

const activeTab = ref('models')
const isFollowing = ref(false)

const creator = ref({
  id: route.params.id,
  name: 'PrintMaster3D',
  bio: 'Functional parts specialist',
  longBio: 'I design functional 3D printed parts for everyday use. Passionate about making useful items accessible to everyone through 3D printing.',
  verified: true,
  models: 45,
  votes: 1250,
  downloads: 15200,
  followers: 342,
  joinedAt: 'January 2024',
  website: 'https://example.com',
  github: 'printmaster3d'
})

const models = ref([
  { id: '1', title: 'Phone Stand', votes: 234, downloads: 1520 },
  { id: '2', title: 'Cable Clip', votes: 156, downloads: 890 },
  { id: '3', title: 'Headphone Hook', votes: 98, downloads: 567 },
  { id: '4', title: 'Pen Holder', votes: 87, downloads: 432 }
])

function formatNumber(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString()
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value
  creator.value.followers += isFollowing.value ? 1 : -1
}

function share() {
  navigator.clipboard.writeText(window.location.href)
  $q.notify({ type: 'positive', message: 'Profile link copied!', position: 'bottom-right' })
}
</script>

<style lang="scss" scoped>
.creator-profile-page {
  padding-bottom: 80px;
}

.profile-header {
  background: var(--color-bg-secondary);
  padding: 60px 24px 40px;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto 32px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  
  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    
    h1 { margin: 0; font-size: 2rem; }
  }
  
  .bio {
    color: var(--color-text-secondary);
    margin: 8px 0 12px;
  }
  
  .social-links {
    display: flex;
    gap: 16px;
    
    a {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      
      &:hover { color: var(--q-primary); }
    }
  }
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.profile-stats {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 48px;
  
  .stat {
    text-align: center;
    
    .value { display: block; font-size: 1.5rem; font-weight: 700; }
    .label { font-size: 0.85rem; color: var(--color-text-muted); }
  }
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.profile-tabs {
  margin-bottom: 32px;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}

.model-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  
  .thumb {
    aspect-ratio: 4/3;
    background: var(--color-bg-tertiary);
  }
  
  h4 { margin: 16px 16px 8px; font-size: 1rem; }
  
  .model-stats {
    display: flex;
    gap: 16px;
    padding: 0 16px 16px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    
    span { display: flex; align-items: center; gap: 4px; }
  }
}

.about-section {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
  
  h3 { margin: 0 0 16px; }
  p { color: var(--color-text-secondary); line-height: 1.7; }
  .member-since { margin-top: 24px; font-size: 0.9rem; color: var(--color-text-muted); }
}

@media (max-width: 768px) {
  .header-content { flex-direction: column; text-align: center; }
  .profile-stats { justify-content: center; }
}
</style>




