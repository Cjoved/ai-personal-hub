<script setup>
import { computed, ref } from 'vue'
import QuickAddTask from './QuickAddTask.vue'
import TaskFilterMenu from './TaskFilterMenu.vue'
import ThemeToggle from './ThemeToggle.vue'
import ViewTabs from './ViewTabs.vue'

const props = defineProps({
  locationLabel: {
    type: String,
    required: true,
  },
  isDashboard: {
    type: Boolean,
    default: false,
  },
  isSpacesOverview: {
    type: Boolean,
    default: false,
  },
  activeSpace: {
    type: Object,
    default: null,
  },
  activeList: {
    type: Object,
    default: null,
  },
  isSpaceSummary: {
    type: Boolean,
    default: false,
  },
  activeView: {
    type: String,
    required: true,
  },
  selectedFilter: {
    type: String,
    default: 'all',
  },
  selectedTag: {
    type: String,
    default: '',
  },
  allTags: {
    type: Array,
    default: () => [],
  },
  searchQuery: {
    type: String,
    default: '',
  },
  userEmail: {
    type: String,
    default: '',
  },
  workspaceError: {
    type: String,
    default: '',
  },
  showQuickAdd: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:activeView',
  'update:searchQuery',
  'update:selectedFilter',
  'update:selectedTag',
  'sign-out',
  'add-task',
  'quick-add-task',
  'open-settings',
  'toggle-sidebar',
])

const searchInputRef = ref(null)

const pageTitle = computed(() => {
  if (props.isDashboard) return 'Dashboard'
  if (props.isSpacesOverview) return 'Spaces'
  if (props.isSpaceSummary && props.activeSpace) return `${props.activeSpace.name} Dashboard`
  return props.activeList?.name || props.activeSpace?.name || 'Workspace'
})

const contextLabel = computed(() => {
  if (props.isDashboard) return 'Home'
  if (props.isSpacesOverview) return 'Workspace'
  if (props.isSpaceSummary) return 'Space dashboard'
  return 'Workspace location'
})

const userInitial = computed(() => props.userEmail?.charAt(0)?.toUpperCase() || 'U')

function focusSearch() {
  searchInputRef.value?.focus()
}

defineExpose({ focusSearch })
</script>

<template>
  <header class="shell-header relative overflow-hidden rounded-2xl p-5 sm:p-6">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500"></div>
    <div class="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-1/4 -translate-y-1/4 rounded-full bg-emerald-400/10 blur-3xl"></div>

    <div class="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0 flex items-start gap-3">
        <button
          class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200/90 bg-white/80 text-slate-700 lg:hidden"
          type="button"
          aria-label="Open navigation"
          @click="emit('toggle-sidebar')"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="grid h-8 w-8 place-items-center rounded-lg ring-1"
              :class="isSpaceSummary ? 'text-white ring-white/20' : 'bg-slate-900 text-emerald-300 ring-slate-200/80'"
              :style="isSpaceSummary && activeSpace?.color ? { background: activeSpace.color } : undefined"
            >
              <svg v-if="isDashboard" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V20h14V9.5" />
              </svg>
              <svg v-else-if="isSpacesOverview" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <svg v-else-if="isSpaceSummary" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7h16M4 12h10M4 17h7" />
              </svg>
            </span>
            <p class="type-kicker text-slate-500">{{ contextLabel }}</p>
          </div>

          <h2 class="type-page-title mt-3 text-slate-950 dark:text-slate-100">
            {{ pageTitle }}
          </h2>
          <p v-if="!activeList" class="type-body-sm type-muted mt-1.5 max-w-xl">{{ locationLabel }}</p>
        </div>
      </div>

      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto xl:justify-end">
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 text-slate-500 shadow-sm transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10 sm:min-w-72">
          <svg class="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="searchInputRef"
            class="type-input min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            :value="searchQuery"
            placeholder="Search tasks..."
            @input="emit('update:searchQuery', $event.target.value)"
          />
          <kbd class="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:inline">Ctrl K</kbd>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <button
            class="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/90 bg-white/80 text-slate-600 transition hover:bg-slate-50"
            type="button"
            title="Settings"
            aria-label="Open settings"
            @click="emit('open-settings')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>

          <ThemeToggle />

          <span class="toolbar-chip-neon type-body-sm flex min-w-0 max-w-64 items-center gap-2 truncate rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-slate-600 dark:border-cyan-400/30 dark:bg-indigo-500/10 dark:text-cyan-200">
            <span class="type-badge grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white">
              {{ userInitial }}
            </span>
            <span class="hidden truncate sm:inline">{{ userEmail }}</span>
          </span>

          <button
            class="type-button shrink-0 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-500/10 dark:border-slate-600/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-rose-500/40 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            type="button"
            @click="emit('sign-out')"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>

    <p v-if="workspaceError" class="relative mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {{ workspaceError }}
    </p>

    <div v-if="showQuickAdd" class="relative mt-4 border-t border-slate-200/80 pt-4">
      <QuickAddTask @add-task="emit('quick-add-task', $event)" />
    </div>

    <div
      v-if="activeList"
      class="relative mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4"
    >
      <ViewTabs :model-value="activeView" @update:model-value="emit('update:activeView', $event)" />

      <span class="hidden h-6 w-px bg-slate-200 sm:block"></span>

      <TaskFilterMenu :model-value="selectedFilter" @update:model-value="emit('update:selectedFilter', $event)" />

      <select
        v-if="allTags.length"
        class="type-input rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/60"
        :value="selectedTag"
        @change="emit('update:selectedTag', $event.target.value)"
      >
        <option value="">All tags</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>

      <button
        class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
        type="button"
        title="Add task (N)"
        aria-label="Add task"
        @click="emit('add-task')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  </header>
</template>
