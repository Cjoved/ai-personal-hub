<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  spaces: {
    type: Array,
    required: true,
  },
  lists: {
    type: Array,
    required: true,
  },
  createSpace: {
    type: Function,
    required: true,
  },
  createList: {
    type: Function,
    required: true,
  },
  deleteSpace: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['select-space', 'select-list'])

const spaceName = ref('')
const addingListSpaceId = ref(null)
const listName = ref('')
const isCreatingSpace = ref(false)
const isCreatingList = ref(false)
const deletingSpaceId = ref(null)

const spaceCards = computed(() =>
  props.spaces.map((space) => ({
    ...space,
    lists: props.lists.filter((list) => list.space_id === space.id),
  })),
)

async function submitSpace() {
  if (!spaceName.value.trim() || isCreatingSpace.value) return

  isCreatingSpace.value = true
  const didCreate = await props.createSpace(spaceName.value)
  if (didCreate) spaceName.value = ''
  isCreatingSpace.value = false
}

function startList(spaceId) {
  addingListSpaceId.value = spaceId
  listName.value = ''
}

async function submitList(spaceId) {
  if (!listName.value.trim() || isCreatingList.value) return

  isCreatingList.value = true
  const didCreate = await props.createList(spaceId, listName.value)
  if (didCreate) {
    listName.value = ''
    addingListSpaceId.value = null
  }
  isCreatingList.value = false
}

async function handleDeleteSpace(space) {
  const shouldDelete = globalThis.confirm(
    `Delete "${space.name}"? This will permanently remove all lists, tasks, and subtasks in this space.`,
  )
  if (!shouldDelete || deletingSpaceId.value) return

  deletingSpaceId.value = space.id
  await props.deleteSpace(space.id)
  deletingSpaceId.value = null
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-2xl font-black tracking-tight text-slate-950">Spaces</h2>
        <p class="mt-1 text-sm text-slate-500">Organize your projects into collaborative spaces.</p>
      </div>

      <form class="flex w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:w-auto" @submit.prevent="submitSpace">
        <input
          v-model.trim="spaceName"
          class="min-w-0 flex-1 rounded-xl border border-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-64"
          placeholder="New space name..."
        />
        <button
          class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          :disabled="isCreatingSpace || !spaceName.trim()"
        >
          Add Space
        </button>
      </form>
    </div>

    <div class="grid gap-5 xl:grid-cols-3">
      <article
        v-for="space in spaceCards"
        :key="space.id"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="h-1.5" :style="{ background: space.color || '#64748b' }"></div>
        <div class="p-5">
          <div class="mb-5 flex items-start justify-between gap-4">
            <button class="flex min-w-0 items-center gap-3 text-left" type="button" @click="emit('select-space', space.id)">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" :style="{ background: space.color || '#64748b' }">
                {{ space.icon || space.name.slice(0, 1).toUpperCase() }}
              </span>
              <span class="min-w-0">
                <strong class="block truncate text-sm font-black text-slate-950">{{ space.name }}</strong>
                <small class="text-xs text-slate-500">{{ space.lists.length }} projects</small>
              </span>
            </button>

            <div class="flex shrink-0 flex-col items-end gap-2">
              <button class="text-xs font-bold text-emerald-700 transition hover:text-emerald-600" type="button" @click="emit('select-space', space.id)">
                Summary
              </button>
              <button
                class="text-xs font-bold text-rose-600 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="deletingSpaceId === space.id"
                @click="handleDeleteSpace(space)"
              >
                Delete Space
              </button>
            </div>
          </div>

          <div class="min-h-44 space-y-2">
            <button
              v-for="list in space.lists"
              :key="list.id"
              class="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50"
              type="button"
              @click="emit('select-list', list.id)"
            >
              <span class="min-w-0 truncate text-sm font-medium text-slate-700">
                <span class="mr-2 inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
                {{ list.name }}
              </span>
              <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Active</span>
            </button>

            <p v-if="!space.lists.length" class="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              No projects yet
            </p>
          </div>

          <form v-if="addingListSpaceId === space.id" class="mt-4 flex gap-2" @submit.prevent="submitList(space.id)">
            <input
              v-model.trim="listName"
              class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Project name..."
              autofocus
              @keydown.esc="addingListSpaceId = null"
            />
            <button
              class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              :disabled="isCreatingList || !listName.trim()"
            >
              Add
            </button>
          </form>

          <button
            v-else
            class="mt-4 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            type="button"
            @click="startList(space.id)"
          >
            + Add Project
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
