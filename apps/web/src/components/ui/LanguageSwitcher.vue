<template>
  <div
    class="language-switcher"
    :class="[`language-switcher--${variant}`]"
  >
    <!-- Compact variant (icon only with dropdown) -->
    <template v-if="variant === 'compact'">
      <q-btn
        flat
        round
        dense
        :aria-label="safeT('language.select', 'Select Language')"
        class="language-btn"
      >
        <span class="language-flag">{{ currentFlag }}</span>
        <q-menu
          anchor="bottom right"
          self="top right"
          :offset="[0, 8]"
          class="language-menu"
        >
          <q-list
            dense
            style="min-width: 180px"
          >
            <q-item
              v-for="locale in enabledLocales"
              :key="locale.code"
              v-close-popup
              clickable
              :active="locale.code === currentLocale"
              active-class="text-primary"
              @click="selectLocale(locale.code)"
            >
              <q-item-section avatar>
                <span class="language-flag">{{ locale.flag }}</span>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ locale.name }}</q-item-label>
                <q-item-label
                  v-if="showEnglishName && locale.name !== locale.englishName"
                  caption
                >
                  {{ locale.englishName }}
                </q-item-label>
              </q-item-section>
              <q-item-section
                v-if="locale.code === currentLocale"
                side
              >
                <q-icon
                  name="check"
                  color="primary"
                  size="xs"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </template>

    <!-- Dropdown variant (full dropdown) -->
    <template v-else-if="variant === 'dropdown'">
      <q-select
        v-model="selectedLocale"
        :options="localeOptions"
        :label="showLabel ? safeT('language.select', 'Select Language') : undefined"
        dense
        outlined
        emit-value
        map-options
        class="language-select"
        :dropdown-icon="dropdownIcon"
        @update:model-value="selectLocale"
      >
        <template #prepend>
          <span class="language-flag">{{ currentFlag }}</span>
        </template>
        <template #option="{ itemProps, opt }">
          <q-item v-bind="itemProps">
            <q-item-section avatar>
              <span class="language-flag">{{ opt.flag }}</span>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ opt.label }}</q-item-label>
              <q-item-label
                v-if="showEnglishName && opt.englishName"
                caption
              >
                {{ opt.englishName }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </template>

    <!-- List variant (radio buttons for settings page) -->
    <template v-else-if="variant === 'list'">
      <div class="language-list">
        <q-item
          v-for="locale in enabledLocales"
          :key="locale.code"
          tag="label"
          clickable
          class="language-list-item"
          :class="{ 'language-list-item--active': locale.code === currentLocale }"
        >
          <q-item-section avatar>
            <span class="language-flag language-flag--large">{{ locale.flag }}</span>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ locale.name }}</q-item-label>
            <q-item-label caption>
              {{ locale.englishName }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-radio
              v-model="selectedLocale"
              :val="locale.code"
              color="primary"
              @update:model-value="selectLocale"
            />
          </q-item-section>
        </q-item>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { useI18nStore } from '@/stores/i18n';
import { getShortLocale } from '@/router/locale-routes';

// Props
interface Props {
  /** Display variant */
  variant?: 'compact' | 'dropdown' | 'list';
  /** Show label for dropdown */
  showLabel?: boolean;
  /** Show English name as subtitle */
  showEnglishName?: boolean;
  /** Custom dropdown icon */
  dropdownIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'compact',
  showLabel: false,
  showEnglishName: true,
  dropdownIcon: 'expand_more',
});

// Emits
const emit = defineEmits<{
  (e: 'change', locale: string): void;
}>();

// Composables
const { t, te } = useI18n();
const router = useRouter();
const route = useRoute();
const i18nStore = useI18nStore();

// Safe translate function that returns fallback if key doesn't exist
const safeT = (key: string, fallback: string) => {
  try {
    return te(key) ? t(key) : fallback;
  } catch {
    return fallback;
  }
};

// State
const selectedLocale = ref(i18nStore.currentLocale);

// Computed
const currentLocale = computed(() => i18nStore.currentLocale);
const currentFlag = computed(() => i18nStore.currentFlag);
const enabledLocales = computed(() => i18nStore.enabledLocales);

const localeOptions = computed(() =>
  enabledLocales.value.map((locale) => ({
    label: locale.name,
    value: locale.code,
    flag: locale.flag,
    englishName: locale.name !== locale.englishName ? locale.englishName : undefined,
  }))
);

// Watch for external changes
watch(
  () => i18nStore.currentLocale,
  (newLocale) => {
    selectedLocale.value = newLocale;
  }
);

// Methods
async function selectLocale(locale: string) {
  if (locale === currentLocale.value) return;

  // Get current path and replace locale segment
  const currentPath = route.path;
  const currentLocaleParam = route.params.locale as string;

  let newPath: string;
  if (currentLocaleParam) {
    // Replace existing locale in path
    newPath = currentPath.replace(
      `/${currentLocaleParam}`,
      `/${getShortLocale(locale)}`
    );
  } else {
    // Fallback: add locale prefix (shouldn't happen with our setup)
    newPath = `/${getShortLocale(locale)}${currentPath}`;
  }

  // Navigate to new locale path
  // The router guard will update the store automatically
  await router.push({
    path: newPath,
    query: route.query,
    hash: route.hash
  });

  emit('change', locale);
}
</script>

<style lang="scss" scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;

  &--compact {
    .language-btn {
      padding: 4px;
      min-width: 36px;
      min-height: 36px;
    }
  }

  &--dropdown {
    .language-select {
      min-width: 160px;
    }
  }
}

.language-flag {
  font-size: 1.25rem;
  line-height: 1;

  &--large {
    font-size: 1.5rem;
  }
}

.language-menu {
  border-radius: var(--radius-md, 8px);
  background: var(--bg-elevated, #27272a);
  border: 1px solid var(--border-default, #3f3f46);
}

.language-list {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .language-list-item {
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--border-default, #3f3f46);
    transition: all 0.2s ease;

    &:hover {
      background: var(--bg-subtle, #18181b);
    }

    &--active {
      border-color: var(--color-primary, #2d9cdb);
      background: rgba(45, 156, 219, 0.1);
    }
  }
}

// Dark mode adjustments
.body--dark {
  .language-menu {
    background: var(--bg-elevated, #27272a);
    border-color: var(--border-default, #3f3f46);
  }
}

.body--light {
  .language-menu {
    background: var(--bg-elevated, #ffffff);
    border-color: var(--border-default, #e2e8f0);
  }
}
</style>
