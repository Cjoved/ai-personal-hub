import { computed, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function isGoalEnded(goal) {
  if (!goal) return false
  if (goal.status === 'ended') return true
  return new Date(goal.ends_at) <= new Date()
}

export function canDeleteGoal(goal) {
  return isGoalEnded(goal)
}

export function goalCountdown(goal, now = new Date()) {
  if (!goal?.ends_at) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isOver: true }
  }

  const totalMs = new Date(goal.ends_at) - now
  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isOver: true }
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, totalMs, isOver: false }
}

export function formatGoalCountdown(goal, now = new Date()) {
  const { days, hours, minutes, isOver } = goalCountdown(goal, now)
  if (isOver) return 'Timeframe ended'
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function formatGoalDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function goalTimeProgress(goal, now = new Date()) {
  if (!goal?.starts_at || !goal?.ends_at) return 0

  const start = new Date(goal.starts_at).getTime()
  const end = new Date(goal.ends_at).getTime()
  const current = now.getTime()

  if (end <= start) return 100
  const pct = ((current - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

export function useGoals(user) {
  const goals = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  const userId = computed(() => user.value?.id)

  const activeGoals = computed(() =>
    goals.value
      .filter((goal) => !isGoalEnded(goal))
      .sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at)),
  )

  const endedGoals = computed(() =>
    goals.value
      .filter((goal) => isGoalEnded(goal))
      .sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at)),
  )

  const featuredGoal = computed(() => activeGoals.value[0] ?? null)

  async function syncExpiredGoals() {
    const expired = goals.value.filter((goal) => goal.status === 'active' && isGoalEnded(goal))
    if (!expired.length || !userId.value) return

    await Promise.all(
      expired.map((goal) =>
        supabase
          .from('goals')
          .update({ status: 'ended' })
          .eq('id', goal.id)
          .eq('user_id', userId.value),
      ),
    )

    goals.value = goals.value.map((goal) =>
      goal.status === 'active' && isGoalEnded(goal) ? { ...goal, status: 'ended' } : goal,
    )
  }

  async function fetchGoals() {
    if (!userId.value || !isSupabaseConfigured) {
      goals.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId.value)
      .order('ends_at', { ascending: true })

    if (error) {
      errorMessage.value = error.message
    } else {
      goals.value = data ?? []
      await syncExpiredGoals()
    }

    isLoading.value = false
  }

  async function createGoal(payload) {
    if (!userId.value || !payload.title?.trim() || !payload.ends_at) return false

    errorMessage.value = ''

    const startsAt = payload.starts_at || new Date().toISOString()
    const endsAt = payload.ends_at

    if (new Date(endsAt) <= new Date(startsAt)) {
      errorMessage.value = 'End date must be after the start date.'
      return false
    }

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId.value,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        starts_at: startsAt,
        ends_at: endsAt,
        color: payload.color || '#6366f1',
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    goals.value = sortGoals([...goals.value, data])
    return data
  }

  async function updateGoal(goalId, patch) {
    if (!userId.value || !goalId) return false

    errorMessage.value = ''

    const { data, error } = await supabase
      .from('goals')
      .update(patch)
      .eq('id', goalId)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    goals.value = sortGoals(goals.value.map((goal) => (goal.id === goalId ? data : goal)))
    await syncExpiredGoals()
    return true
  }

  async function deleteGoal(goalId) {
    if (!userId.value || !goalId) return false

    const goal = goals.value.find((item) => item.id === goalId)
    if (goal && !canDeleteGoal(goal)) {
      errorMessage.value = 'You can only delete a goal after its timeframe has ended.'
      return false
    }

    errorMessage.value = ''

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId.value)

    if (error) {
      errorMessage.value = error.message
      return false
    }

    goals.value = goals.value.filter((goal) => goal.id !== goalId)
    return true
  }

  function sortGoals(items) {
    return [...items].sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at))
  }

  watch(userId, () => fetchGoals(), { immediate: true })

  return {
    goals,
    activeGoals,
    endedGoals,
    featuredGoal,
    isLoading,
    errorMessage,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    isGoalEnded,
    canDeleteGoal,
    goalCountdown,
    formatGoalCountdown,
    formatGoalDate,
    goalTimeProgress,
  }
}
