<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  ariaLabel: {
    type: String,
    default: 'Select option',
  },
  placeholder: {
    type: String,
    default: 'Select',
  },
  id: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const root = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const menuStyle = ref({})

const selectedOption = computed(() =>
  props.options.find((option) => String(option.value) === String(props.modelValue)),
)

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 220
  const spaceBelow = window.innerHeight - rect.bottom
  const openUpward = spaceBelow < menuHeight + 12 && rect.top > spaceBelow

  menuStyle.value = {
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 200)}px`,
    top: openUpward ? `${rect.top - 6}px` : `${rect.bottom + 4}px`,
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
  isOpen.value = false
}

function handleClickOutside(event) {
  if (root.value?.contains(event.target) || menuRef.value?.contains(event.target)) return
  isOpen.value = false
}

function onKeydown(event) {
  if (!isOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', onKeydown)
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
  <div ref="root" class="habit-select">
    <button
      :id="id || undefined"
      ref="buttonRef"
      class="habit-select-trigger"
      :class="{ 'habit-select-trigger--open': isOpen }"
      type="button"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click.stop="toggleMenu"
    >
      <span class="habit-select-trigger__label" :class="{ 'habit-select-trigger__label--placeholder': !selectedOption }">
        {{ selectedOption?.label ?? placeholder }}
      </span>
      <span class="habit-select-trigger__chevron" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="currentColor">
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
        class="habit-select-menu"
        :style="menuStyle"
        role="listbox"
        @click.stop
      >
        <ul class="habit-select-menu__list">
          <li
            v-for="option in options"
            :key="String(option.value)"
            role="option"
            :aria-selected="String(modelValue) === String(option.value)"
          >
            <button
              class="habit-select-option"
              :class="{ 'habit-select-option--active': String(modelValue) === String(option.value) }"
              type="button"
              @click="select(option.value)"
            >
              <span class="habit-select-option__label">{{ option.label }}</span>
              <svg
                v-if="String(modelValue) === String(option.value)"
                class="habit-select-option__check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
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
