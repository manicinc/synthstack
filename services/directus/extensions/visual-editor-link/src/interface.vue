<template>
  <div class="visual-editor-link">
    <v-button
      v-if="liveUrl"
      :href="liveUrl"
      target="_blank"
      icon="launch"
      :disabled="!value"
      class="visual-editor-button"
    >
      Open in Visual Editor
    </v-button>
    <div v-else class="warning">
      <v-icon name="warning" />
      <span>Configure Website URL in field options</span>
    </div>
    <div v-if="value && liveUrl" class="url-preview">
      <v-icon name="link" small />
      <span class="url-text">{{ liveUrl }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: any;
  collection: string;
  field: string;
  primaryKey: string | number;
  websiteUrl?: string;
  pathField?: string;
  pathPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  websiteUrl: 'http://localhost:3050',
  pathField: 'slug',
  pathPrefix: '/blog',
});

const liveUrl = computed(() => {
  if (!props.websiteUrl || !props.value) return null;

  // Get the slug from the current item
  const slug = props.value[props.pathField] || props.value;

  if (!slug) return null;

  // Build the live URL
  const baseUrl = props.websiteUrl.replace(/\/$/, ''); // Remove trailing slash
  const prefix = props.pathPrefix.startsWith('/') ? props.pathPrefix : `/${props.pathPrefix}`;
  const path = slug.startsWith('/') ? slug : `/${slug}`;

  return `${baseUrl}${prefix}${path}?visual-editing=true`;
});
</script>

<style scoped>
.visual-editor-link {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.visual-editor-button {
  width: fit-content;
}

.warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--warning-10);
  border-radius: var(--border-radius);
  color: var(--warning);
}

.url-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--background-subdued);
  border-radius: var(--border-radius);
  font-family: var(--family-monospace);
  font-size: 12px;
  color: var(--foreground-subdued);
}

.url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
