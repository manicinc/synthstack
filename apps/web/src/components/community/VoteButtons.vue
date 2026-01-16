<template>
  <div class="column items-center q-gutter-y-sm vote-buttons">
    <q-btn 
      flat 
      round 
      dense 
      icon="keyboard_arrow_up" 
      :color="userVote === 'up' ? 'primary' : 'grey-6'"
      size="lg"
      @click="handleVote('up')"
    />
    <div class="text-h6 text-weight-bold">
      {{ score }}
    </div>
    <q-btn 
      flat 
      round 
      dense 
      icon="keyboard_arrow_down" 
      :color="userVote === 'down' ? 'negative' : 'grey-6'"
      size="lg"
      @click="handleVote('down')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  initialScore: number
  initialVote?: 'up' | 'down' | null
}>()

const emit = defineEmits(['vote'])

const score = ref(props.initialScore)
const userVote = ref(props.initialVote || null)

const handleVote = (direction: 'up' | 'down') => {
  if (userVote.value === direction) {
    // Remove vote
    score.value += direction === 'up' ? -1 : 1
    userVote.value = null
  } else {
    // Change vote or new vote
    if (userVote.value === 'up') score.value -= 1
    if (userVote.value === 'down') score.value += 1
    
    score.value += direction === 'up' ? 1 : -1
    userVote.value = direction
  }
  
  emit('vote', direction)
}
</script>

<style scoped>
.vote-buttons {
  min-width: 40px;
}
</style>





