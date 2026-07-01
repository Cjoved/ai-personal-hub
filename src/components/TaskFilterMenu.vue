<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { filterOptions } from '../composables/useTasks'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const root = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const menuStyle = ref({})

const activeOption = computed(
  () => filterOptions.find((option) => option.value === props.modelValue) || filterOptions.find((option) => option.value === 'all'),
)

function selectFilter(value) {
  emit('update:modelValue', value)
  isOpen.value = false
}

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 300
  const spaceBelow = window.innerHeight - rect.bottom
  const openUpward = spaceBelow < menuHeight + 12 && rect.top > spaceBelow

  menuStyle.value = {
    left: `${rect.left}px`,
    minWidth: `${Math.max(rect.width, 220)}px`,
    top: openUpward ? `${rect.top - 8}px` : `${rect.bottom + 8}px`,
    transform: openUpward ? 'translateY(-100%)' : 'none',
  }
}

async function toggleMenu() {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    await nextTick()
    updateMenuPosition()
    await nextTick()
    updateMenuPosition()
  }
}

function handleClickOutside(event) {
  if (root.value?.contains(event.target) || menuRef.value?.contains(event.target)) return
  isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
})

watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return
  }

  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="buttonRef"
      class="grid grid-cols-[auto_minmax(0,1fr)_1.75rem] items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
      :class="
        isOpen
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-slate-200/90 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white'
      "
      type="button"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click.stop="toggleMenu"
    >
      <svg class="h-4 w-4 shrink-0" :class="isOpen ? 'text-emerald-600' : 'text-slate-500'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      <span class="hidden truncate text-left sm:inline">{{ activeOption?.label }}</span>
      <span class="grid h-6 w-6 place-items-center rounded-md bg-black/[0.04]">
        <svg
          class="h-3.5 w-3.5 opacity-80 transition-transform duration-200"
          :class="isOpen ? '-rotate-180' : ''"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="app-select-menu fixed z-[200] p-1.5"
        :style="menuStyle"
        role="listbox"
        @click.stop
      >
        <div class="mb-1 rounded-lg bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Filter tasks</p>
        </div>
        <ul class="space-y-0.5">
          <li v-for="option in filterOptions" :key="option.value" role="option" :aria-selected="modelValue === option.value">
            <button
              class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition"
              :class="
                modelValue === option.value
                  ? 'bg-emerald-50 font-bold text-emerald-800'
                  : 'font-medium text-slate-700 hover:bg-slate-50'
              "
              type="button"
              @click="selectFilter(option.value)"
            >
              <span>{{ option.label }}</span>
              <svg
                v-if="modelValue === option.value"
                class="h-4 w-4 shrink-0 text-emerald-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
