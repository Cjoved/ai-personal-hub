<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

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
  <section class="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
    <div>
      <p class="text-sm font-extrabold uppercase tracking-[0.2em] text-emerald-600">Personal Tasker</p>
      <h1 class="mt-3 text-3xl font-black text-slate-950">Welcome back</h1>
      <p class="mt-2 text-sm leading-6 text-slate-500">
        Sign in with your personal account to manage your private tasks, priorities, due dates, and dashboard.
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
        <label class="text-sm font-bold text-slate-700" for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label class="text-sm font-bold text-slate-700" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
        class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        :disabled="isSubmitting || !isSupabaseConfigured"
      >
        {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </section>
</template>
