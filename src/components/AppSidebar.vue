<script setup>
import { ref } from 'vue'

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
})

const emit = defineEmits(['select-dashboard', 'select-spaces', 'select-space', 'select-list'])

const expandedSpaceIds = ref(new Set())
const addingSpaceId = ref(null)
const draftListName = ref('')

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
</script>

<template>
  <aside class="flex h-full min-h-screen w-full flex-col bg-slate-900 px-3.5 py-4 text-slate-200 lg:w-72">
    <div class="mb-6 flex items-center gap-3 px-2">
      <span class="grid h-9 w-9 place-items-center rounded-xl border border-slate-600 bg-slate-800 text-sm font-black text-white">
        D
      </span>
      <div>
        <p class="text-sm font-black text-white">Default Personal</p>
        <p class="text-xs text-slate-400">Task workspace</p>
      </div>
    </div>

    <nav class="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
      <button
        class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition"
        :class="isDashboard ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
        type="button"
        @click="emit('select-dashboard')"
      >
        <span>Dashboard</span>
        <span class="text-xs opacity-70">Dashboard</span>
      </button>

      <section>
        <div class="mb-2 flex items-center justify-between px-2">
          <button
            class="rounded-lg px-1 text-xs font-bold uppercase tracking-[0.16em] transition"
            :class="isSpacesOverview ? 'text-white' : 'text-slate-400 hover:text-white'"
            type="button"
            @click="emit('select-spaces')"
          >
            Spaces
          </button>
        </div>

        <div class="space-y-1">
          <div v-for="space in spaces" :key="space.id" class="rounded-xl">
            <div
              class="grid grid-cols-[1fr_auto_auto] items-center rounded-xl transition"
              :class="
                activeSpaceId === space.id && !activeListId
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
            >
              <button class="flex min-w-0 items-center gap-3 px-3 py-2 text-left text-sm font-semibold" type="button" @click="selectSpace(space.id)">
                <span class="grid h-6 w-6 place-items-center rounded-lg text-xs font-black text-white" :style="{ background: space.color || '#475569' }">
                  {{ space.icon || space.name.slice(0, 1).toUpperCase() }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ space.name }}</span>
              </button>

              <button
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-700 hover:text-white"
                title="Add list"
                type="button"
                @click.stop="startAddList(space.id)"
              >
                +
              </button>

              <button
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-700 hover:text-white"
                :title="isExpanded(space.id) ? 'Collapse' : 'Expand'"
                type="button"
                @click.stop="toggleSpace(space.id)"
              >
                <span class="block text-xs leading-none transition-transform" :class="isExpanded(space.id) ? 'rotate-90' : ''">
                  ›
                </span>
              </button>
            </div>

            <div v-if="isExpanded(space.id)" class="space-y-0.5 pb-2 pl-11 pr-2">
              <button
                v-for="list in listsForSpace(lists, space.id)"
                :key="list.id"
                class="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition"
                :class="
                  activeListId === list.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                "
                type="button"
                @click="emit('select-list', list.id)"
              >
                {{ list.name }}
              </button>

              <form v-if="addingSpaceId === space.id" class="pt-1" @submit.prevent="submitList(space.id)">
                <input
                  v-model.trim="draftListName"
                  class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
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

    <div class="mt-4 border-t border-slate-700 pt-4">
      <div class="flex items-center gap-3 pt-2">
        <span class="grid h-9 w-9 place-items-center rounded-xl border border-slate-600 bg-slate-800 text-xs font-bold text-white">
          CV
        </span>
        <div>
          <strong class="block text-sm text-white">Crich Joved</strong>
          <small class="text-xs text-slate-400">Personal workspace</small>
        </div>
      </div>
    </div>
  </aside>
</template>
