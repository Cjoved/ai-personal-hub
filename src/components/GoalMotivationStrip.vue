<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GoalMotivationBanner from './GoalMotivationBanner.vue'

const props = defineProps({
  goals: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['go-to-goals'])

const isMobile = ref(false)
let mediaQuery = null

function syncViewport() {
  isMobile.value = Boolean(mediaQuery?.matches)
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 639px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
})

const maxVisible = computed(() => (isMobile.value ? 1 : 3))
const visibleGoals = computed(() => props.goals.slice(0, maxVisible.value))
const hasMore = computed(() => props.goals.length > maxVisible.value)
const moreCount = computed(() => Math.max(0, props.goals.length - maxVisible.value))
</script>

<template>
  <div v-if="goals.length" class="goal-motivation-strip flex min-w-0 flex-1 items-stretch gap-2">
    <GoalMotivationBanner
      v-for="goal in visibleGoals"
      :key="goal.id"
      :goal="goal"
      compact
      class="goal-motivation-strip__item min-w-0"
      :class="visibleGoals.length === 1 ? 'flex-1' : 'flex-1 basis-0'"
      @go-to-goals="emit('go-to-goals')"
    />

    <button
      v-if="hasMore"
      class="goal-strip-more-btn shrink-0"
      type="button"
      :title="`View ${moreCount} more goal${moreCount === 1 ? '' : 's'}`"
      :aria-label="`View ${moreCount} more goals`"
      @click="emit('go-to-goals')"
    >
      <span class="text-lg font-extrabold leading-none tracking-widest">···</span>
      <span class="goal-strip-more-count">+{{ moreCount }}</span>
    </button>
  </div>

  <GoalMotivationBanner
    v-else
    class="min-w-0 flex-1"
    @go-to-goals="emit('go-to-goals')"
  />
</template>

<style scoped>
.goal-motivation-strip {
  overflow-x: auto;
  scrollbar-width: none;
}

.goal-motivation-strip::-webkit-scrollbar {
  display: none;
}

.goal-motivation-strip__item {
  min-width: 0;
  max-width: 100%;
}

@media (min-width: 640px) {
  .goal-motivation-strip__item {
    min-width: 11rem;
  }
}

.goal-strip-more-btn {
  display: flex;
  height: 2.5rem;
  width: 2.75rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  align-self: center;
  border-radius: 0.75rem;
  border: 1px dashed rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(100 116 139);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.goal-strip-more-btn:hover {
  border-color: rgb(52 211 153 / 0.55);
  background: rgb(236 253 245);
  color: rgb(5 150 105);
}

.dark .goal-strip-more-btn {
  border-color: rgb(71 85 105);
  background: rgb(30 41 59 / 0.55);
  color: rgb(148 163 184);
}

.dark .goal-strip-more-btn:hover {
  border-color: rgb(52 211 153 / 0.35);
  background: rgb(6 78 59 / 0.2);
  color: rgb(52 211 153);
}

.goal-strip-more-count {
  font-size: 0.6rem;
  font-weight: 800;
  line-height: 1;
}
</style>
