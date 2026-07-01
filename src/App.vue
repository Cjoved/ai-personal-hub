<script setup>
import { computed, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AuthForm from './components/AuthForm.vue'
import BoardView from './components/BoardView.vue'
import DashboardCards from './components/DashboardCards.vue'
import QuickAddTask from './components/QuickAddTask.vue'
import SpacesOverview from './components/SpacesOverview.vue'
import TaskEditor from './components/TaskEditor.vue'
import TaskFilters from './components/TaskFilters.vue'
import TaskList from './components/TaskList.vue'
import WorkspaceHeader from './components/WorkspaceHeader.vue'
import { useAuth } from './composables/useAuth'
import { useTasks } from './composables/useTasks'
import { useWorkspace } from './composables/useWorkspace'

const {
  user,
  isAuthenticated,
  isLoading: isAuthLoading,
  signOut,
} = useAuth()

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
  locationLabel,
  isLoading: isWorkspaceLoading,
  errorMessage: workspaceErrorMessage,
  createSpace,
  createList,
  deleteSpace,
  selectDashboard,
  selectSpaces,
  selectSpace,
  selectList,
} = workspace

const {
  selectedFilter,
  searchQuery,
  filteredTasks,
  boardColumns,
  dashboardStats,
  isLoading: isTaskLoading,
  errorMessage: taskErrorMessage,
  createTask,
  updateTask,
  archiveTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  fetchTasks,
} = useTasks(user, workspace)

const editingTask = ref(null)

const isLoadingWorkspace = computed(() => isWorkspaceLoading.value && isAuthenticated.value)

async function handleSaveTask(taskId, patch) {
  const didUpdate = await updateTask(taskId, patch)

  if (didUpdate) {
    editingTask.value = null
  }
}

async function handleSignOut() {
  editingTask.value = null
  await signOut()
  selectDashboard()
}

async function handleDeleteSpace(spaceId) {
  const didDelete = await deleteSpace(spaceId)
  if (didDelete) {
    editingTask.value = null
    await fetchTasks()
  }
  return didDelete
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <div v-if="isAuthLoading" class="grid min-h-screen place-items-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p class="text-sm font-semibold text-slate-600">Loading your workspace...</p>
      </div>
    </div>

    <div v-else-if="!isAuthenticated" class="grid min-h-screen place-items-center bg-slate-100 px-4 py-8">
      <AuthForm />
    </div>

    <div v-else class="grid min-h-screen lg:grid-cols-[18rem_1fr]">
      <AppSidebar
        :spaces="spaces"
        :lists="lists"
        :active-space-id="activeSpaceId"
        :active-list-id="activeListId"
        :is-dashboard="isDashboard"
        :is-spaces-overview="isSpacesOverview"
        :create-list="createList"
        @select-dashboard="selectDashboard"
        @select-spaces="selectSpaces"
        @select-space="selectSpace"
        @select-list="selectList"
      />

      <section class="min-w-0 bg-slate-50">
        <div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          <WorkspaceHeader
            v-model:active-view="activeView"
            :location-label="locationLabel"
            :is-dashboard="isDashboard"
            :is-spaces-overview="isSpacesOverview"
            :active-space="activeSpace"
            :active-list="activeList"
            v-model:search-query="searchQuery"
            :user-email="user.email"
            :workspace-error="workspaceErrorMessage"
            @sign-out="handleSignOut"
          />

          <div v-if="isLoadingWorkspace" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Preparing your Spaces and Lists...
          </div>

          <template v-else>
            <DashboardCards v-if="isDashboard" :stats="dashboardStats" title="Dashboard" />
            <SpacesOverview
              v-else-if="isSpacesOverview"
              :spaces="spaces"
              :lists="lists"
              :create-space="createSpace"
              :create-list="createList"
              :delete-space="handleDeleteSpace"
              @select-space="selectSpace"
              @select-list="selectList"
            />
            <DashboardCards v-else-if="!activeListId" :stats="dashboardStats" :title="`${activeSpace?.name} Summary`" />

            <template v-else>
              <QuickAddTask :create-task="createTask" :location-label="locationLabel" />
              <TaskFilters v-model="selectedFilter" />

              <TaskList
                v-if="activeView === 'list'"
                :tasks="filteredTasks"
                :title="activeList?.name || 'Tasks'"
                :is-loading="isTaskLoading"
                :error-message="taskErrorMessage"
                :create-subtask="createSubtask"
                :update-subtask="updateSubtask"
                :delete-subtask="deleteSubtask"
                @update-task="updateTask"
                @archive-task="archiveTask"
                @delete-task="deleteTask"
                @edit-task="(task) => (editingTask = task)"
              />

              <BoardView
                v-else
                :columns="boardColumns"
                :is-loading="isTaskLoading"
                :error-message="taskErrorMessage"
                @update-task="updateTask"
                @archive-task="archiveTask"
                @delete-task="deleteTask"
                @edit-task="(task) => (editingTask = task)"
              />
            </template>
          </template>
        </div>
      </section>

      <TaskEditor
        v-if="editingTask"
        :task="editingTask"
        :spaces="spaces"
        :lists="lists"
        @save-task="handleSaveTask"
        @close="editingTask = null"
      />
    </div>
  </main>
</template>
