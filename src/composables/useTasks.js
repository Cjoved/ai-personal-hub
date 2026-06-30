import { computed, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const statusOptions = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

export const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

export const filterOptions = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'high_priority', label: 'High priority' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All open' },
]

const openStatuses = new Set(['inbox', 'todo', 'in_progress'])

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfToday() {
  const date = startOfToday()
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfWeek() {
  const date = startOfToday()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function parseDate(value) {
  return value ? new Date(value) : null
}

function isOpenTask(task) {
  return openStatuses.has(task.status)
}

function isDueToday(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && dueDate >= startOfToday() && dueDate <= endOfToday())
}

function isOverdue(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && dueDate < startOfToday() && isOpenTask(task))
}

function isUpcoming(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && dueDate > endOfToday() && isOpenTask(task))
}

function applyFilter(tasks, selectedFilter) {
  switch (selectedFilter) {
    case 'inbox':
      return tasks.filter((task) => task.status === 'inbox')
    case 'today':
      return tasks.filter((task) => isDueToday(task) && isOpenTask(task))
    case 'upcoming':
      return tasks.filter(isUpcoming)
    case 'overdue':
      return tasks.filter(isOverdue)
    case 'high_priority':
      return tasks.filter((task) => ['urgent', 'high'].includes(task.priority) && isOpenTask(task))
    case 'completed':
      return tasks.filter((task) => task.status === 'done')
    default:
      return tasks.filter(isOpenTask)
  }
}

function mapTaskLocation(task, spaces, lists) {
  const space = spaces.find((item) => item.id === task.space_id)
  const list = lists.find((item) => item.id === task.list_id)

  return {
    ...task,
    space,
    list,
  }
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'none'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function sortSubtasks(items = []) {
  return [...items].sort(
    (first, second) =>
      first.position - second.position ||
      new Date(first.created_at || 0) - new Date(second.created_at || 0),
  )
}

function withSubtaskStats(task, subtasks = task.subtasks ?? []) {
  const sortedSubtasks = sortSubtasks(subtasks)

  return {
    ...task,
    subtasks: sortedSubtasks,
    subtaskCount: sortedSubtasks.length,
    completedSubtaskCount: sortedSubtasks.filter((subtask) => subtask.status === 'done').length,
  }
}

function attachSubtasks(taskRows = [], subtaskRows = []) {
  const subtasksByTask = subtaskRows.reduce((groups, subtask) => {
    groups[subtask.task_id] = [...(groups[subtask.task_id] || []), subtask]
    return groups
  }, {})

  return taskRows.map((task) => withSubtaskStats(task, subtasksByTask[task.id] || []))
}

export function useTasks(user, workspace = {}) {
  const tasks = ref([])
  const selectedFilter = ref('inbox')
  const searchQuery = ref('')
  const isLoading = ref(false)
  const errorMessage = ref('')

  const userId = computed(() => user.value?.id)
  const activeSpaceId = computed(() => workspace.activeSpaceId?.value ?? null)
  const activeListId = computed(() => workspace.activeListId?.value ?? null)
  const spaces = computed(() => workspace.spaces?.value ?? [])
  const lists = computed(() => workspace.lists?.value ?? [])

  const tasksWithLocation = computed(() =>
    tasks.value.map((task) => mapTaskLocation(task, spaces.value, lists.value)),
  )

  const locationTasks = computed(() => {
    if (activeListId.value) return tasksWithLocation.value.filter((task) => task.list_id === activeListId.value)
    if (activeSpaceId.value) return tasksWithLocation.value.filter((task) => task.space_id === activeSpaceId.value)
    return tasksWithLocation.value
  })

  const dashboardTasks = computed(() => {
    if (activeSpaceId.value) return tasksWithLocation.value.filter((task) => task.space_id === activeSpaceId.value)
    return tasksWithLocation.value
  })

  const searchedLocationTasks = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return locationTasks.value

    return locationTasks.value.filter((task) =>
      [
        task.title,
        task.description,
        task.category,
        task.status,
        task.priority,
        task.space?.name,
        task.list?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  })

  async function fetchTasks() {
    if (!userId.value || !isSupabaseConfigured) {
      tasks.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId.value)
      .order('created_at', { ascending: false })

    if (error) {
      errorMessage.value = error.message
      isLoading.value = false
      return
    }

    const taskRows = data ?? []
    const taskIds = taskRows.map((task) => task.id)

    if (!taskIds.length) {
      tasks.value = []
      isLoading.value = false
      return
    }

    const { data: subtaskRows, error: subtaskError } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('user_id', userId.value)
      .in('task_id', taskIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (subtaskError) {
      errorMessage.value = subtaskError.message
    }

    tasks.value = attachSubtasks(taskRows, subtaskRows ?? [])
    isLoading.value = false
  }

  function resolveLocation(payload = {}) {
    const explicitList = lists.value.find((list) => list.id === payload.list_id)
    if (explicitList) return { space_id: explicitList.space_id, list_id: explicitList.id }

    const activeList = lists.value.find((list) => list.id === activeListId.value)
    if (activeList) return { space_id: activeList.space_id, list_id: activeList.id }

    const targetSpaceId = payload.space_id || activeSpaceId.value || spaces.value[0]?.id || null
    const defaultList = lists.value.find((list) => list.space_id === targetSpaceId)

    return {
      space_id: targetSpaceId,
      list_id: defaultList?.id ?? null,
    }
  }

  async function createTask(payload) {
    if (!userId.value || !payload.title?.trim()) return false

    errorMessage.value = ''
    const location = resolveLocation(payload)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId.value,
        space_id: location.space_id,
        list_id: location.list_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        status: payload.status || 'inbox',
        priority: payload.priority || 'normal',
        category: payload.category?.trim() || null,
        due_date: payload.due_date || null,
        estimated_minutes: payload.estimated_minutes || null,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = [withSubtaskStats(data), ...tasks.value]
    return true
  }

  async function updateTask(taskId, patch) {
    if (!userId.value) return false

    errorMessage.value = ''

    const nextPatch = { ...patch }
    if (nextPatch.list_id) {
      const nextList = lists.value.find((list) => list.id === nextPatch.list_id)
      nextPatch.space_id = nextList?.space_id ?? nextPatch.space_id ?? null
    }

    if (nextPatch.status === 'done' && !nextPatch.completed_at) {
      nextPatch.completed_at = new Date().toISOString()
    }

    if (nextPatch.status && nextPatch.status !== 'done') {
      nextPatch.completed_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(nextPatch)
      .eq('id', taskId)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = tasks.value.map((task) =>
      task.id === taskId ? withSubtaskStats(data, task.subtasks) : task,
    )
    return true
  }

  async function archiveTask(taskId) {
    return updateTask(taskId, { status: 'archived' })
  }

  async function deleteTask(taskId) {
    if (!userId.value) return false

    errorMessage.value = ''

    const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId.value)

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = tasks.value.filter((task) => task.id !== taskId)
    return true
  }

  async function createSubtask(taskId, title) {
    const parentTask = tasks.value.find((task) => task.id === taskId)
    if (!userId.value || !parentTask || !title?.trim()) return false

    errorMessage.value = ''
    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({
        user_id: userId.value,
        task_id: taskId,
        title: title.trim(),
        status: 'todo',
        position: parentTask.subtasks?.length ?? 0,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = tasks.value.map((task) =>
      task.id === taskId ? withSubtaskStats(task, [...(task.subtasks || []), data]) : task,
    )
    return true
  }

  async function updateSubtask(subtaskId, patch) {
    if (!userId.value) return false

    errorMessage.value = ''
    const nextPatch = { ...patch }

    if (nextPatch.status === 'done' && !nextPatch.completed_at) {
      nextPatch.completed_at = new Date().toISOString()
    }

    if (nextPatch.status && nextPatch.status !== 'done') {
      nextPatch.completed_at = null
    }

    const { data, error } = await supabase
      .from('task_subtasks')
      .update(nextPatch)
      .eq('id', subtaskId)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = tasks.value.map((task) => {
      if (!task.subtasks?.some((subtask) => subtask.id === subtaskId)) return task

      const subtasks = task.subtasks.map((subtask) => (subtask.id === subtaskId ? data : subtask))
      return withSubtaskStats(task, subtasks)
    })
    return true
  }

  async function deleteSubtask(subtaskId) {
    if (!userId.value) return false

    errorMessage.value = ''
    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('user_id', userId.value)

    if (error) {
      errorMessage.value = error.message
      return false
    }

    tasks.value = tasks.value.map((task) =>
      task.subtasks?.some((subtask) => subtask.id === subtaskId)
        ? withSubtaskStats(
            task,
            task.subtasks.filter((subtask) => subtask.id !== subtaskId),
          )
        : task,
    )
    return true
  }

  const filteredTasks = computed(() => applyFilter(searchedLocationTasks.value, selectedFilter.value))

  const boardColumns = computed(() =>
    statusOptions
      .filter((status) => status.value !== 'archived')
      .map((status) => ({
        ...status,
        tasks: searchedLocationTasks.value.filter((task) => task.status === status.value),
      })),
  )

  const dashboardStats = computed(() => {
    const allTasks = dashboardTasks.value
    const totalTasks = allTasks.length
    const openTasks = allTasks.filter(isOpenTask).length
    const doneTasks = allTasks.filter((task) => task.status === 'done').length
    const archivedTasks = allTasks.filter((task) => task.status === 'archived').length
    const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
    const dueToday = allTasks.filter((task) => isDueToday(task) && isOpenTask(task)).length
    const overdue = allTasks.filter(isOverdue).length
    const highPriority = allTasks.filter(
      (task) => ['urgent', 'high'].includes(task.priority) && isOpenTask(task),
    ).length
    const completedThisWeek = allTasks.filter((task) => {
      const completedAt = parseDate(task.completed_at)
      return Boolean(completedAt && completedAt >= startOfWeek())
    }).length
    const upcomingDeadlines = allTasks
      .filter((task) => task.due_date && isOpenTask(task))
      .sort((first, second) => new Date(first.due_date) - new Date(second.due_date))
      .slice(0, 5)
    const latestActivity = [...allTasks]
      .sort((first, second) => new Date(second.updated_at || second.created_at) - new Date(first.updated_at || first.created_at))
      .slice(0, 5)
    const visibleSpaces = activeSpaceId.value
      ? spaces.value.filter((space) => space.id === activeSpaceId.value)
      : spaces.value
    const spaceStats = visibleSpaces.map((space) => {
      const spaceTasks = allTasks.filter((task) => task.space_id === space.id)
      const complete = spaceTasks.filter((task) => task.status === 'done').length

      return {
        ...space,
        total: spaceTasks.length,
        open: spaceTasks.filter(isOpenTask).length,
        completionRate: spaceTasks.length ? Math.round((complete / spaceTasks.length) * 100) : 0,
        listCount: lists.value.filter((list) => list.space_id === space.id).length,
      }
    })
    const listStats = lists.value
      .filter((list) => (activeSpaceId.value ? list.space_id === activeSpaceId.value : true))
      .map((list) => {
        const listTasks = allTasks.filter((task) => task.list_id === list.id)
        const complete = listTasks.filter((task) => task.status === 'done').length

        return {
          ...list,
          total: listTasks.length,
          open: listTasks.filter(isOpenTask).length,
          done: complete,
          overdue: listTasks.filter(isOverdue).length,
          completionRate: listTasks.length ? Math.round((complete / listTasks.length) * 100) : 0,
        }
      })

    return {
      totalTasks,
      openTasks,
      doneTasks,
      archivedTasks,
      completionRate,
      dueToday,
      overdue,
      highPriority,
      completedThisWeek,
      statusCounts: countBy(allTasks, 'status'),
      priorityCounts: countBy(allTasks, 'priority'),
      upcomingDeadlines,
      latestActivity,
      spaceStats,
      listStats,
    }
  })

  watch(
    userId,
    () => {
      fetchTasks()
    },
    { immediate: true },
  )

  return {
    tasks,
    selectedFilter,
    searchQuery,
    dashboardTasks,
    locationTasks,
    filteredTasks,
    boardColumns,
    dashboardStats,
    isLoading,
    errorMessage,
    fetchTasks,
    createTask,
    updateTask,
    archiveTask,
    deleteTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
  }
}
