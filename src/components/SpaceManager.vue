<script setup>
import { ref } from 'vue'

const props = defineProps({
  createSpace: {
    type: Function,
    required: true,
  },
  activeSpace: {
    type: Object,
    default: null,
  },
  deleteSpace: {
    type: Function,
    required: true,
  },
})

const name = ref('')
const isOpen = ref(false)
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!name.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  const didCreate = await props.createSpace(name.value)

  if (didCreate) {
    name.value = ''
    isOpen.value = false
  }

  isSubmitting.value = false
}

async function handleDelete() {
  if (!props.activeSpace?.id) return
  const shouldDelete = globalThis.confirm(`Delete "${props.activeSpace.name}"? Lists will be removed from this Space.`)
  if (!shouldDelete) return

  await props.deleteSpace(props.activeSpace.id)
}
</script>

<template>
  <div>
    <button
      class="w-full rounded-xl border border-slate-700 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
      type="button"
      @click="isOpen = !isOpen"
    >
      + New Space
    </button>

    <form v-if="isOpen" class="mt-2 space-y-2" @submit.prevent="handleSubmit">
      <input
        v-model.trim="name"
        class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
        placeholder="Space name"
        required
      />
      <button
        class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        :disabled="isSubmitting || !name.trim()"
      >
        Create space
      </button>
    </form>

    <button
      v-if="activeSpace"
      class="mt-2 w-full rounded-xl border border-rose-300/40 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-rose-200 transition hover:bg-rose-500/10"
      type="button"
      @click="handleDelete"
    >
      Delete current Space
    </button>
  </div>
</template>
