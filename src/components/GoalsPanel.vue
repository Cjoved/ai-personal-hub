<script setup>
import { computed } from 'vue'
import GoalCard from './GoalCard.vue'
import { canDeleteGoal, isGoalEnded } from '../composables/useGoals'

const props = defineProps({
  goals: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['create-goal', 'edit-goal', 'delete-goal'])

const activeGoals = computed(() =>
  props.goals
    .filter((goal) => !isGoalEnded(goal))
    .sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at)),
)

const endedGoals = computed(() =>
  props.goals
    .filter((goal) => isGoalEnded(goal))
    .sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at)),
)
</script>

<template>
  <section class="space-y-5">
    <div class="shell-header flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="type-page-title text-slate-950 dark:text-slate-100">Goals</h2>
        <p class="type-body-sm type-muted mt-1">
          Motivational reminders with a countdown. Active goals show on your dashboard until the timeframe ends.
        </p>
      </div>
      <button
        class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-emerald-400"
        type="button"
        @click="$emit('create-goal')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Goal
      </button>
    </div>

    <div
      v-if="isLoading"
      class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
    >
      Loading your goals...
    </div>

    <template v-else>
      <div v-if="activeGoals.length" class="space-y-4">
        <h3 class="type-kicker flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          Active goals
        </h3>
        <div class="grid gap-4 xl:grid-cols-2">
          <GoalCard
            v-for="goal in activeGoals"
            :key="goal.id"
            :goal="goal"
            @edit="$emit('edit-goal', $event)"
          />
        </div>
      </div>

      <div
        v-else
        class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-900"
      >
        <p class="text-3xl">🎯</p>
        <p class="type-card-title mt-3 text-slate-900 dark:text-slate-100">No active goal yet</p>
        <p class="type-body-sm type-muted mt-1">Create one with a timeframe and it will appear on your dashboard.</p>
        <button
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
          type="button"
          @click="$emit('create-goal')"
        >
          Create Goal
        </button>
      </div>

      <div v-if="endedGoals.length" class="space-y-4">
        <h3 class="type-kicker flex items-center gap-2 text-slate-500">
          <span class="h-2 w-2 rounded-full bg-slate-400"></span>
          Ended goals
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GoalCard
            v-for="goal in endedGoals"
            :key="goal.id"
            :goal="goal"
            ended
            :can-delete="canDeleteGoal(goal)"
            @delete="$emit('delete-goal', $event)"
          />
        </div>
      </div>
    </template>
  </section>
</template>
