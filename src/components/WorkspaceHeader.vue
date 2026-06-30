<script setup>
import ViewTabs from './ViewTabs.vue'

defineProps({
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
  activeView: {
    type: String,
    required: true,
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
})

const emit = defineEmits(['update:activeView', 'update:searchQuery', 'sign-out'])
</script>

<template>
  <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {{ isDashboard ? 'Home' : isSpacesOverview ? 'Workspace' : 'Workspace location' }}
        </p>
        <h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {{ isDashboard ? 'Dashboard' : isSpacesOverview ? 'Spaces' : activeList?.name || activeSpace?.name || 'Workspace' }}
        </h2>
        <p class="mt-2 text-sm text-slate-500">{{ locationLabel }}</p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex min-w-72 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-500">
          <input
            class="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            :value="searchQuery"
            placeholder="Search tasks..."
            @input="emit('update:searchQuery', $event.target.value)"
          />
          <kbd class="ml-auto text-xs text-slate-400">Ctrl K</kbd>
        </div>
        <span class="max-w-64 truncate rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
          {{ userEmail }}
        </span>
        <button
          class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-900 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          type="button"
          @click="emit('sign-out')"
        >
          Sign out
        </button>
      </div>
    </div>

    <p v-if="workspaceError" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {{ workspaceError }}
    </p>

    <div v-if="activeList" class="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
      <ViewTabs :model-value="activeView" @update:model-value="emit('update:activeView', $event)" />
      <p class="text-sm text-slate-500">
        Tasks are scoped to this List
      </p>
    </div>
  </header>
</template>
