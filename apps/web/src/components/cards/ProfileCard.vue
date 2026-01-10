<template>
  <q-card
    flat
    bordered
    class="profile-card bg-dark-page column full-height"
  >
    <q-img
      :src="profile.imageUrl"
      :ratio="16/9"
    >
      <div class="absolute-bottom text-subtitle2 text-center bg-transparent-gradient">
        {{ profile.name }}
      </div>
    </q-img>

    <q-card-section class="q-pt-none q-mt-sm flex-grow">
      <div class="row items-center no-wrap q-mb-sm">
        <q-avatar
          size="sm"
          class="q-mr-sm"
        >
          <img :src="profile.authorAvatar || 'https://cdn.quasar.dev/img/boy-avatar.png'">
        </q-avatar>
        <div class="text-caption text-grey-5 ellipsis">
          {{ profile.authorName }}
        </div>
      </div>
      
      <div class="row q-gutter-sm q-mb-sm">
        <q-badge
          v-if="profile.tags.includes('pla')"
          color="primary"
          outline
          label="PLA"
        />
        <q-badge
          v-if="profile.tags.includes('speed')"
          color="secondary"
          outline
          label="Speed"
        />
      </div>

      <div class="text-caption text-grey-6 ellipsis-2-lines">
        {{ profile.description }}
      </div>
    </q-card-section>

    <q-separator dark />

    <q-card-actions class="row justify-between items-center">
      <div class="row items-center q-gutter-x-sm">
        <q-icon
          name="thumb_up"
          size="xs"
          color="grey-5"
        />
        <span class="text-caption text-grey-5">{{ profile.votes }}</span>
      </div>
      <q-btn
        flat
        color="primary"
        label="View"
        :to="`/app/profiles/${profile.id}`"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Profile } from '@/stores/profiles'

defineProps({
  profile: {
    type: Object as PropType<Profile>,
    required: true
  }
})
</script>

<style scoped>
.profile-card {
  transition: transform 0.2s;
}
.profile-card:hover {
  transform: translateY(-2px);
  border-color: var(--q-primary);
}
.bg-dark-page {
  background: #1a1a1a;
}
.bg-transparent-gradient {
  background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0));
}
.flex-grow {
  flex-grow: 1;
}
</style>



