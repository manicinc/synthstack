<!--
  @component ProfileDetailPage (Public)
  @description Public-facing profile detail page.
-->
<template>
  <q-page class="profile-detail-page">
    <div
      v-if="profile"
      class="container"
    >
      <router-link
        to="/profiles"
        class="back-link"
      >
        <q-icon name="sym_o_arrow_back" /> Back to Profiles
      </router-link>
      
      <div class="profile-header">
        <div class="profile-info">
          <h1>{{ profile.name }}</h1>
          <p class="description">
            {{ profile.description }}
          </p>
          <div class="meta">
            <span class="tag">{{ profile.slicer }}</span>
            <span class="tag">{{ profile.printer }}</span>
            <span class="tag">{{ profile.filament }}</span>
          </div>
          <div class="stats">
            <span><q-icon name="sym_o_download" /> {{ profile.downloads }} downloads</span>
            <span><q-icon name="sym_o_thumb_up" /> {{ profile.votes }} votes</span>
          </div>
        </div>
        <div class="profile-actions">
          <q-btn
            label="Download Profile"
            color="accent"
            unelevated
            size="lg"
            icon="sym_o_download"
          />
          <q-btn
            label="Use as Template"
            outline
            icon="sym_o_copy_all"
            to="/app/generate"
          />
        </div>
      </div>

      <section class="settings-section">
        <h2>Profile Settings</h2>
        <div class="settings-grid">
          <div class="setting-group">
            <h3>Quality</h3>
            <dl>
              <dt>Layer Height</dt><dd>0.2mm</dd>
              <dt>Wall Count</dt><dd>3</dd>
              <dt>Infill</dt><dd>20% Gyroid</dd>
            </dl>
          </div>
          <div class="setting-group">
            <h3>Speed</h3>
            <dl>
              <dt>Print Speed</dt><dd>60mm/s</dd>
              <dt>Travel Speed</dt><dd>150mm/s</dd>
              <dt>First Layer</dt><dd>30mm/s</dd>
            </dl>
          </div>
          <div class="setting-group">
            <h3>Temperature</h3>
            <dl>
              <dt>Nozzle</dt><dd>210°C</dd>
              <dt>Bed</dt><dd>60°C</dd>
              <dt>Chamber</dt><dd>N/A</dd>
            </dl>
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()
const { setPageSeo } = useSeo()

const profile = ref<{ name: string; description: string; slicer: string; printer: string; filament: string; downloads: string; votes: number } | null>(null)

onMounted(() => {
  const id = route.params.id
  profile.value = {
    name: 'Sample Profile',
    description: 'A great profile for quality prints',
    slicer: 'Cura',
    printer: 'Ender 3',
    filament: 'PLA',
    downloads: '5.2K',
    votes: 128
  }
  
  setPageSeo({
    title: `${profile.value.name} - Slicer Profile | SynthStack`,
    description: profile.value.description,
    canonicalPath: `/profiles/${id}`,
    breadcrumbs: [{ name: 'Home', url: '/' }, { name: 'Profiles', url: '/profiles' }, { name: profile.value.name, url: `/profiles/${id}` }]
  })
})
</script>

<style lang="scss" scoped>
.profile-detail-page { background: var(--bg-primary); padding: var(--space-2xl) 0; }
.container { max-width: 1000px; margin: 0 auto; padding: 0 var(--space-md); }

.back-link { display: inline-flex; align-items: center; gap: var(--space-xs); color: var(--text-secondary); text-decoration: none; margin-bottom: var(--space-xl); &:hover { color: var(--color-accent); } }

.profile-header { display: flex; justify-content: space-between; gap: var(--space-2xl); margin-bottom: var(--space-3xl); padding: var(--space-2xl); background: var(--bg-secondary); border-radius: var(--radius-xl); @media (max-width: 768px) { flex-direction: column; } h1 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: var(--space-sm); } .description { color: var(--text-secondary); margin-bottom: var(--space-md); } .meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md); .tag { padding: var(--space-xs) var(--space-sm); background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: var(--text-sm); } } .stats { display: flex; gap: var(--space-lg); color: var(--text-muted); font-size: var(--text-sm); span { display: flex; align-items: center; gap: var(--space-xs); } } .profile-actions { display: flex; flex-direction: column; gap: var(--space-sm); } }

.settings-section { h2 { font-family: var(--font-display); margin-bottom: var(--space-xl); } }
.settings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); @media (max-width: 768px) { grid-template-columns: 1fr; } }
.setting-group { padding: var(--space-lg); background: var(--bg-secondary); border-radius: var(--radius-lg); h3 { font-family: var(--font-display); font-size: var(--text-base); margin-bottom: var(--space-md); color: var(--color-accent); } dl { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); dt { color: var(--text-muted); font-size: var(--text-sm); } dd { color: var(--text-primary); font-weight: 500; margin: 0; } } }
</style>





