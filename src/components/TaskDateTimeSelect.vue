<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: 'Date and time',
  },
  id: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Pick date & time',
  },
  minuteStep: {
    type: Number,
    default: 5,
  },
  allowClear: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const root = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const menuStyle = ref({})
const hourListRef = ref(null)
const minuteListRef = ref(null)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const periods = ['AM', 'PM']
const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const minutes = computed(() => {
  const step = Math.max(1, Number(props.minuteStep) || 5)
  const values = []
  for (let m = 0; m < 60; m += step) values.push(m)
  return values
})

const parsed = computed(() => {
  const raw = String(props.modelValue || '')
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) {
    return {
      year: null,
      month: null,
      day: null,
      hour24: null,
      hour12: null,
      minute: null,
      period: 'AM',
      date: null,
    }
  }
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const hour24 = Number(match[4])
  const minute = Number(match[5])
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return {
    year,
    month,
    day,
    hour24,
    hour12,
    minute,
    period,
    date: new Date(year, month, day, hour24, minute),
  }
})

const displayLabel = computed(() => {
  if (!parsed.value.date) return props.placeholder
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed.value.date)
})

const monthTitle = computed(() =>
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
    cells.push({ key: `pad-${i}`, empty: true })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isSelected =
      parsed.value.year === viewYear.value &&
      parsed.value.month === viewMonth.value &&
      parsed.value.day === day
    const today = new Date()
    const isToday =
      today.getFullYear() === viewYear.value &&
      today.getMonth() === viewMonth.value &&
      today.getDate() === day
    cells.push({ key: `d-${day}`, day, isSelected, isToday, empty: false })
  }

  return cells
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function toHour24(hour12, period) {
  const h = Number(hour12)
  if (period === 'AM') return h === 12 ? 0 : h
  return h === 12 ? 12 : h + 12
}

function snapMinute(minute) {
  const step = Math.max(1, Number(props.minuteStep) || 5)
  const snapped = Math.round(minute / step) * step
  return Math.min(55, snapped === 60 ? 0 : snapped)
}

function currentParts() {
  const now = new Date()
  const year = parsed.value.year ?? viewYear.value
  const month = parsed.value.month ?? viewMonth.value
  const maxDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(parsed.value.day ?? now.getDate(), maxDay)
  return {
    year,
    month,
    day,
    hour12: parsed.value.hour12 ?? 9,
    minute: parsed.value.minute != null ? snapMinute(parsed.value.minute) : 0,
    period: parsed.value.period || 'AM',
  }
}

function emitDateTime(parts) {
  const hour24 = toHour24(parts.hour12, parts.period)
  emit(
    'update:modelValue',
    `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}T${pad(hour24)}:${pad(parts.minute)}`,
  )
}

function selectDay(day) {
  const parts = currentParts()
  parts.year = viewYear.value
  parts.month = viewMonth.value
  parts.day = day
  emitDateTime(parts)
}

function selectHour(hour12) {
  const parts = currentParts()
  parts.hour12 = hour12
  emitDateTime(parts)
}

function selectMinute(minute) {
  const parts = currentParts()
  parts.minute = minute
  emitDateTime(parts)
}

function selectPeriod(period) {
  const parts = currentParts()
  parts.period = period
  emitDateTime(parts)
}

function shiftMonth(delta) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = next.getFullYear()
  viewMonth.value = next.getMonth()
}

function clearValue() {
  if (!props.allowClear) return
  emit('update:modelValue', '')
  isOpen.value = false
}

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 420
  const menuWidth = Math.min(Math.max(rect.width, 340), window.innerWidth - 16)
  const spaceBelow = window.innerHeight - rect.bottom
  const openUpward = spaceBelow < menuHeight + 12 && rect.top > spaceBelow
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8)

  menuStyle.value = {
    left: `${left}px`,
    width: `${menuWidth}px`,
    top: openUpward ? `${rect.top - 6}px` : `${rect.bottom + 4}px`,
    transform: openUpward ? 'translateY(-100%)' : 'none',
  }
}

function scrollSelectedIntoView() {
  const hourEl = hourListRef.value?.querySelector('[data-active="true"]')
  const minuteEl = minuteListRef.value?.querySelector('[data-active="true"]')
  hourEl?.scrollIntoView({ block: 'center' })
  minuteEl?.scrollIntoView({ block: 'center' })
}

async function toggleMenu() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    if (parsed.value.year != null) {
      viewYear.value = parsed.value.year
      viewMonth.value = parsed.value.month
    } else {
      const now = new Date()
      viewYear.value = now.getFullYear()
      viewMonth.value = now.getMonth()
    }
    await nextTick()
    updateMenuPosition()
    await nextTick()
    updateMenuPosition()
    scrollSelectedIntoView()
  }
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
  <div ref="root" class="task-datetime">
    <button
      :id="id || undefined"
      ref="buttonRef"
      class="task-datetime-trigger"
      :class="{ 'task-datetime-trigger--open': isOpen }"
      type="button"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click.stop="toggleMenu"
    >
      <span class="task-datetime-trigger__label" :class="{ 'task-datetime-trigger__label--placeholder': !modelValue }">
        {{ displayLabel }}
      </span>
      <span class="task-datetime-trigger__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="task-datetime-menu"
        :style="menuStyle"
        role="dialog"
        :aria-label="ariaLabel"
        @click.stop
      >
        <div class="task-datetime-menu__cal">
          <div class="task-datetime-menu__cal-head">
            <button class="task-datetime-nav" type="button" aria-label="Previous month" @click="shiftMonth(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <p class="task-datetime-menu__month">{{ monthTitle }}</p>
            <button class="task-datetime-nav" type="button" aria-label="Next month" @click="shiftMonth(1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="task-datetime-weekdays">
            <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
          </div>

          <div class="task-datetime-days">
            <template v-for="cell in calendarDays" :key="cell.key">
              <span v-if="cell.empty" class="task-datetime-day task-datetime-day--empty" />
              <button
                v-else
                class="task-datetime-day"
                :class="{
                  'task-datetime-day--selected': cell.isSelected,
                  'task-datetime-day--today': cell.isToday && !cell.isSelected,
                }"
                type="button"
                @click="selectDay(cell.day)"
              >
                {{ cell.day }}
              </button>
            </template>
          </div>
        </div>

        <div class="task-datetime-menu__time">
          <p class="task-datetime-menu__time-label">Time</p>
          <div class="task-datetime-menu__columns">
            <div class="task-datetime-menu__col">
              <p class="task-datetime-menu__col-label">Hour</p>
              <ul ref="hourListRef" class="task-datetime-menu__list">
                <li v-for="hour in hours12" :key="`h-${hour}`">
                  <button
                    class="task-datetime-option"
                    :class="{ 'task-datetime-option--active': parsed.hour12 === hour && parsed.hour24 != null }"
                    type="button"
                    :data-active="parsed.hour12 === hour && parsed.hour24 != null"
                    @click="selectHour(hour)"
                  >
                    {{ hour }}
                  </button>
                </li>
              </ul>
            </div>
            <div class="task-datetime-menu__col">
              <p class="task-datetime-menu__col-label">Min</p>
              <ul ref="minuteListRef" class="task-datetime-menu__list">
                <li v-for="minute in minutes" :key="`m-${minute}`">
                  <button
                    class="task-datetime-option"
                    :class="{
                      'task-datetime-option--active':
                        snapMinute(parsed.minute ?? -1) === minute && parsed.hour24 != null,
                    }"
                    type="button"
                    :data-active="snapMinute(parsed.minute ?? -1) === minute && parsed.hour24 != null"
                    @click="selectMinute(minute)"
                  >
                    {{ pad(minute) }}
                  </button>
                </li>
              </ul>
            </div>
            <div class="task-datetime-menu__col task-datetime-menu__col--period">
              <p class="task-datetime-menu__col-label">AM/PM</p>
              <ul class="task-datetime-menu__list task-datetime-menu__list--period">
                <li v-for="period in periods" :key="period">
                  <button
                    class="task-datetime-option"
                    :class="{ 'task-datetime-option--active': parsed.period === period && parsed.hour24 != null }"
                    type="button"
                    @click="selectPeriod(period)"
                  >
                    {{ period }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="task-datetime-menu__footer">
          <button v-if="allowClear" class="task-datetime-menu__clear" type="button" @click="clearValue">Clear</button>
          <span v-else></span>
          <button class="task-datetime-menu__done" type="button" @click="isOpen = false">Done</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
