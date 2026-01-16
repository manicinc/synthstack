<template>
  <div class="comment-section">
    <div class="text-h6 q-mb-md">
      Comments ({{ comments.length }})
    </div>
    
    <!-- Add Comment -->
    <div class="row q-mb-lg q-gutter-x-md">
      <q-avatar>
        <img src="https://cdn.quasar.dev/img/boy-avatar.png" alt="User avatar">
      </q-avatar>
      <div class="col">
        <q-input
          v-model="newComment"
          outlined
          dense
          autogrow
          placeholder="Add a comment..."
          bg-color="dark"
        >
          <template #after>
            <q-btn
              round
              dense
              flat
              icon="send"
              color="primary"
              :disable="!newComment.trim()"
              @click="submitComment"
            />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Comment List -->
    <q-list class="q-gutter-y-md">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="row q-col-gutter-x-md"
      >
        <div class="col-auto">
          <q-avatar size="md">
            <img :src="comment.userAvatar || 'https://cdn.quasar.dev/img/boy-avatar.png'" :alt="comment.userName + ' avatar'">
          </q-avatar>
        </div>
        <div class="col">
          <div class="row items-center q-gutter-x-sm">
            <div class="text-subtitle2">
              {{ comment.userName }}
            </div>
            <div class="text-caption text-grey-6">
              {{ formatDate(comment.createdAt) }}
            </div>
          </div>
          <div class="text-body2 q-mt-xs">
            {{ comment.content }}
          </div>
        </div>
      </div>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'
import { date } from 'quasar'

interface Comment {
  id: string
  userId?: string
  userName: string
  userAvatar?: string | null
  content: string
  createdAt: string
}

const props = defineProps({
  comments: {
    type: Array as PropType<Comment[]>,
    default: () => []
  }
})

const emit = defineEmits(['add-comment'])

const newComment = ref('')

const submitComment = () => {
  if (!newComment.value.trim()) return
  emit('add-comment', newComment.value)
  newComment.value = ''
}

const formatDate = (isoString: string) => {
  return date.formatDate(isoString, 'MMM D, YYYY')
}
</script>


