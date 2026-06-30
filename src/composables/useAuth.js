import { computed, ref } from 'vue'
import { configuredAllowedEmail, isSupabaseConfigured, supabase } from '../lib/supabase'

const session = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
let authSubscription
let hasInitialized = false

function isAllowedUser(nextSession) {
  if (!nextSession) return true
  if (!configuredAllowedEmail) return true

  return nextSession?.user?.email?.toLowerCase() === configuredAllowedEmail
}

async function rejectDisallowedSession(nextSession) {
  if (!nextSession) return false
  if (isAllowedUser(nextSession)) return false

  session.value = null
  errorMessage.value = 'This app is restricted to your personal account.'
  await supabase.auth.signOut()
  return true
}

function queueDisallowedSignOut() {
  globalThis.setTimeout(() => {
    supabase.auth.signOut()
  }, 0)
}

async function initializeAuth() {
  if (hasInitialized) return
  hasInitialized = true

  if (!isSupabaseConfigured) {
    isLoading.value = false
    errorMessage.value = 'Add your Supabase URL and anon key to .env.local to enable auth.'
    return
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    errorMessage.value = error.message
  }

  session.value = data?.session ?? null
  await rejectDisallowedSession(session.value)
  isLoading.value = false

  const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    if (nextSession && !isAllowedUser(nextSession)) {
      session.value = null
      errorMessage.value = 'This app is restricted to your personal account.'
      queueDisallowedSignOut()
      return
    }

    session.value = nextSession
    errorMessage.value = ''
  })

  authSubscription = listener.subscription
}

async function signIn(email, password) {
  errorMessage.value = ''

  if (configuredAllowedEmail && email.trim().toLowerCase() !== configuredAllowedEmail) {
    errorMessage.value = 'Use the email configured for this personal tasker.'
    return false
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    errorMessage.value = error.message
    return false
  }

  return true
}

async function signOut() {
  errorMessage.value = ''
  const { error } = await supabase.auth.signOut()

  if (error) {
    errorMessage.value = error.message
    return false
  }

  return true
}

function disposeAuth() {
  authSubscription?.unsubscribe()
  authSubscription = null
  hasInitialized = false
}

export function useAuth() {
  initializeAuth()

  return {
    session,
    user: computed(() => session.value?.user ?? null),
    isAuthenticated: computed(() => Boolean(session.value?.user)),
    isLoading,
    errorMessage,
    isSupabaseConfigured,
    configuredAllowedEmail,
    signIn,
    signOut,
    disposeAuth,
  }
}
