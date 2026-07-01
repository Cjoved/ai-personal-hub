<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    required: true,
  },
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['sm', 'md'].includes(value),
  },
  tone: {
    type: String,
    default: '',
  },
  optionTone: {
    type: Function,
    default: null,
  },
  ariaLabel: {
    type: String,
    default: 'Select option',
  },
  block: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const root = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const menuStyle = ref({})

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

const triggerTone = computed(() => {
  if (props.tone) return props.tone
  if (props.optionTone && props.modelValue !== '') return props.optionTone(props.modelValue)
  return 'border-slate-200/90 bg-white text-slate-700'
})

const triggerSizeClass = computed(() =>
  props.size === 'md' ? 'rounded-xl py-3 text-sm' : 'rounded-xl py-2 text-xs',
)

function optionClass(value) {
  if (props.modelValue === value) {
    return 'app-select-option-active bg-emerald-50 font-bold text-emerald-800'
  }

  return 'app-select-option-idle font-medium text-slate-700 hover:bg-slate-50'
}

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 240
  const spaceBelow = window.innerHeight - rect.bottom
  const openUpward = spaceBelow < menuHeight + 12 && rect.top > spaceBelow

  menuStyle.value = {
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 176)}px`,
    top: openUpward ? `${rect.top - 8}px` : `${rect.bottom + 6}px`,
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

function select(value) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
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
  <div ref="root" class="relative" :class="block ? 'block w-full' : 'inline-flex min-w-[8rem]'">
    <button
      ref="buttonRef"
      type="button"
      class="grid w-full grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-1 border font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
      :class="[
        triggerSizeClass,
        triggerTone,
        isOpen ? 'border-emerald-300/90 ring-2 ring-emerald-500/10' : '',
        size === 'md' ? 'pl-4 pr-2' : 'pl-3 pr-1.5',
      ]"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click.stop="toggleMenu"
    >
      <span class="truncate text-left">{{ selectedOption?.label ?? 'Select' }}</span>
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
        <ul class="space-y-0.5">
          <li v-for="option in options" :key="option.value" role="option" :aria-selected="modelValue === option.value">
            <button
              class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition"
              :class="optionClass(option.value)"
              type="button"
              @click="select(option.value)"
            >
              <span class="truncate">{{ option.label }}</span>
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
