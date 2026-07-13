<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import AppLogo from './AppLogo.vue'
import ThemeToggle from './ThemeToggle.vue'

const { errorMessage, isSupabaseConfigured, signIn } = useAuth()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!email.value || !password.value || isSubmitting.value || !isSupabaseConfigured) return

  isSubmitting.value = true
  await signIn(email.value, password.value)
  isSubmitting.value = false
}
</script>

<template>
  <section class="relative mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <div class="flex flex-col items-center text-center">
      <AppLogo variant="full" />
      <h1 class="type-display mt-5 text-slate-950 dark:text-slate-100">Welcome back</h1>
      <p class="type-body type-muted mt-2 max-w-sm leading-relaxed">
        Sign in to your Personal Hub — tasks, habits, and finance in one place.
      </p>
    </div>

    <div
      v-if="!isSupabaseConfigured"
      class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
    >
      Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` before using auth.
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="type-body-sm font-bold text-slate-700 dark:text-slate-300" for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          class="type-input mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label class="type-body-sm font-bold text-slate-700 dark:text-slate-300" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="type-input mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          type="password"
          autocomplete="current-password"
          placeholder="At least 6 characters"
          required
          minlength="6"
        />
      </div>

      <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {{ errorMessage }}
      </p>

      <button
        class="type-button w-full rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        :disabled="isSubmitting || !isSupabaseConfigured"
      >
        {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </section>
</template>
