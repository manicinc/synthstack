<template>
  <q-page class="community-chat-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header row items-start justify-between q-pa-md">
        <div class="row items-center q-gutter-sm">
          <q-avatar
            color="primary"
            text-color="white"
            icon="smart_toy"
            size="44px"
          />
          <div>
            <div class="text-subtitle1 text-weight-bold">
              SynthStack Assistant
            </div>
            <div class="text-caption text-grey-7">
              Community Chat
            </div>
          </div>
        </div>

        <div class="row items-center q-gutter-sm">
          <q-chip
            :color="creditsRemaining > 0 ? 'primary' : 'negative'"
            text-color="white"
            icon="stars"
          >
            {{ creditsRemaining }} credits
          </q-chip>

          <q-btn
            v-if="$q.screen.lt.lg"
            flat
            dense
            round
            icon="forum"
            color="grey-7"
            aria-label="Chats"
            @click="showChats = true"
          >
            <q-tooltip>Chats</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            round
            icon="tune"
            color="grey-7"
            aria-label="Chat settings"
            @click="showSettings = true"
          >
            <q-tooltip>Settings</q-tooltip>
          </q-btn>

          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="New Chat"
            no-caps
            @click="createChat()"
          />
        </div>
      </div>

      <!-- Layout -->
      <div class="chat-layout">
        <!-- Conversations -->
        <aside class="chat-sidebar">
          <div class="sidebar-inner q-pa-md">
            <q-input
              v-model="chatSearch"
              dense
              outlined
              placeholder="Search chats"
              clearable
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-list
              padding
              class="q-mt-sm chat-list"
            >
              <q-item
                v-for="conv in filteredConversations"
                :key="conv.id"
                clickable
                :active="conv.id === activeConversationId"
                active-class="chat-item-active"
                class="chat-item"
                @click="setActiveConversation(conv.id)"
              >
                <q-item-section>
                  <q-item-label lines="1">
                    {{ conv.title }}
                  </q-item-label>
                  <q-item-label caption lines="1">
                    {{ getConversationPreview(conv) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    round
                    icon="more_horiz"
                    color="grey-7"
                    aria-label="Chat options"
                    @click.stop
                  >
                    <q-menu>
                      <q-list style="min-width: 180px">
                        <q-item clickable v-close-popup @click="openRename(conv)">
                          <q-item-section avatar><q-icon name="edit" /></q-item-section>
                          <q-item-section>Rename</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="confirmDelete(conv)">
                          <q-item-section avatar><q-icon name="delete" color="negative" /></q-item-section>
                          <q-item-section class="text-negative">Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </aside>

        <!-- Chat -->
        <main class="chat-main">
          <q-scroll-area
            ref="scrollAreaRef"
            class="chat-messages"
            @scroll="onScroll"
          >
            <div v-if="!activeConversation || activeConversation.messages.length === 0" class="empty-state q-pa-xl">
              <div class="empty-hero">
                <q-icon name="auto_awesome" size="64px" color="primary" class="opacity-20" />
                <div class="text-h5 text-weight-bold q-mt-md">
                  Ask me anything
                </div>
                <div class="text-body2 text-grey-7 q-mt-sm" style="max-width: 520px">
                  Fast chat, code help, writing, brainstorming, and image prompts. No agents, no RAG — just a great assistant.
                </div>
              </div>

              <div class="q-mt-lg">
                <div class="text-subtitle2 text-grey-8 q-mb-sm">
                  Try one of these
                </div>
                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-md-6" v-for="prompt in suggestedPrompts" :key="prompt.title">
                    <q-card flat bordered class="prompt-card" @click="sendFromPrompt(prompt.prompt)">
                      <q-card-section class="row items-start q-gutter-sm">
                        <q-icon :name="prompt.icon" color="primary" size="20px" />
                        <div>
                          <div class="text-weight-medium">{{ prompt.title }}</div>
                          <div class="text-caption text-grey-7">{{ prompt.subtitle }}</div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="messages-wrap q-pa-md">
              <ChatMessage
                v-for="(msg, idx) in activeConversation.messages"
                :key="`${idx}-${msg.timestamp}`"
                :message="msg"
              />

              <div v-if="isStreaming" class="stream-indicator row items-center q-gutter-sm text-grey-7 q-pt-sm">
                <q-spinner-dots size="22px" color="primary" />
                <span>Generating…</span>
              </div>
            </div>
          </q-scroll-area>

          <q-btn
            v-if="showScrollToBottom"
            class="scroll-to-bottom"
            round
            icon="south"
            color="primary"
            aria-label="Scroll to bottom"
            @click="scrollToBottom()"
          />

          <!-- Composer -->
          <div class="chat-composer q-pa-md">
            <div class="composer-meta row items-center justify-between q-mb-sm">
              <div class="text-caption text-grey-7">
                Model: <span class="text-weight-medium">{{ settings.model }}</span>
                <span class="dot">•</span>
                Temp: <span class="text-weight-medium">{{ settings.temperature }}</span>
                <span class="dot">•</span>
                Max: <span class="text-weight-medium">{{ settings.maxTokens }}</span>
              </div>
              <div class="row items-center q-gutter-xs">
                <q-chip size="sm" icon="stars">
                  ~{{ creditsPerMessage }} / msg
                </q-chip>
                <q-btn
                  v-if="isStreaming"
                  flat
                  dense
                  icon="stop_circle"
                  color="negative"
                  label="Stop"
                  no-caps
                  @click="stopStreaming()"
                />
                <q-btn
                  flat
                  dense
                  icon="delete_outline"
                  color="grey-7"
                  no-caps
                  label="Clear"
                  @click="clearActiveConversation()"
                />
              </div>
            </div>

            <ChatInput
              :loading="false"
              placeholder="Message SynthStack…"
              @send="handleSend"
            />
          </div>
        </main>
      </div>
    </div>

    <!-- Settings Dialog -->
    <q-dialog v-model="showSettings">
      <q-card class="settings-card">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Chat Settings
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" aria-label="Close settings" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-select
            v-model="localModel"
            :options="modelOptions"
            emit-value
            map-options
            outlined
            label="Model"
            hint="Streaming + markdown supported"
          />

          <div>
            <div class="text-subtitle2 q-mb-xs">
              Temperature: {{ localTemperature }}
            </div>
            <q-slider
              v-model="localTemperature"
              :min="0"
              :max="1"
              :step="0.1"
              label
              label-always
              markers
              color="primary"
            />
            <div class="text-caption text-grey-7">
              Lower = more precise, higher = more creative.
            </div>
          </div>

          <div>
            <div class="text-subtitle2 q-mb-xs">
              Max tokens: {{ localMaxTokens }}
            </div>
            <q-slider
              v-model="localMaxTokens"
              :min="200"
              :max="4000"
              :step="100"
              label
              label-always
              markers
              color="primary"
            />
            <div class="text-caption text-grey-7">
              Maximum length of the assistant response.
            </div>
          </div>

          <q-banner class="bg-grey-2 text-grey-9" rounded>
            <template #avatar>
              <q-icon name="info" color="primary" />
            </template>
            Community Edition chat is a single assistant (no agents, no RAG, no workflows). UI/UX is Pro-quality.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Reset" color="grey-7" no-caps @click="resetSettings()" />
          <q-space />
          <q-btn flat label="Cancel" no-caps v-close-popup @click="syncLocalSettings()" />
          <q-btn unelevated label="Save" color="primary" no-caps @click="saveSettings()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Chats Dialog (mobile) -->
    <q-dialog v-model="showChats">
      <q-card class="chats-dialog">
        <q-card-section class="row items-center">
          <div class="text-h6">Chats</div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" aria-label="Close chats" />
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="chatSearch"
            dense
            outlined
            placeholder="Search chats"
            clearable
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="New Chat"
            no-caps
            class="full-width q-mt-sm"
            @click="createChat(); showChats = false"
          />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-none">
          <q-list padding>
            <q-item
              v-for="conv in filteredConversations"
              :key="conv.id"
              clickable
              :active="conv.id === activeConversationId"
              active-class="chat-item-active"
              @click="setActiveConversation(conv.id); showChats = false"
            >
              <q-item-section>
                <q-item-label lines="1">{{ conv.title }}</q-item-label>
                <q-item-label caption lines="1">{{ getConversationPreview(conv) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Rename Dialog -->
    <q-dialog v-model="showRename">
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center">
          <div class="text-h6">Rename Chat</div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section>
          <q-input v-model="renameTitle" outlined autofocus label="Title" maxlength="80" counter />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" no-caps v-close-popup />
          <q-btn unelevated label="Save" color="primary" no-caps :disable="!renameTitle.trim()" @click="applyRename()" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { useCommunityChatStore } from '@/stores/communityChat'
import { useAuthStore } from '@/stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()
const chatStore = useCommunityChatStore()

const { sortedConversations, activeConversation, activeConversationId, isStreaming, settings, creditsPerMessage } =
  storeToRefs(chatStore)
const { MODEL_OPTIONS } = chatStore

const scrollAreaRef = ref<any>(null)
const showScrollToBottom = ref(false)
const chatSearch = ref('')

const creditsRemaining = computed(() => authStore.credits)

const filteredConversations = computed(() => {
  const q = chatSearch.value.trim().toLowerCase()
  if (!q) return sortedConversations.value
  return sortedConversations.value.filter((c) => {
    const preview = getConversationPreview(c).toLowerCase()
    return c.title.toLowerCase().includes(q) || preview.includes(q)
  })
})

const suggestedPrompts = [
  {
    icon: 'code',
    title: 'Debug a bug',
    subtitle: 'Paste an error and get a fix plan',
    prompt: 'I am getting this error:\n\n<PASTE HERE>\n\nHelp me debug it step-by-step.',
  },
  {
    icon: 'edit_note',
    title: 'Write something',
    subtitle: 'Emails, posts, docs, proposals',
    prompt: 'Write a concise, high-quality draft for:\n\n<DESCRIBE WHAT YOU NEED>',
  },
  {
    icon: 'image',
    title: 'Craft an image prompt',
    subtitle: 'Turn an idea into a great prompt',
    prompt: 'Help me write a detailed image prompt for: <IDEA>. Include style, lighting, composition, and camera details.',
  },
  {
    icon: 'lightbulb',
    title: 'Brainstorm features',
    subtitle: 'Product + UX ideas with priorities',
    prompt: 'Brainstorm 10 feature ideas for my app, then rank them by impact vs effort. Ask 3 clarifying questions first.',
  },
]

function getConversationPreview(conv: any) {
  const last = [...(conv.messages || [])].reverse().find((m: any) => String(m.content || '').trim().length > 0)
  if (!last) return 'No messages yet'
  const text = String(last.content || '').trim().replace(/\s+/g, ' ')
  return text.length > 64 ? `${text.slice(0, 64)}…` : text
}

function createChat() {
  chatStore.createConversation()
  nextTick(() => scrollToBottom())
}

function setActiveConversation(id: string) {
  chatStore.setActiveConversation(id)
  nextTick(() => scrollToBottom())
}

function clearActiveConversation() {
  chatStore.clearActiveConversation()
  nextTick(() => scrollToBottom())
}

async function handleSend(message: string) {
  try {
    await chatStore.sendStreamingMessage(message)
    nextTick(() => scrollToBottom())
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err?.message || 'Failed to send message',
      position: 'top',
    })
  }
}

function sendFromPrompt(message: string) {
  handleSend(message)
}

function stopStreaming() {
  chatStore.stopStreaming()
}

function scrollToBottom() {
  nextTick(() => {
    if (!scrollAreaRef.value) return
    const target = scrollAreaRef.value.getScrollTarget()
    scrollAreaRef.value.setScrollPosition('vertical', target.scrollHeight, 200)
    showScrollToBottom.value = false
  })
}

function onScroll() {
  if (!scrollAreaRef.value) return
  const pos = scrollAreaRef.value.getScrollPosition()
  const target = scrollAreaRef.value.getScrollTarget()
  const distanceToBottom = target.scrollHeight - (pos.top + target.clientHeight)
  showScrollToBottom.value = distanceToBottom > 240
}

// Auto-scroll while streaming if user is near bottom
const lastMessageKey = computed(() => {
  const msgs = activeConversation.value?.messages || []
  const last = msgs[msgs.length - 1]
  return last ? `${last.timestamp}:${last.content?.length || 0}` : 'empty'
})

watch(lastMessageKey, () => {
  if (!isStreaming.value) return
  if (!showScrollToBottom.value) scrollToBottom()
})

// Load persisted chats
onMounted(() => {
  chatStore.loadFromStorage()
  if (!activeConversationId.value && filteredConversations.value.length > 0) {
    chatStore.setActiveConversation(filteredConversations.value[0].id)
  }
})

// ============================================
// Settings UI
// ============================================

const showSettings = ref(false)
const showChats = ref(false)
const localModel = ref(settings.value.model)
const localTemperature = ref(settings.value.temperature)
const localMaxTokens = ref(settings.value.maxTokens)

const modelOptions = MODEL_OPTIONS.map((m) => ({
  label: `${m.label} (${m.tier})`,
  value: m.value,
}))

function syncLocalSettings() {
  localModel.value = settings.value.model
  localTemperature.value = settings.value.temperature
  localMaxTokens.value = settings.value.maxTokens
}

function resetSettings() {
  localModel.value = 'gpt-4o-mini'
  localTemperature.value = 0.7
  localMaxTokens.value = 1200
}

function saveSettings() {
  chatStore.updateSettings({
    model: localModel.value,
    temperature: localTemperature.value,
    maxTokens: localMaxTokens.value,
  })
  showSettings.value = false
}

watch(showSettings, (open) => {
  if (open) syncLocalSettings()
})

// ============================================
// Rename / Delete
// ============================================

const showRename = ref(false)
const renameId = ref<string | null>(null)
const renameTitle = ref('')

function openRename(conv: { id: string; title: string }) {
  renameId.value = conv.id
  renameTitle.value = conv.title
  showRename.value = true
}

function applyRename() {
  if (!renameId.value) return
  chatStore.renameConversation(renameId.value, renameTitle.value)
  showRename.value = false
}

function confirmDelete(conv: { id: string; title: string }) {
  $q.dialog({
    title: 'Delete chat?',
    message: `Delete “${conv.title}”? This cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(() => {
    chatStore.deleteConversation(conv.id)
  })
}
</script>

<style lang="scss" scoped>
.community-chat-page {
  background: var(--q-background);
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-default);
}

body.body--dark .page-header {
  background: rgba(20, 20, 32, 0.72);
}

.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: calc(100vh - 90px);

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.chat-sidebar {
  border-right: 1px solid var(--border-default);
  background: var(--surface-1);

  @media (max-width: 1100px) {
    display: none;
  }
}

.chat-list {
  max-height: calc(100vh - 170px);
}

.chat-item {
  border-radius: 10px;
  margin-bottom: 4px;
}

.chat-item-active {
  background: rgba(var(--q-primary-rgb), 0.12);
}

.chat-main {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: calc(100vh - 90px);
}

.chat-messages {
  flex: 1;
  padding: 0;
}

.messages-wrap {
  max-width: 920px;
  margin: 0 auto;
}

.empty-state {
  max-width: 920px;
  margin: 0 auto;
}

.empty-hero {
  text-align: center;
}

.opacity-20 {
  opacity: 0.2;
}

.prompt-card {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(var(--q-primary-rgb), 0.4);
  }
}

.chat-composer {
  border-top: 1px solid var(--border-default);
  background: var(--surface-1);
}

.dot {
  margin: 0 8px;
  opacity: 0.6;
}

.stream-indicator {
  max-width: 920px;
  margin: 0 auto;
}

.scroll-to-bottom {
  position: absolute;
  right: 18px;
  bottom: 96px;
  box-shadow: var(--shadow-md);
}

.settings-card {
  width: min(680px, calc(100vw - 24px));
}

.chats-dialog {
  width: min(520px, calc(100vw - 24px));
}
</style>
