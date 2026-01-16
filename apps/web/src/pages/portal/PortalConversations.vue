<template>
  <q-page padding>
    <div class="q-mb-lg">
      <h4 class="text-h4 q-mt-none q-mb-sm">
        Conversations
      </h4>
      <p class="text-subtitle1 text-grey-7">
        Communicate with your team
      </p>
    </div>

    <!-- Mobile: Toggle between list and messages -->
    <div
      v-if="$q.screen.lt.md"
      class="mobile-conversations"
    >
      <!-- Conversations List View -->
      <q-card
        v-if="!showMessageView"
        flat
        bordered
      >
        <q-card-section class="q-pa-none">
          <q-input
            v-model="searchQuery"
            placeholder="Search conversations..."
            outlined
            dense
            class="q-ma-md"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-separator />

          <SkeletonLoader
            v-if="loading"
            type="list"
            :count="5"
          />

          <EmptyState
            v-else-if="filteredConversations.length === 0"
            icon="chat_bubble_outline"
            title="No conversations yet"
            description="Start a conversation with your team"
          />

          <q-list
            v-else
            padding
            separator
          >
            <q-item
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              v-ripple
              clickable
              :active="selectedConversationId === conversation.id"
              @click="selectConversation(conversation.id)"
            >
              <q-item-section avatar>
                <q-avatar
                  :color="conversation.unread_count > 0 ? 'primary' : 'grey-5'"
                  text-color="white"
                >
                  <q-icon :name="getConversationIcon(conversation.related_collection)" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ conversation.subject }}</q-item-label>
                <q-item-label
                  caption
                  lines="1"
                >
                  {{ conversation.last_message_preview }}
                </q-item-label>
              </q-item-section>

              <q-item-section
                side
                top
              >
                <q-item-label caption>
                  {{ formatRelativeTime(conversation.updated_at) }}
                </q-item-label>
                <q-badge
                  v-if="conversation.unread_count > 0"
                  color="primary"
                  :label="conversation.unread_count"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Messages View -->
      <q-card
        v-else
        flat
        bordered
        class="conversation-card-mobile"
      >
        <template v-if="selectedConversation">
          <!-- Conversation Header with Back Button -->
          <q-card-section class="bg-grey-2">
            <div class="row items-center">
              <div class="col-auto q-mr-sm">
                <q-btn
                  flat
                  round
                  dense
                  icon="arrow_back"
                  @click="showMessageView = false"
                />
              </div>
              <div class="col">
                <div class="text-h6">
                  {{ selectedConversation.subject }}
                </div>
                <div class="text-caption text-grey-7">
                  <q-chip
                    size="sm"
                    dense
                  >
                    {{ selectedConversation.related_collection }}
                  </q-chip>
                  {{ selectedConversation.related_item_name }}
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  round
                  icon="more_vert"
                  @click="showConversationMenu = true"
                >
                  <q-menu v-model="showConversationMenu">
                    <q-list style="min-width: 150px">
                      <q-item
                        v-close-popup
                        clickable
                        @click="markAsRead"
                      >
                        <q-item-section avatar>
                          <q-icon name="mark_email_read" />
                        </q-item-section>
                        <q-item-section>Mark as read</q-item-section>
                      </q-item>
                      <q-item
                        v-close-popup
                        clickable
                        @click="archiveConversation"
                      >
                        <q-item-section avatar>
                          <q-icon name="archive" />
                        </q-item-section>
                        <q-item-section>Archive</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Messages -->
          <q-card-section class="messages-container-mobile">
            <div
              v-if="loadingMessages"
              class="text-center q-pa-lg"
            >
              <q-spinner
                color="primary"
                size="40px"
              />
            </div>

            <EmptyState
              v-else-if="messages.length === 0"
              icon="chat_bubble_outline"
              title="No messages yet"
              description="Start the conversation"
            />

            <div
              v-else
              class="messages-list"
            >
              <div
                v-for="message in messages"
                :key="message.id"
                :class="['message', message.is_client ? 'message-client' : 'message-staff']"
              >
                <div class="message-avatar">
                  <q-avatar
                    size="32px"
                    :color="message.is_client ? 'primary' : 'grey-7'"
                    text-color="white"
                  >
                    {{ getInitials(message.sender_name) }}
                  </q-avatar>
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-sender">{{ message.sender_name }}</span>
                    <span class="message-time">{{ formatMessageTime(message.created_at) }}</span>
                  </div>
                  <div class="message-body">
                    {{ message.message }}
                  </div>
                  <div
                    v-if="message.attachments && message.attachments.length > 0"
                    class="message-attachments"
                  >
                    <q-chip
                      v-for="attachment in message.attachments"
                      :key="attachment.id"
                      icon="attach_file"
                      size="sm"
                      clickable
                      @click="downloadAttachment(attachment)"
                    >
                      {{ attachment.filename }}
                    </q-chip>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Message Input -->
          <q-card-section class="q-pa-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <q-input
                  v-model="newMessage"
                  type="textarea"
                  outlined
                  placeholder="Type your message..."
                  autogrow
                  :rows="2"
                  @keydown.ctrl.enter="sendMessage"
                />
              </div>
              <div class="col-12 text-right">
                <q-btn
                  flat
                  icon="attach_file"
                  label="Attach"
                  @click="attachFile"
                />
                <q-btn
                  unelevated
                  color="primary"
                  label="Send"
                  icon-right="send"
                  :disable="!newMessage.trim()"
                  @click="sendMessage"
                />
              </div>
            </div>
          </q-card-section>
        </template>
      </q-card>
    </div>

    <!-- Desktop: Two-column layout -->
    <div
      v-else
      class="row q-col-gutter-md"
    >
      <!-- Conversations List -->
      <div class="col-12 col-md-4">
        <q-card
          flat
          bordered
        >
          <q-card-section class="q-pa-none">
            <q-input
              v-model="searchQuery"
              placeholder="Search conversations..."
              outlined
              dense
              class="q-ma-md"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-separator />

            <SkeletonLoader
              v-if="loading"
              type="list"
              :count="5"
            />

            <EmptyState
              v-else-if="filteredConversations.length === 0"
              icon="chat_bubble_outline"
              title="No conversations yet"
              description="Start a conversation with your team"
            />

            <q-list
              v-else
              padding
              separator
            >
              <q-item
                v-for="conversation in filteredConversations"
                :key="conversation.id"
                v-ripple
                clickable
                :active="selectedConversationId === conversation.id"
                @click="selectConversation(conversation.id)"
              >
                <q-item-section avatar>
                  <q-avatar
                    :color="conversation.unread_count > 0 ? 'primary' : 'grey-5'"
                    text-color="white"
                  >
                    <q-icon :name="getConversationIcon(conversation.related_collection)" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ conversation.subject }}</q-item-label>
                  <q-item-label
                    caption
                    lines="1"
                  >
                    {{ conversation.last_message_preview }}
                  </q-item-label>
                </q-item-section>

                <q-item-section
                  side
                  top
                >
                  <q-item-label caption>
                    {{ formatRelativeTime(conversation.updated_at) }}
                  </q-item-label>
                  <q-badge
                    v-if="conversation.unread_count > 0"
                    color="primary"
                    :label="conversation.unread_count"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Conversation Messages -->
      <div class="col-12 col-md-8">
        <q-card
          flat
          bordered
          class="conversation-card"
        >
          <template v-if="!selectedConversationId">
            <EmptyState
              icon="forum"
              title="Select a conversation"
              description="Choose a conversation from the list to view messages"
            />
          </template>

          <template v-else-if="selectedConversation">
            <!-- Conversation Header -->
            <q-card-section class="bg-grey-2">
              <div class="row items-center">
                <div class="col">
                  <div class="text-h6">
                    {{ selectedConversation.subject }}
                  </div>
                  <div class="text-caption text-grey-7">
                    <q-chip
                      size="sm"
                      dense
                    >
                      {{ selectedConversation.related_collection }}
                    </q-chip>
                    {{ selectedConversation.related_item_name }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-btn
                    flat
                    round
                    icon="more_vert"
                    @click="showConversationMenu = true"
                  >
                    <q-menu v-model="showConversationMenu">
                      <q-list style="min-width: 150px">
                        <q-item
                          v-close-popup
                          clickable
                          @click="markAsRead"
                        >
                          <q-item-section avatar>
                            <q-icon name="mark_email_read" />
                          </q-item-section>
                          <q-item-section>Mark as read</q-item-section>
                        </q-item>
                        <q-item
                          v-close-popup
                          clickable
                          @click="archiveConversation"
                        >
                          <q-item-section avatar>
                            <q-icon name="archive" />
                          </q-item-section>
                          <q-item-section>Archive</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <!-- Messages -->
            <q-card-section class="messages-container">
              <div
                v-if="loadingMessages"
                class="text-center q-pa-lg"
              >
                <q-spinner
                  color="primary"
                  size="40px"
                />
              </div>

              <EmptyState
                v-else-if="messages.length === 0"
                icon="chat_bubble_outline"
                title="No messages yet"
                description="Start the conversation"
              />

              <div
                v-else
                class="messages-list"
              >
                <div
                  v-for="message in messages"
                  :key="message.id"
                  :class="['message', message.is_client ? 'message-client' : 'message-staff']"
                >
                  <div class="message-avatar">
                    <q-avatar
                      size="32px"
                      :color="message.is_client ? 'primary' : 'grey-7'"
                      text-color="white"
                    >
                      {{ getInitials(message.sender_name) }}
                    </q-avatar>
                  </div>
                  <div class="message-content">
                    <div class="message-header">
                      <span class="message-sender">{{ message.sender_name }}</span>
                      <span class="message-time">{{ formatMessageTime(message.created_at) }}</span>
                    </div>
                    <div class="message-body">
                      {{ message.message }}
                    </div>
                    <div
                      v-if="message.attachments && message.attachments.length > 0"
                      class="message-attachments"
                    >
                      <q-chip
                        v-for="attachment in message.attachments"
                        :key="attachment.id"
                        icon="attach_file"
                        size="sm"
                        clickable
                        @click="downloadAttachment(attachment)"
                      >
                        {{ attachment.filename }}
                      </q-chip>
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <!-- Message Input -->
            <q-card-section class="q-pa-md">
              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-input
                    v-model="newMessage"
                    type="textarea"
                    outlined
                    placeholder="Type your message..."
                    autogrow
                    :rows="3"
                    @keydown.ctrl.enter="sendMessage"
                  />
                </div>
                <div class="col-12 text-right">
                  <q-btn
                    flat
                    icon="attach_file"
                    label="Attach"
                    @click="attachFile"
                  />
                  <q-btn
                    unelevated
                    color="primary"
                    label="Send"
                    icon-right="send"
                    :disable="!newMessage.trim()"
                    @click="sendMessage"
                  />
                </div>
              </div>
            </q-card-section>
          </template>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar, date } from 'quasar';
import { usePortal } from 'src/composables/usePortal';
import { useHaptics } from 'src/composables/useHaptics';
import { useNativeFeatures } from 'src/composables/useNativeFeatures';
import SkeletonLoader from 'src/components/ui/SkeletonLoader.vue';
import EmptyState from 'src/components/ui/EmptyState.vue';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

const $q = useQuasar();
const { getConversations, getConversationMessages, sendConversationMessage } = usePortal();
const { medium, success } = useHaptics();
const { hideKeyboard } = useNativeFeatures();

const conversations = ref<any[]>([]);
const messages = ref<any[]>([]);
const loading = ref(false);
const loadingMessages = ref(false);
const searchQuery = ref('');
const selectedConversationId = ref<string | null>(null);
const newMessage = ref('');
const showConversationMenu = ref(false);
const showMessageView = ref(false);

const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversations.value;

  const query = searchQuery.value.toLowerCase();
  return conversations.value.filter(conv =>
    conv.subject.toLowerCase().includes(query) ||
    conv.last_message_preview?.toLowerCase().includes(query)
  );
});

const selectedConversation = computed(() => {
  if (!selectedConversationId.value) return null;
  return conversations.value.find(c => c.id === selectedConversationId.value);
});

const loadConversations = async () => {
  loading.value = true;
  try {
    const response = await getConversations();
    conversations.value = response;
  } catch (error) {
    logError('Failed to load conversations:', error);
  } finally {
    loading.value = false;
  }
};

const loadMessages = async (conversationId: string) => {
  loadingMessages.value = true;
  try {
    const response = await getConversationMessages(conversationId);
    messages.value = response;
  } catch (error) {
    logError('Failed to load messages:', error);
  } finally {
    loadingMessages.value = false;
  }
};

const selectConversation = (conversationId: string) => {
  selectedConversationId.value = conversationId;
  loadMessages(conversationId);

  // On mobile, switch to message view
  if ($q.screen.lt.md) {
    showMessageView.value = true;
  }

  // Haptic feedback
  medium();
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedConversationId.value) return;

  try {
    await sendConversationMessage(selectedConversationId.value, newMessage.value);

    newMessage.value = '';
    await loadMessages(selectedConversationId.value);
    await loadConversations(); // Refresh to update last message preview

    // Haptic feedback and hide keyboard on mobile
    success();
    hideKeyboard();
  } catch (error) {
    logError('Failed to send message:', error);
  }
};

const getConversationIcon = (collection: string) => {
  const icons: Record<string, string> = {
    projects: 'folder',
    proposals: 'description',
    invoices: 'receipt'
  };
  return icons[collection] || 'chat';
};

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.formatDate(dateStr, 'MMM D');
};

const formatMessageTime = (dateStr: string) => {
  return date.formatDate(dateStr, 'MMM D, h:mm A');
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const markAsRead = () => {
  // Implementation
  devLog('Mark as read');
};

const archiveConversation = () => {
  // Implementation
  devLog('Archive conversation');
};

const attachFile = () => {
  // Implementation - would open file picker
  devLog('Attach file');
};

const downloadAttachment = (attachment: any) => {
  // Implementation
  devLog('Download attachment:', attachment);
};

onMounted(() => {
  loadConversations();
});

watch(selectedConversationId, (newId) => {
  if (newId) {
    loadMessages(newId);
  } else {
    messages.value = [];
  }
});
</script>

<style scoped lang="scss">
// Desktop conversation card
.conversation-card {
  height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;

  @media (max-width: 1023px) {
    height: calc(100vh - 180px);
  }
}

// Mobile conversation card
.conversation-card-mobile {
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
}

// Desktop messages container
.messages-container {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 400px);

  @media (max-width: 1023px) {
    max-height: calc(100vh - 350px);
  }
}

// Mobile messages container
.messages-container-mobile {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;

  &.message-client {
    flex-direction: row;

    .message-content {
      background: $primary;
      color: white;
    }
  }

  &.message-staff {
    flex-direction: row-reverse;

    .message-content {
      background: $grey-3;
      color: $grey-9;
    }
  }
}

.message-content {
  max-width: 70%;
  border-radius: 8px;
  padding: 12px;

  @media (max-width: 767px) {
    max-width: 85%;
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.message-sender {
  font-weight: 600;
}

.message-time {
  font-size: 11px;
}

.message-body {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-attachments {
  margin-top: 8px;
}
</style>
