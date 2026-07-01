import { computed, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const defaultWorkspace = [
  {
    name: 'Personal',
    icon: 'P',
    color: '#10b981',
    lists: ['Inbox', 'This Week', 'Habits'],
  },
  {
    name: 'Work',
    icon: 'W',
    color: '#6366f1',
    lists: ['Inbox', 'Backlog'],
  },
  {
    name: 'Learning',
    icon: 'L',
    color: '#0ea5e9',
    lists: ['Courses', 'Projects', 'Reading'],
  },
]

const spaceColors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#14b8a6', '#6366f1']

function sortByPosition(items) {
  return [...items].sort((first, second) => first.position - second.position || first.name.localeCompare(second.name))
}

export function useWorkspace(user) {
  const spaces = ref([])
  const lists = ref([])
  const activeSpaceId = ref(null)
  const activeListId = ref(null)
  const activePage = ref('dashboard')
  const activeView = ref('list')
  const isLoading = ref(false)
  const errorMessage = ref('')

  const userId = computed(() => user.value?.id)
  const activeSpace = computed(() => spaces.value.find((space) => space.id === activeSpaceId.value) ?? null)
  const activeList = computed(() => lists.value.find((list) => list.id === activeListId.value) ?? null)
  const activeSpaceLists = computed(() =>
    sortByPosition(lists.value.filter((list) => list.space_id === activeSpaceId.value)),
  )
  const isDashboard = computed(() => activePage.value === 'dashboard' && !activeSpaceId.value && !activeListId.value)
  const isSpacesOverview = computed(() => activePage.value === 'spaces' && !activeSpaceId.value && !activeListId.value)
  const locationLabel = computed(() => {
    if (activeList.value && activeSpace.value) return `${activeSpace.value.name} / ${activeList.value.name}`
    if (activeSpace.value) return activeSpace.value.name
    if (isSpacesOverview.value) return 'Spaces'
    return 'Dashboard'
  })

  function selectDashboard() {
    activePage.value = 'dashboard'
    activeSpaceId.value = null
    activeListId.value = null
  }

  function selectSpaces() {
    activePage.value = 'spaces'
    activeSpaceId.value = null
    activeListId.value = null
  }

  function selectSpace(spaceId) {
    activePage.value = 'workspace'
    activeSpaceId.value = spaceId
    activeListId.value = null
  }

  function selectList(listId) {
    const nextList = lists.value.find((list) => list.id === listId)
    if (!nextList) return

    activePage.value = 'workspace'
    activeSpaceId.value = nextList.space_id
    activeListId.value = nextList.id
  }

  function ensureActiveLocation() {
    if (!spaces.value.length) {
      selectDashboard()
      return
    }

    if (activeSpaceId.value && !spaces.value.some((space) => space.id === activeSpaceId.value)) {
      activeSpaceId.value = null
      activeListId.value = null
    }

    if (activeListId.value && !lists.value.some((list) => list.id === activeListId.value)) {
      activeListId.value = null
    }
  }

  async function seedDefaultWorkspace() {
    const createdSpaces = []

    for (const [spaceIndex, space] of defaultWorkspace.entries()) {
      const { data: createdSpace, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          user_id: userId.value,
          name: space.name,
          icon: space.icon,
          color: space.color,
          position: spaceIndex,
        })
        .select()
        .single()

      if (spaceError) throw spaceError

      createdSpaces.push(createdSpace)

      const listRows = space.lists.map((name, listIndex) => ({
        user_id: userId.value,
        space_id: createdSpace.id,
        name,
        position: listIndex,
      }))

      const { error: listError } = await supabase.from('task_lists').insert(listRows)
      if (listError) throw listError
    }

    return createdSpaces
  }

  async function fetchWorkspace() {
    if (!userId.value || !isSupabaseConfigured) {
      spaces.value = []
      lists.value = []
      selectDashboard()
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      let { data: spaceRows, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .eq('user_id', userId.value)
        .order('position', { ascending: true })

      if (spacesError) throw spacesError

      if (!spaceRows?.length) {
        await seedDefaultWorkspace()
        const response = await supabase
          .from('spaces')
          .select('*')
          .eq('user_id', userId.value)
          .order('position', { ascending: true })
        spaceRows = response.data ?? []
        if (response.error) throw response.error
      }

      const { data: listRows, error: listsError } = await supabase
        .from('task_lists')
        .select('*')
        .eq('user_id', userId.value)
        .order('position', { ascending: true })

      if (listsError) throw listsError

      spaces.value = sortByPosition(spaceRows ?? [])
      lists.value = sortByPosition(listRows ?? [])
      ensureActiveLocation()
    } catch (error) {
      errorMessage.value = error.message
    } finally {
      isLoading.value = false
    }
  }

  async function createSpace(name) {
    if (!userId.value || !name?.trim()) return false

    errorMessage.value = ''
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        user_id: userId.value,
        name: name.trim(),
        icon: name.trim().slice(0, 1).toUpperCase(),
        color: spaceColors[spaces.value.length % spaceColors.length],
        position: spaces.value.length,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    spaces.value = sortByPosition([...spaces.value, data])
    await createList(data.id, 'Inbox')
    return true
  }

  async function createList(spaceId, name) {
    if (!userId.value || !spaceId || !name?.trim()) return false

    errorMessage.value = ''
    const position = lists.value.filter((list) => list.space_id === spaceId).length
    const { data, error } = await supabase
      .from('task_lists')
      .insert({
        user_id: userId.value,
        space_id: spaceId,
        name: name.trim(),
        position,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    lists.value = sortByPosition([...lists.value, data])
    return data
  }

  async function deleteSpace(spaceId) {
    if (!userId.value || !spaceId) return false

    errorMessage.value = ''
    const { error } = await supabase.from('spaces').delete().eq('id', spaceId).eq('user_id', userId.value)

    if (error) {
      errorMessage.value = error.message
      return false
    }

    const hadActiveListInSpace = lists.value.some(
      (list) => list.space_id === spaceId && list.id === activeListId.value,
    )

    spaces.value = spaces.value.filter((space) => space.id !== spaceId)
    lists.value = lists.value.filter((list) => list.space_id !== spaceId)

    if (activeSpaceId.value === spaceId || hadActiveListInSpace) {
      activeSpaceId.value = null
      activeListId.value = null
      activePage.value = 'spaces'
    }

    return true
  }

  async function deleteList(listId) {
    if (!userId.value || !listId) return false

    errorMessage.value = ''
    const { error } = await supabase.from('task_lists').delete().eq('id', listId).eq('user_id', userId.value)

    if (error) {
      errorMessage.value = error.message
      return false
    }

    lists.value = lists.value.filter((list) => list.id !== listId)
    if (activeListId.value === listId) activeListId.value = null
    return true
  }

  watch(
    userId,
    () => {
      fetchWorkspace()
    },
    { immediate: true },
  )

  return {
    spaces,
    lists,
    activeSpaceId,
    activeListId,
    activeView,
    activePage,
    activeSpace,
    activeList,
    activeSpaceLists,
    isDashboard,
    isSpacesOverview,
    locationLabel,
    isLoading,
    errorMessage,
    fetchWorkspace,
    createSpace,
    createList,
    deleteSpace,
    deleteList,
    selectDashboard,
    selectSpaces,
    selectSpace,
    selectList,
  }
}
