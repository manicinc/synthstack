<template>
  <div class="resources-step q-pa-lg">
    <div class="text-h4 text-weight-bold q-mb-md text-center">
      Helpful Resources
    </div>
    <div class="text-body1 text-grey-7 q-mb-xl text-center">
      Everything you need to get started
    </div>

    <div
      class="row q-col-gutter-md q-mx-auto"
      style="max-width: 800px"
    >
      <div
        v-for="resource in resources"
        :key="resource.title"
        class="col-12 col-md-6"
      >
        <q-card
          class="resource-card full-height"
          clickable
          @click="openResource(resource.url)"
        >
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon
                :name="resource.icon"
                size="32px"
                :color="resource.color"
              />
              <div class="text-h6 q-ml-md">
                {{ resource.title }}
              </div>
            </div>
            <div class="text-caption text-grey-7">
              {{ resource.description }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="text-center q-mt-xl">
      <q-btn
        flat
        label="Need Help? Contact Support"
        icon="mail"
        color="primary"
        @click="openResource('/contact')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const edition = (import.meta.env.VITE_SYNTHSTACK_EDITION as string | undefined) || 'community'
const isCommunityBuild = edition.toLowerCase() === 'community'
const githubUrl = isCommunityBuild
  ? 'https://github.com/manicinc/synthstack'
  : 'https://github.com/manicinc/synthstack-pro'

const resources = [
  {
    title: 'Documentation',
    description: 'Complete guides and API references',
    icon: 'menu_book',
    color: 'blue',
    url: '/docs'
  },
  {
    title: 'Blog',
    description: 'Tutorials, tips, and best practices',
    icon: 'article',
    color: 'green',
    url: '/blog'
  },
  {
    title: 'Community',
    description: 'Connect with other builders',
    icon: 'groups',
    color: 'purple',
    url: '/community'
  },
  {
    title: 'GitHub',
    description: 'Source code and issue tracking',
    icon: 'code',
    color: 'grey-8',
    url: githubUrl
  }
];

const openResource = (url: string) => {
  if (url.startsWith('http')) {
    window.open(url, '_blank');
  } else {
    router.push(url);
  }
};
</script>

<style scoped>
.resource-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
}

.resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
</style>
