<script setup>
import { ref, watch } from 'vue'
import AppLogo from './AppLogo.vue'

const props = defineProps({
  spaces: {
    type: Array,
    required: true,
  },
  lists: {
    type: Array,
    required: true,
  },
  activeSpaceId: {
    type: String,
    default: null,
  },
  activeListId: {
    type: String,
    default: null,
  },
  isDashboard: {
    type: Boolean,
    default: true,
  },
  isSpacesOverview: {
    type: Boolean,
    default: false,
  },
  createList: {
    type: Function,
    required: true,
  },
  updateList: {
    type: Function,
    default: null,
  },
  deleteList: {
    type: Function,
    default: null,
  },
  userEmail: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-dashboard', 'select-spaces', 'select-space', 'select-list', 'close', 'open-settings', 'sign-out'])

const expandedSpaceIds = ref(new Set())
const addingSpaceId = ref(null)
const draftListName = ref('')
const editingListId = ref(null)
const listEditName = ref('')

function listsForSpace(lists, spaceId) {
  return lists.filter((list) => list.space_id === spaceId)
}

function isExpanded(spaceId) {
  return expandedSpaceIds.value.has(spaceId)
}

function toggleSpace(spaceId) {
  const next = new Set(expandedSpaceIds.value)
  if (next.has(spaceId)) next.delete(spaceId)
  else next.add(spaceId)
  expandedSpaceIds.value = next
}

function selectSpace(spaceId) {
  expandedSpaceIds.value = new Set(expandedSpaceIds.value).add(spaceId)
  emit('select-space', spaceId)
}

function startAddList(spaceId) {
  expandedSpaceIds.value = new Set(expandedSpaceIds.value).add(spaceId)
  addingSpaceId.value = spaceId
  draftListName.value = ''
}

async function submitList(spaceId) {
  const name = draftListName.value.trim()
  if (!name) return

  const didCreate = await props.createList(spaceId, name)
  if (didCreate) {
    draftListName.value = ''
    addingSpaceId.value = null
  }
}

function startEditList(list) {
  editingListId.value = list.id
  listEditName.value = list.name
}

async function saveListEdit(listId) {
  if (!props.updateList || !listEditName.value.trim()) return
  const didUpdate = await props.updateList(listId, { name: listEditName.value.trim() })
  if (didUpdate) editingListId.value = null
}

async function removeList(listId) {
  if (!props.deleteList) return
  await props.deleteList(listId)
}

function navItemClass(isActive) {
  return isActive
    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgb(52,211,153)] ring-1 ring-white/10'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'
}

watch(
  () => props.activeSpaceId,
  (spaceId) => {
    if (!spaceId) return
    expandedSpaceIds.value = new Set(expandedSpaceIds.value).add(spaceId)
  },
  { immediate: true },
)
</script>

<template>
  <aside class="sidebar-shell flex h-full min-h-0 flex-col overflow-hidden px-3 py-4 text-slate-200 lg:h-dvh lg:w-72">
    <div class="relative mb-4 flex shrink-0 items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_rgb(255,255,255,0.06)]">
      <AppLogo variant="sidebar" />
      <button
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
        type="button"
        aria-label="Close navigation"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
      <button
        class="type-nav flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition"
        :class="navItemClass(isDashboard)"
        type="button"
        @click="emit('select-dashboard')"
      >
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-emerald-300 ring-1 ring-white/10">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20h14V9.5" />
          </svg>
        </span>
        <span class="flex-1 text-left">Dashboard</span>
        <span v-if="isDashboard" class="type-badge rounded-full bg-emerald-500/20 px-2 py-0.5 uppercase tracking-wide text-emerald-300">
          Active
        </span>
      </button>

      <section>
        <div class="mb-2 flex items-center justify-between px-2">
          <button
            class="type-kicker flex items-center gap-2 rounded-lg px-1 transition"
            :class="isSpacesOverview ? 'text-emerald-300' : 'text-slate-400 hover:text-white'"
            type="button"
            @click="emit('select-spaces')"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Spaces
          </button>
        </div>

        <div class="space-y-1.5">
          <div v-for="space in spaces" :key="space.id" class="rounded-xl">
            <div
              class="grid grid-cols-[1fr_auto_auto] items-center rounded-xl transition"
              :class="navItemClass(activeSpaceId === space.id && !activeListId)"
            >
              <button class="type-body-sm flex min-w-0 items-center gap-3 px-3 py-2 text-left font-semibold" type="button" @click="selectSpace(space.id)">
                <span
                  class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white shadow-sm ring-1 ring-white/15"
                  :style="{ background: space.color || '#475569' }"
                >
                  {{ space.icon || space.name.slice(0, 1).toUpperCase() }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ space.name }}</span>
              </button>

              <button
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-emerald-300"
                title="Add list"
                type="button"
                @click.stop="startAddList(space.id)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              <button
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                :title="isExpanded(space.id) ? 'Collapse' : 'Expand'"
                type="button"
                @click.stop="toggleSpace(space.id)"
              >
                <svg
                  class="h-4 w-4 transition-transform duration-200"
                  :class="isExpanded(space.id) ? 'rotate-90' : ''"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div v-if="isExpanded(space.id)" class="relative ml-5 space-y-0.5 border-l border-white/10 py-1 pl-4 pr-2">
              <div
                v-for="list in listsForSpace(lists, space.id)"
                :key="list.id"
                class="group flex items-center gap-1"
              >
                <form v-if="editingListId === list.id" class="flex min-w-0 flex-1 gap-1" @submit.prevent="saveListEdit(list.id)">
                  <input v-model.trim="listEditName" class="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white" autofocus />
                  <button class="rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white" type="submit">Save</button>
                </form>
                <template v-else>
                  <button
                    class="type-body-sm flex min-w-0 flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-left transition"
                    :class="
                      activeListId === list.id
                        ? 'bg-white/10 font-semibold text-white shadow-[inset_2px_0_0_0_rgb(52,211,153)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    "
                    type="button"
                    @click="emit('select-list', list.id)"
                  >
                    <svg class="h-3.5 w-3.5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 7h16M4 12h10M4 17h7" />
                    </svg>
                    <span class="truncate">{{ list.name }}</span>
                  </button>
                  <div class="sidebar-list-actions shrink-0 items-center gap-0.5">
                    <button
                      v-if="updateList"
                      class="sidebar-list-action sidebar-list-action--edit"
                      type="button"
                      title="Rename list"
                      aria-label="Rename list"
                      @click.stop="startEditList(list)"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      v-if="deleteList"
                      class="sidebar-list-action sidebar-list-action--delete"
                      type="button"
                      title="Delete list"
                      aria-label="Delete list"
                      @click.stop="removeList(list.id)"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </template>
              </div>

              <form v-if="addingSpaceId === space.id" class="pt-1" @submit.prevent="submitList(space.id)">
                <input
                  v-model.trim="draftListName"
                  class="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/15"
                  placeholder="Project name..."
                  autofocus
                  @keydown.esc="addingSpaceId = null"
                />
              </form>
            </div>
          </div>
        </div>
      </section>
    </nav>

    <div class="relative mt-3 shrink-0 border-t border-white/10 pt-3">
      <div class="mb-3 flex items-center gap-2">
        <button
          class="type-body-sm flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          type="button"
          title="Settings"
          @click="emit('open-settings')"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          Settings
        </button>
        <button
          class="type-body-sm flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
          type="button"
          title="Sign out"
          @click="emit('sign-out')"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>

      <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <span class="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white ring-1 ring-white/10">
          {{ userEmail?.charAt(0)?.toUpperCase() || 'U' }}
          <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400"></span>
        </span>
        <div class="min-w-0">
          <strong class="block truncate text-sm text-white">{{ userEmail || 'User' }}</strong>
          <small class="text-xs text-slate-400">Personal workspace</small>
        </div>
      </div>
    </div>
  </aside>
</template>
