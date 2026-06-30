<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  activeSpace: {
    type: Object,
    default: null,
  },
  activeList: {
    type: Object,
    default: null,
  },
  createList: {
    type: Function,
    required: true,
  },
  deleteList: {
    type: Function,
    required: true,
  },
})

const name = ref('')
const isOpen = ref(false)
const isSubmitting = ref(false)
const canCreate = computed(() => Boolean(props.activeSpace?.id))

async function handleSubmit() {
  if (!canCreate.value || !name.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  const didCreate = await props.createList(props.activeSpace.id, name.value)

  if (didCreate) {
    name.value = ''
    isOpen.value = false
  }

  isSubmitting.value = false
}

async function handleDelete() {
  if (!props.activeList?.id) return
  const shouldDelete = globalThis.confirm(`Delete "${props.activeList.name}"? Existing tasks will keep their Space.`)
  if (!shouldDelete) return

  await props.deleteList(props.activeList.id)
}
</script>

<template>
  <div>
    <button
      class="w-full rounded-xl border border-slate-700 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
      type="button"
      :disabled="!canCreate"
      @click="isOpen = !isOpen"
    >
      + New List
    </button>

    <form v-if="isOpen && canCreate" class="mt-2 space-y-2" @submit.prevent="handleSubmit">
      <input
        v-model.trim="name"
        class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
        :placeholder="`List in ${activeSpace.name}`"
        required
      />
      <button
        class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        :disabled="isSubmitting || !name.trim()"
      >
        Create list
      </button>
    </form>

    <button
      v-if="activeList"
      class="mt-2 w-full rounded-xl border border-rose-300/40 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-rose-200 transition hover:bg-rose-500/10"
      type="button"
      @click="handleDelete"
    >
      Delete current List
    </button>
  </div>
</template>
