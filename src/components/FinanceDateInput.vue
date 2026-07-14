<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  allowClear: {
    type: Boolean,
    default: true,
  },
})

defineOptions({ inheritAttrs: false })

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const isOpen = ref(false)
const menuStyle = ref({})
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const selected = computed(() => {
  if (!props.modelValue || !/^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)) return null
  const [y, m, d] = props.modelValue.split('-').map(Number)
  return new Date(y, m - 1, d)
})

const displayLabel = computed(() => {
  if (!selected.value) return 'Pick a date'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(selected.value)
})

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(viewYear.value, viewMonth.value, 1),
  ),
)

const calendarDays = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ key: `e-${i}`, empty: true })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(viewYear.value, viewMonth.value, day)
    cells.push({
      key: toKey(date),
      empty: false,
      date,
      day,
      isSelected: isSameDay(date, selected.value),
      isToday: isToday(date),
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `e-end-${cells.length}`, empty: true })
  }
  return cells
})

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(date) {
  return isSameDay(date, new Date())
}

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return

  await nextTick()
  const isMobile = window.matchMedia('(max-width: 767px)').matches

  // Same approach as TaskDateTimeSelect / habit menus: center on mobile
  if (isMobile) {
    const width = Math.min(22.5 * 16, window.innerWidth - 24)
    menuStyle.value = {
      left: '50%',
      top: '50%',
      width: `${width}px`,
      maxHeight: 'min(88dvh, 36rem)',
      transform: 'translate(-50%, -50%)',
      overflowY: 'auto',
    }
    return
  }

  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 340
  const menuWidth = Math.min(Math.max(rect.width, 300), window.innerWidth - 16)
  const pad = 8
  const spaceBelow = window.innerHeight - rect.bottom - pad
  const spaceAbove = rect.top - pad
  const openUpward = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow
  const left = Math.min(Math.max(pad, rect.left), window.innerWidth - menuWidth - pad)
  const available = openUpward ? spaceAbove - 6 : spaceBelow - 6

  menuStyle.value = {
    left: `${left}px`,
    width: `${menuWidth}px`,
    top: openUpward ? `${rect.top - 6}px` : `${rect.bottom + 4}px`,
    transform: openUpward ? 'translateY(-100%)' : 'none',
    maxHeight: `${Math.max(240, Math.min(menuHeight, available))}px`,
    overflowY: 'auto',
  }
}

async function toggleMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  if (selected.value) {
    viewYear.value = selected.value.getFullYear()
    viewMonth.value = selected.value.getMonth()
  } else {
    const now = new Date()
    viewYear.value = now.getFullYear()
    viewMonth.value = now.getMonth()
  }

  await nextTick()
  updateMenuPosition()
  await nextTick()
  updateMenuPosition()
}

function closeMenu() {
  isOpen.value = false
}

function shiftMonth(delta) {
  const date = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
  nextTick(() => updateMenuPosition())
}

function pickDay(date) {
  if (!date) return
  emit('update:modelValue', toKey(date))
  closeMenu()
}

function pickToday() {
  pickDay(new Date())
}

function clearDate() {
  if (!props.allowClear) return
  emit('update:modelValue', '')
  closeMenu()
}

function handleClickOutside(event) {
  if (!isOpen.value) return
  if (root.value?.contains(event.target) || menuRef.value?.contains(event.target)) return
  closeMenu()
}

function onKeydown(event) {
  if (!isOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeMenu()
  }
}

watch(
  () => props.modelValue,
  () => {
    if (selected.value) {
      viewYear.value = selected.value.getFullYear()
      viewMonth.value = selected.value.getMonth()
    }
  },
)

watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return
  }
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
})

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
</script>

<template>
  <div ref="root" class="finance-date-input">
    <button
      :id="id || undefined"
      ref="buttonRef"
      class="finance-date-input__trigger"
      :class="{ 'finance-date-input__trigger--open': isOpen }"
      type="button"
      :disabled="disabled"
      :aria-label="ariaLabel || $attrs['aria-label'] || 'Pick date'"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      :aria-required="required || undefined"
      @click.stop="toggleMenu"
    >
      <span class="finance-date-input__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4M16 3v4" />
        </svg>
      </span>
      <span class="finance-date-input__label" :class="{ 'finance-date-input__label--muted': !selected }">
        {{ displayLabel }}
      </span>
    </button>

    <input
      class="sr-only"
      type="text"
      :name="name || undefined"
      :value="modelValue"
      :required="required"
      tabindex="-1"
      aria-hidden="true"
      readonly
    />

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="finance-date-menu"
        :style="menuStyle"
        role="dialog"
        aria-label="Choose date"
        @click.stop
      >
        <div class="finance-date-menu__cal">
          <div class="finance-date-menu__nav">
            <button class="finance-date-menu__nav-btn" type="button" aria-label="Previous month" @click="shiftMonth(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <p class="finance-date-menu__month">{{ monthLabel }}</p>
            <button class="finance-date-menu__nav-btn" type="button" aria-label="Next month" @click="shiftMonth(1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="finance-date-menu__weekdays" aria-hidden="true">
            <span v-for="day in WEEKDAYS" :key="day">{{ day }}</span>
          </div>

          <div class="finance-date-menu__grid">
            <template v-for="cell in calendarDays" :key="cell.key">
              <span v-if="cell.empty" class="finance-date-menu__day finance-date-menu__day--empty" />
              <button
                v-else
                class="finance-date-menu__day"
                type="button"
                :class="{
                  'finance-date-menu__day--selected': cell.isSelected,
                  'finance-date-menu__day--today': cell.isToday && !cell.isSelected,
                }"
                @click="pickDay(cell.date)"
              >
                {{ cell.day }}
              </button>
            </template>
          </div>
        </div>

        <div class="finance-date-menu__footer">
          <button class="finance-date-menu__ghost" type="button" @click="pickToday">Today</button>
          <div class="finance-date-menu__footer-actions">
            <button
              v-if="allowClear && modelValue"
              class="finance-date-menu__ghost"
              type="button"
              @click="clearDate"
            >
              Clear
            </button>
            <button class="finance-date-menu__done" type="button" @click="closeMenu">Done</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
