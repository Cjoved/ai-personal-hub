<script setup>
import { computed, reactive, ref } from 'vue'
import { useConfirm } from '../composables/useConfirm'

const props = defineProps({
  spaces: { type: Array, required: true },
  lists: { type: Array, required: true },
  createSpace: { type: Function, required: true },
  createList: { type: Function, required: true },
  updateSpace: { type: Function, required: true },
  updateList: { type: Function, required: true },
  deleteSpace: { type: Function, required: true },
  deleteList: { type: Function, required: true },
  reorderSpaces: { type: Function, default: null },
})

const emit = defineEmits(['select-space', 'select-list'])
const { confirm, confirmDelete } = useConfirm()

const spaceName = ref('')
const addingListSpaceId = ref(null)
const listName = ref('')
const isCreatingSpace = ref(false)
const isCreatingList = ref(false)
const deletingSpaceId = ref(null)
const editingSpaceId = ref(null)
const editingListId = ref(null)
const spaceEditForm = reactive({ name: '', icon: '', color: '#6366f1' })
const listEditName = ref('')
const draggingSpaceId = ref(null)

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

function startEditSpace(space) {
  editingSpaceId.value = space.id
  spaceEditForm.name = space.name
  spaceEditForm.icon = space.icon || space.name.slice(0, 1).toUpperCase()
  spaceEditForm.color = space.color || '#6366f1'
}

async function saveSpaceEdit(spaceId) {
  if (!spaceEditForm.name.trim()) return
  const didUpdate = await props.updateSpace(spaceId, {
    name: spaceEditForm.name.trim(),
    icon: spaceEditForm.icon.trim().slice(0, 1).toUpperCase(),
    color: spaceEditForm.color,
  })
  if (didUpdate) editingSpaceId.value = null
}

function startEditList(list) {
  editingListId.value = list.id
  listEditName.value = list.name
}

async function saveListEdit(listId) {
  if (!listEditName.value.trim()) return
  const didUpdate = await props.updateList(listId, { name: listEditName.value.trim() })
  if (didUpdate) editingListId.value = null
}

async function handleDeleteSpace(space) {
  const confirmed = await confirm({
    title: `Delete "${space.name}"?`,
    message: 'This will permanently remove all lists, tasks, and subtasks in this space.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    tone: 'danger',
  })
  if (!confirmed || deletingSpaceId.value) return
  deletingSpaceId.value = space.id
  await props.deleteSpace(space.id)
  deletingSpaceId.value = null
}

async function handleDeleteList(list) {
  const confirmed = await confirmDelete('list', list.name)
  if (!confirmed) return
  await props.deleteList(list.id)
}

function onSpaceDragStart(spaceId) {
  draggingSpaceId.value = spaceId
}

async function onSpaceDrop(targetId) {
  if (!props.reorderSpaces || !draggingSpaceId.value) return
  const ids = props.spaces.map((space) => space.id)
  const from = ids.indexOf(draggingSpaceId.value)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return
  ids.splice(from, 1)
  ids.splice(to, 0, draggingSpaceId.value)
  draggingSpaceId.value = null
  await props.reorderSpaces(ids)
}

function spaceStyle(space) {
  return { '--space-color': space.color || '#6366f1' }
}
</script>

<template>
  <section class="space-y-5">
    <div class="shell-header flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="type-page-title text-slate-950 dark:text-slate-100">Spaces</h2>
        <p class="type-body-sm type-muted mt-1">Organize projects into spaces. Drag cards to reorder.</p>
      </div>
      <form class="flex w-full gap-2 sm:w-auto" @submit.prevent="submitSpace">
        <input v-model.trim="spaceName" class="type-input min-w-0 flex-1 rounded-xl border px-3 py-2.5 sm:w-64" placeholder="New space name..." />
        <button class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white disabled:opacity-50" type="submit" :disabled="isCreatingSpace || !spaceName.trim()">+</button>
      </form>
    </div>

    <div class="spaces-overview-grid">
      <article
        v-for="space in spaceCards"
        :key="space.id"
        class="neon-space-card dashboard-card overflow-hidden rounded-2xl"
        :style="spaceStyle(space)"
        draggable="true"
        @dragstart="onSpaceDragStart(space.id)"
        @dragover.prevent
        @drop="onSpaceDrop(space.id)"
      >
        <div class="h-1.5" :style="{ background: space.color || '#6366f1' }"></div>
        <div class="p-5">
          <div v-if="editingSpaceId === space.id" class="mb-5 space-y-2">
            <input v-model.trim="spaceEditForm.name" class="type-input w-full rounded-xl border px-3 py-2" />
            <div class="flex gap-2">
              <input v-model.trim="spaceEditForm.icon" maxlength="1" class="type-input w-16 rounded-xl border px-3 py-2 text-center uppercase" />
              <input v-model="spaceEditForm.color" type="color" class="h-10 w-16 rounded-xl border" />
              <button class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white" type="button" @click="saveSpaceEdit(space.id)">Save</button>
              <button class="rounded-xl border px-3 py-2 text-sm font-bold" type="button" @click="editingSpaceId = null">Cancel</button>
            </div>
          </div>

          <div v-else class="mb-5 flex items-start justify-between gap-3">
            <button class="flex min-w-0 items-center gap-3 text-left" type="button" @click="emit('select-space', space.id)">
              <span class="grid h-10 w-10 place-items-center rounded-xl text-sm font-black text-white" :style="{ background: space.color || '#6366f1' }">
                {{ space.icon || space.name.slice(0, 1).toUpperCase() }}
              </span>
              <span class="min-w-0">
                <strong class="type-card-title block truncate">{{ space.name }}</strong>
                <small class="type-caption type-muted">{{ space.lists.length }} projects</small>
              </span>
            </button>
            <div class="flex gap-1.5">
              <button class="grid h-9 w-9 place-items-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700" type="button" @click="startEditSpace(space)">✎</button>
              <button class="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 disabled:opacity-50" type="button" :disabled="deletingSpaceId === space.id" @click="handleDeleteSpace(space)">🗑</button>
            </div>
          </div>

          <div class="min-h-40 space-y-1.5">
            <div v-for="list in space.lists" :key="list.id" class="neon-space-list-row rounded-xl px-2.5 py-2">
              <form v-if="editingListId === list.id" class="flex gap-2" @submit.prevent="saveListEdit(list.id)">
                <input v-model.trim="listEditName" class="type-input min-w-0 flex-1 rounded-lg border px-2 py-1.5" autofocus />
                <button class="rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white" type="submit">Save</button>
              </form>
              <div v-else class="grid grid-cols-[1fr_auto] items-center gap-2">
                <button class="type-body-sm truncate text-left font-semibold" type="button" @click="emit('select-list', list.id)">{{ list.name }}</button>
                <div class="flex gap-1">
                  <button class="rounded-lg px-2 py-1 text-xs font-bold text-sky-700" type="button" @click="startEditList(list)">Rename</button>
                  <button class="rounded-lg px-2 py-1 text-xs font-bold text-rose-600" type="button" @click="handleDeleteList(list)">Delete</button>
                </div>
              </div>
            </div>
            <p v-if="!space.lists.length" class="neon-space-empty rounded-xl p-6 text-center text-sm">No projects yet</p>
          </div>

          <form v-if="addingListSpaceId === space.id" class="mt-4 flex gap-2" @submit.prevent="submitList(space.id)">
            <input v-model.trim="listName" class="neon-space-input min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" placeholder="Project name..." autofocus />
            <button class="h-9 rounded-xl bg-emerald-600 px-3 text-white" type="submit" :disabled="isCreatingList || !listName.trim()">Add</button>
          </form>
          <button v-else class="neon-space-add-btn mt-4 inline-flex h-9 w-9 items-center justify-center rounded-xl" type="button" @click="startList(space.id)">+</button>
        </div>
      </article>
    </div>
  </section>
</template>
