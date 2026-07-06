<script setup>
import { computed } from 'vue'
import GoalMotivationBanner from './GoalMotivationBanner.vue'
import { canDeleteGoal, formatGoalCountdown, formatGoalDate, isGoalEnded } from '../composables/useGoals'

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
        class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/20"
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
        <h3 class="type-kicker text-slate-700 dark:text-slate-300">Active goals</h3>
        <div class="grid gap-4 xl:grid-cols-2">
          <article
            v-for="goal in activeGoals"
            :key="goal.id"
            class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <GoalMotivationBanner :goal="goal" />
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <p class="type-caption type-muted">
                {{ formatGoalDate(goal.starts_at) }} → {{ formatGoalDate(goal.ends_at) }}
                <span class="mx-1">·</span>
                {{ formatGoalCountdown(goal) }}
              </p>
              <div class="flex gap-2">
                <button
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  type="button"
                  @click="$emit('edit-goal', goal)"
                >
                  Edit
                </button>
                <button
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400 dark:border-slate-700"
                  type="button"
                  disabled
                  title="Delete becomes available after the timeframe ends"
                >
                  Locked
                </button>
              </div>
            </div>
          </article>
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
        <h3 class="type-kicker text-slate-500">Ended goals</h3>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="goal in endedGoals"
            :key="goal.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="type-card-title truncate text-slate-900 dark:text-slate-100">{{ goal.title }}</p>
                <p class="type-caption type-muted mt-1">Ended {{ formatGoalDate(goal.ends_at) }}</p>
              </div>
              <button
                v-if="canDeleteGoal(goal)"
                class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
                type="button"
                @click="$emit('delete-goal', goal.id)"
              >
                Delete
              </button>
            </div>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>
