import { onUnmounted, ref } from 'vue'
import { formatReminderTime } from './useHabits'

const NOTIFY_KEY = 'tasker:habit-notify-permission'
const LAST_SHOWN_KEY = 'tasker:habit-notify-last'

export function useHabitNotifications() {
  const permission = ref(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const lastError = ref('')
  let timer = null

  async function requestPermission() {
    if (typeof Notification === 'undefined') {
      lastError.value = 'Notifications are not supported in this browser.'
      return false
    }
    try {
      const result = await Notification.requestPermission()
      permission.value = result
      localStorage.setItem(NOTIFY_KEY, result)
      return result === 'granted'
    } catch (error) {
      lastError.value = error.message || 'Could not request notification permission.'
      return false
    }
  }

  function showHabitReminder(habits) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (!habits?.length) return

    const today = new Date().toDateString()
    const last = localStorage.getItem(LAST_SHOWN_KEY)
    if (last === today) return

    const titles = habits.slice(0, 3).map((h) => h.title).join(', ')
    const more = habits.length > 3 ? ` +${habits.length - 3} more` : ''
    const times = habits
      .filter((h) => h.reminder_time)
      .slice(0, 2)
      .map((h) => formatReminderTime(h.reminder_time))
      .join(', ')

    try {
      const notification = new Notification('Habit reminders due', {
        body: `${titles}${more}${times ? ` · ${times}` : ''}`,
        tag: 'habit-reminders',
        renotify: true,
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
      localStorage.setItem(LAST_SHOWN_KEY, today)
    } catch (error) {
      lastError.value = error.message || 'Failed to show notification.'
    }
  }

  function startWatcher(getDueHabits) {
    stopWatcher()
    timer = window.setInterval(() => {
      const due = typeof getDueHabits === 'function' ? getDueHabits() : []
      if (due.length) showHabitReminder(due)
    }, 60_000)
  }

  function stopWatcher() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stopWatcher)

  return {
    permission,
    lastError,
    requestPermission,
    showHabitReminder,
    startWatcher,
    stopWatcher,
  }
}
