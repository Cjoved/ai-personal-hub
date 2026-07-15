<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: 'Reminder time',
  },
  id: {
    type: String,
    default: '',
  },
  minuteStep: {
    type: Number,
    default: 5,
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

const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const periods = ['AM', 'PM']

const minutes = computed(() => {
  const step = Math.max(1, Number(props.minuteStep) || 5)
  const values = []
  for (let m = 0; m < 60; m += step) values.push(m)
  return values
})

const parsed = computed(() => {
  const raw = String(props.modelValue || '').slice(0, 5)
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return { hour24: null, hour12: null, minute: null, period: 'AM' }
  const hour24 = Number(match[1])
  const minute = Number(match[2])
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour24, hour12, minute, period }
})

const displayLabel = computed(() => {
  if (parsed.value.hour24 == null) return 'No reminder'
  const date = new Date()
  date.setHours(parsed.value.hour24, parsed.value.minute || 0, 0, 0)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
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

function emitTime(hour12, minute, period) {
  const hour24 = toHour24(hour12, period)
  emit('update:modelValue', `${pad(hour24)}:${pad(minute)}`)
}

function currentParts() {
  return {
    hour12: parsed.value.hour12 ?? 8,
    minute: parsed.value.minute != null ? snapMinute(parsed.value.minute) : 0,
    period: parsed.value.period || 'AM',
  }
}

function selectHour(hour12) {
  const parts = currentParts()
  emitTime(hour12, parts.minute, parts.period)
}

function selectMinute(minute) {
  const parts = currentParts()
  emitTime(parts.hour12, minute, parts.period)
}

function selectPeriod(period) {
  const parts = currentParts()
  emitTime(parts.hour12, parts.minute, period)
}

function clearTime() {
  emit('update:modelValue', '')
  isOpen.value = false
}

async function updateMenuPosition() {
  if (!buttonRef.value || !isOpen.value) return
  await nextTick()
  const isMobile = window.matchMedia('(max-width: 767px)').matches

  if (isMobile) {
    const width = Math.min(20 * 16, window.innerWidth - 24)
    menuStyle.value = {
      left: '50%',
      top: '50%',
      width: `${width}px`,
      maxHeight: 'min(88dvh, 28rem)',
      transform: 'translate(-50%, -50%)',
      overflowY: 'auto',
    }
    return
  }

  const rect = buttonRef.value.getBoundingClientRect()
  const menuHeight = menuRef.value?.offsetHeight || 300
  const menuWidth = Math.min(Math.max(rect.width, 300), window.innerWidth - 16)
  const pad = 8
  const spaceBelow = window.innerHeight - rect.bottom - pad
  const spaceAbove = rect.top - pad
  const openUpward = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow
  const left = Math.min(Math.max(pad, rect.left), window.innerWidth - menuWidth - pad)

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
  <div ref="root" class="habit-select">
    <button
      :id="id || undefined"
      ref="buttonRef"
      class="habit-select-trigger"
      :class="{ 'habit-select-trigger--open': isOpen }"
      type="button"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click.stop="toggleMenu"
    >
      <span class="habit-select-trigger__label" :class="{ 'habit-select-trigger__label--placeholder': !modelValue }">
        {{ displayLabel }}
      </span>
      <span class="habit-select-trigger__chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="habit-time-menu"
        :style="menuStyle"
        role="dialog"
        aria-label="Pick reminder time"
        @click.stop
      >
        <div class="habit-time-menu__columns habit-time-menu__columns--ampm">
          <div class="habit-time-menu__col">
            <p class="habit-time-menu__col-label">Hour</p>
            <ul ref="hourListRef" class="habit-time-menu__list">
              <li v-for="hour in hours12" :key="`h-${hour}`">
                <button
                  class="habit-time-option"
                  :class="{ 'habit-time-option--active': parsed.hour12 === hour }"
                  type="button"
                  :data-active="parsed.hour12 === hour"
                  @click="selectHour(hour)"
                >
                  {{ hour }}
                </button>
              </li>
            </ul>
          </div>
          <div class="habit-time-menu__col">
            <p class="habit-time-menu__col-label">Minute</p>
            <ul ref="minuteListRef" class="habit-time-menu__list">
              <li v-for="minute in minutes" :key="`m-${minute}`">
                <button
                  class="habit-time-option"
                  :class="{ 'habit-time-option--active': snapMinute(parsed.minute ?? -1) === minute && parsed.hour24 != null }"
                  type="button"
                  :data-active="snapMinute(parsed.minute ?? -1) === minute && parsed.hour24 != null"
                  @click="selectMinute(minute)"
                >
                  {{ pad(minute) }}
                </button>
              </li>
            </ul>
          </div>
          <div class="habit-time-menu__col habit-time-menu__col--period">
            <p class="habit-time-menu__col-label">Period</p>
            <ul class="habit-time-menu__list habit-time-menu__list--period">
              <li v-for="period in periods" :key="period">
                <button
                  class="habit-time-option"
                  :class="{ 'habit-time-option--active': parsed.period === period && parsed.hour24 != null }"
                  type="button"
                  @click="selectPeriod(period)"
                >
                  {{ period }}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="habit-time-menu__footer">
          <button class="habit-time-menu__clear" type="button" @click="clearTime">Clear</button>
          <button class="habit-time-menu__done" type="button" @click="isOpen = false">Done</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
