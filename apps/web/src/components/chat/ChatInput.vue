<template>
  <div class="chat-input" role="form" aria-label="Chat message input">
    <!-- Input Field -->
    <q-input
      v-model="message"
      outlined
      dense
      autofocus
      type="textarea"
      :placeholder="placeholder"
      :disable="loading"
      :maxlength="2000"
      :rows="rows"
      counter
      class="flex-grow chat-textarea"
      aria-label="Type your message"
      @keydown.enter.exact.prevent="handleSend"
    >
      <template #prepend>
        <q-icon
          name="chat"
          color="grey-7"
          aria-hidden="true"
        />
      </template>

      <template #append>
        <q-btn
          v-if="message.trim()"
          icon="send"
          flat
          dense
          round
          color="primary"
          :loading="loading"
          class="send-btn"
          aria-label="Send message. Press Enter"
          @click="handleSend"
        >
          <q-tooltip>Send (Enter)</q-tooltip>
        </q-btn>
        <q-btn
          v-else
          icon="clear"
          flat
          dense
          round
          color="grey-7"
          aria-label="Clear input"
          @click="clearInput"
        >
          <q-tooltip>Clear</q-tooltip>
        </q-btn>
      </template>
    </q-input>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  send: [message: string]
}>()

const props = withDefaults(
  defineProps<{
    loading?: boolean
    placeholder?: string
  }>(),
  {
    placeholder: 'Ask about SynthStack...',
  }
)

const message = ref('')

/**
 * Auto-adjust textarea rows based on content
 */
const rows = computed(() => {
  const lineCount = (message.value.match(/\n/g) || []).length + 1
  return Math.min(Math.max(lineCount, 1), 5)
})

/**
 * Handle send button click or Enter key
 */
function handleSend() {
  const trimmed = message.value.trim()
  if (!trimmed || props.loading) return

  emit('send', trimmed)
  message.value = ''
}

/**
 * Clear the input field
 */
function clearInput() {
  message.value = ''
}

/**
 * Expose properties for testing
 */
defineExpose({
  message,
  handleSend,
})
</script>

<style lang="scss" scoped>
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

// Light mode overrides
body.body--light .chat-input {
  background: #f8f9fa;
  border-top-color: #e0e0e0;
}

// Dark mode explicit
body.body--dark .chat-input {
  background: var(--q-dark-page, #1a1a2e);
  border-top-color: var(--q-dark, #2d2d4a);
}

.chat-textarea {
  flex: 1;

  :deep(.q-field__control) {
    border-radius: 20px;
  }

  :deep(textarea) {
    resize: none;
    line-height: 1.5;
  }
}

// Light mode input styling
body.body--light .chat-textarea {
  :deep(.q-field__control) {
    background: #ffffff;
  }
}

.send-btn {
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.1); }
  &:active { transform: scale(0.95); }
}

@media (max-width: 480px) {
  .chat-input { padding: 8px; }
}
</style>
