<script setup>
import { computed, ref, watch } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AuthForm from './components/AuthForm.vue'
import BoardView from './components/BoardView.vue'
import AiSchedulerPanel from './components/AiSchedulerPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import DashboardCards from './components/DashboardCards.vue'
import GoalEditor from './components/GoalEditor.vue'
import GoalsPanel from './components/GoalsPanel.vue'
import OnboardingBanner from './components/OnboardingBanner.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import SpacesOverview from './components/SpacesOverview.vue'
import TaskAssistant from './components/TaskAssistant.vue'
import TaskEditor from './components/TaskEditor.vue'
import TaskList from './components/TaskList.vue'
import ToastStack from './components/ToastStack.vue'
import WorkspaceHeader from './components/WorkspaceHeader.vue'
import { useAuth } from './composables/useAuth'
import { useConfirm } from './composables/useConfirm'
import { useGoals } from './composables/useGoals'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useSettings } from './composables/useSettings'
import { useTasks } from './composables/useTasks'
import { useToast } from './composables/useToast'
import { useWorkspace } from './composables/useWorkspace'

const { user, isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth()

const workspace = useWorkspace(user)
const {
  spaces,
  lists,
  activeSpaceId,
  activeListId,
  activeView,
  activeSpace,
  activeList,
  isDashboard,
  isSpacesOverview,
  isGoalsOverview,
  locationLabel,
  isLoading: isWorkspaceLoading,
  errorMessage: workspaceErrorMessage,
  createSpace,
  createList,
  fetchWorkspace,
  updateSpace,
  updateList,
  reorderSpaces,
  deleteSpace,
  deleteList,
  selectDashboard,
  selectSpaces,
  selectGoals,
  selectSpace,
  selectList,
} = workspace

const {
  goals,
  activeGoals,
  isLoading: isGoalsLoading,
  errorMessage: goalsErrorMessage,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchGoals,
} = useGoals(user)

const {
  selectedFilter,
  selectedTag,
  searchQuery,
  allTags,
  todayDashboardTasks,
  filteredTasks,
  boardColumns,
  dashboardStats,
  hasMoreTasks,
  isLoading: isTaskLoading,
  errorMessage: taskErrorMessage,
  createTask,
  updateTask,
  archiveTask,
  restoreArchivedTask,
  deleteTask,
  restoreDeletedTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
  fetchTasks,
} = useTasks(user, workspace)

const { settings, onboardingComplete, update: updateSettings, completeOnboarding } = useSettings(user)
const toast = useToast()
const { confirmDelete } = useConfirm()

const editingTask = ref(null)
const creatingTask = ref(false)
const editingGoal = ref(null)
const creatingGoal = ref(false)
const highlightedTaskId = ref(null)
const highlightedTaskTone = ref(null)
const showSettings = ref(false)
const showScheduler = ref(false)
const isSidebarOpen = ref(false)
const headerRef = ref(null)

const isLoadingWorkspace = computed(() => isWorkspaceLoading.value && isAuthenticated.value)

function openScheduler() {
  showScheduler.value = true
}

async function refreshAssistantData() {
  await fetchWorkspace()
  await fetchTasks()
  await fetchGoals()
}

function taskLocationLabel(task) {
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  return task.list?.name || task.space?.name || 'List'
}

function handleTodayTaskShortcut({ task, section }) {
  if (!task) return

  closeSidebar()

  const filterBySection = {
    overdue: 'overdue',
    dueToday: 'today',
    completedToday: 'completed',
  }

  selectedFilter.value = filterBySection[section] || 'all'
  activeView.value = 'list'

  if (task.list_id) {
    selectList(task.list_id)
  } else if (task.space_id) {
    selectSpace(task.space_id)
  } else {
    toast.error('This task is not assigned to a list yet.')
    return
  }

  const toneBySection = {
    overdue: 'overdue',
    dueToday: 'due',
    completedToday: 'done',
  }

  highlightedTaskId.value = task.id
  highlightedTaskTone.value = toneBySection[section] || 'done'
  toast.success(`Opened ${taskLocationLabel(task)}`)

  window.setTimeout(() => {
    if (highlightedTaskId.value === task.id) {
      highlightedTaskId.value = null
      highlightedTaskTone.value = null
    }
  }, 6000)
}

const newTaskTemplate = computed(() => ({
  id: null,
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  space_id: activeSpaceId.value,
  list_id: activeListId.value,
  category: '',
  tags: [],
  due_date: null,
  reminder_at: null,
  recurrence_rule: 'none',
  recurrence_interval: 1,
  estimated_minutes: null,
}))

watch(
  () => [isAuthenticated.value, settings.value.defaultSpaceId, spaces.value.length],
  () => {
    if (!isAuthenticated.value || !settings.value.defaultSpaceId || activeSpaceId.value || activeListId.value) return
    const exists = spaces.value.some((space) => space.id === settings.value.defaultSpaceId)
    if (exists) selectSpace(settings.value.defaultSpaceId)
  },
)

useKeyboardShortcuts({
  focusSearch: () => headerRef.value?.focusSearch(),
  newTask: () => {
    if (isAuthenticated.value && activeListId.value) openCreateTask()
  },
  escape: () => {
    closeTaskEditor()
    closeGoalEditor()
    showSettings.value = false
    isSidebarOpen.value = false
  },
})

function openCreateTask() {
  editingTask.value = null
  creatingTask.value = true
}

function closeTaskEditor() {
  editingTask.value = null
  creatingTask.value = false
}

function openCreateGoal() {
  editingGoal.value = null
  creatingGoal.value = true
}

function openEditGoal(goal) {
  editingGoal.value = goal
  creatingGoal.value = false
}

function closeGoalEditor() {
  editingGoal.value = null
  creatingGoal.value = false
}

function goToGoals() {
  selectGoals()
  closeSidebar()
}

function closeSidebar() {
  isSidebarOpen.value = false
}

async function handleCreateTask(payload) {
  const didCreate = await createTask({ ...payload, status: payload.status || 'todo' })
  if (didCreate) {
    creatingTask.value = false
    toast.success('Task added to To Do')
    return
  }
  if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleQuickAddTask(payload) {
  const didCreate = await createTask(payload)
  if (didCreate) {
    toast.success('Task added')
    return
  }
  if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleSaveTask(taskId, patch) {
  const didUpdate = await updateTask(taskId, patch)
  if (didUpdate) {
    closeTaskEditor()
    toast.success('Task updated successfully')
    return
  }
  if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleUpdateTask(taskId, patch) {
  const didUpdate = await updateTask(taskId, patch)
  if (!didUpdate && taskErrorMessage.value) toast.error(taskErrorMessage.value)
  else if (didUpdate && patch.status === 'done') {
    const task = filteredTasks.value.find((item) => item.id === taskId)
    if (task?.recurrence_rule && task.recurrence_rule !== 'none') {
      toast.success('Recurring task rescheduled')
    }
  }
}

async function handleArchiveTask(taskId) {
  const didArchive = await archiveTask(taskId)
  if (didArchive) toast.success('Task archived')
  else if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleRestoreTask(taskId) {
  const didRestore = await restoreArchivedTask(taskId)
  if (didRestore) toast.success('Task restored')
  else if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleDeleteTask(taskId) {
  const task = filteredTasks.value.find((item) => item.id === taskId)
  const confirmed = await confirmDelete('task', task?.title)
  if (!confirmed) return

  const { ok, snapshot } = await deleteTask(taskId)
  if (ok) {
    toast.successWithUndo('Task deleted', async () => {
      const restored = await restoreDeletedTask(snapshot)
      if (restored) toast.success('Task restored')
      else if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
    })
    return
  }
  if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleDeleteSubtask(subtaskId) {
  const confirmed = await confirmDelete('subtask')
  if (!confirmed) return
  const didDelete = await deleteSubtask(subtaskId)
  if (didDelete) toast.success('Subtask deleted')
  else if (taskErrorMessage.value) toast.error(taskErrorMessage.value)
}

async function handleSignOut() {
  closeTaskEditor()
  closeGoalEditor()
  showSettings.value = false
  await signOut()
  selectDashboard()
}

async function handleDeleteSpace(spaceId) {
  const didDelete = await deleteSpace(spaceId)
  if (didDelete) {
    closeTaskEditor()
    await fetchTasks()
  }
  return didDelete
}

async function handleSaveGoal(payload) {
  if (payload.id) {
    const didUpdate = await updateGoal(payload.id, {
      title: payload.title,
      description: payload.description,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      color: payload.color,
    })
    if (didUpdate) {
      closeGoalEditor()
      toast.success('Goal updated')
      return
    }
  } else {
    const created = await createGoal(payload)
    if (created) {
      closeGoalEditor()
      toast.success('Goal created')
      return
    }
  }
  if (goalsErrorMessage.value) toast.error(goalsErrorMessage.value)
}

async function handleDeleteGoal(goalId) {
  const goal = goals.value.find((item) => item.id === goalId)
  const confirmed = await confirmDelete('goal', goal?.title)
  if (!confirmed) return

  const didDelete = await deleteGoal(goalId)
  if (didDelete) toast.success('Goal deleted')
  else if (goalsErrorMessage.value) toast.error(goalsErrorMessage.value)
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div v-if="isAuthLoading" class="grid min-h-screen place-items-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading your workspace...</p>
      </div>
    </div>

    <div v-else-if="!isAuthenticated" class="grid min-h-screen place-items-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <AuthForm />
    </div>

    <div v-else class="app-shell min-h-screen lg:grid lg:h-dvh lg:grid-cols-[18rem_1fr] lg:overflow-hidden">
      <div
        v-if="isSidebarOpen"
        class="sidebar-backdrop lg:hidden"
        aria-hidden="true"
        @click="closeSidebar"
      ></div>

      <AppSidebar
        class="sidebar-shell sidebar-drawer"
        :class="{ 'sidebar-drawer--open': isSidebarOpen }"
        :spaces="spaces"
        :lists="lists"
        :active-space-id="activeSpaceId"
        :active-list-id="activeListId"
        :is-dashboard="isDashboard"
        :is-spaces-overview="isSpacesOverview"
        :is-goals-overview="isGoalsOverview"
        :create-list="createList"
        :update-list="updateList"
        :delete-list="deleteList"
        :user-email="user.email"
        @select-dashboard="selectDashboard(); closeSidebar()"
        @select-spaces="selectSpaces(); closeSidebar()"
        @select-goals="selectGoals(); closeSidebar()"
        @select-space="selectSpace($event); closeSidebar()"
        @select-list="selectList($event); closeSidebar()"
        @open-settings="showSettings = true"
        @sign-out="handleSignOut"
        @close="closeSidebar"
      />

      <section class="app-main-bg min-h-screen min-w-0 w-full lg:h-dvh lg:overflow-y-auto">
        <div class="app-content-shell w-full space-y-5 px-3 py-5 sm:px-4 lg:px-5">
          <OnboardingBanner :visible="!onboardingComplete" @complete="completeOnboarding" />

          <WorkspaceHeader
            ref="headerRef"
            v-model:active-view="activeView"
            v-model:selected-filter="selectedFilter"
            v-model:selected-tag="selectedTag"
            v-model:search-query="searchQuery"
            :location-label="locationLabel"
            :is-dashboard="isDashboard"
            :is-spaces-overview="isSpacesOverview"
            :is-goals-overview="isGoalsOverview"
            :active-goals="activeGoals"
            :is-space-summary="Boolean(activeSpaceId && !activeListId && !isDashboard && !isSpacesOverview && !isGoalsOverview)"
            :active-space="activeSpace"
            :active-list="activeList"
            :all-tags="allTags"
            :user-email="user.email"
            :workspace-error="workspaceErrorMessage"
            :show-quick-add="Boolean(activeListId)"
            @add-task="openCreateTask"
            @quick-add-task="handleQuickAddTask"
            @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
            @open-scheduler="openScheduler"
            @go-to-goals="goToGoals"
          />

          <p
            v-if="hasMoreTasks"
            class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            Showing your latest 500 tasks. Older tasks are hidden until pagination is added.
          </p>

          <div v-if="isLoadingWorkspace" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Preparing your Spaces and Lists...
          </div>

          <template v-else>
            <DashboardCards
              v-if="isDashboard"
              :stats="dashboardStats"
              :today-tasks="todayDashboardTasks"
              title="Dashboard"
              breakdown-scope="home"
              @go-to-task="handleTodayTaskShortcut"
            />
            <SpacesOverview
              v-else-if="isSpacesOverview"
              :spaces="spaces"
              :lists="lists"
              :create-space="createSpace"
              :create-list="createList"
              :update-space="updateSpace"
              :update-list="updateList"
              :delete-space="handleDeleteSpace"
              :delete-list="deleteList"
              :reorder-spaces="reorderSpaces"
              @select-space="selectSpace"
              @select-list="selectList"
            />
            <GoalsPanel
              v-else-if="isGoalsOverview"
              :goals="goals"
              :is-loading="isGoalsLoading"
              @create-goal="openCreateGoal"
              @edit-goal="openEditGoal"
              @delete-goal="handleDeleteGoal"
            />
            <DashboardCards
              v-else-if="!activeListId"
              :stats="dashboardStats"
              :title="activeSpace?.name || 'Space'"
              :space="activeSpace"
              breakdown-scope="space"
            />

            <template v-else>
              <TaskList
                v-if="activeView === 'list'"
                :tasks="filteredTasks"
                :title="activeList?.name || 'Tasks'"
                :is-loading="isTaskLoading"
                :error-message="taskErrorMessage"
                :highlighted-task-id="highlightedTaskId"
                :highlighted-task-tone="highlightedTaskTone"
                :create-subtask="createSubtask"
                :update-subtask="updateSubtask"
                :delete-subtask="handleDeleteSubtask"
                @update-task="handleUpdateTask"
                @archive-task="handleArchiveTask"
                @restore-task="handleRestoreTask"
                @delete-task="handleDeleteTask"
                @edit-task="(task) => (editingTask = task)"
              />

              <BoardView
                v-else
                :columns="boardColumns"
                :is-loading="isTaskLoading"
                :error-message="taskErrorMessage"
                @update-task="handleUpdateTask"
                @archive-task="handleArchiveTask"
                @delete-task="handleDeleteTask"
                @edit-task="(task) => (editingTask = task)"
              />
            </template>
          </template>
        </div>
      </section>

      <TaskEditor
        v-if="editingTask || creatingTask"
        :task="editingTask || newTaskTemplate"
        :spaces="spaces"
        :lists="lists"
        :create-subtask="createSubtask"
        :update-subtask="updateSubtask"
        :delete-subtask="handleDeleteSubtask"
        :reorder-subtasks="reorderSubtasks"
        @save-task="handleSaveTask"
        @create-task="handleCreateTask"
        @close="closeTaskEditor"
      />

      <GoalEditor
        :is-open="creatingGoal || Boolean(editingGoal)"
        :goal="editingGoal"
        @save="handleSaveGoal"
        @close="closeGoalEditor"
      />

      <SettingsPanel
        v-if="showSettings"
        :settings="settings"
        :spaces="spaces"
        @update="updateSettings"
        @close="showSettings = false"
      />

      <AiSchedulerPanel
        v-if="showScheduler"
        :list-id="activeListId"
        :space-id="activeSpaceId"
        :update-task="updateTask"
        @close="showScheduler = false"
      />

      <TaskAssistant :on-data-change="refreshAssistantData" />
    </div>

    <ToastStack />
    <ConfirmDialog />
  </main>
</template>
