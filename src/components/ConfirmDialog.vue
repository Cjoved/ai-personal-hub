<script setup>
import { useConfirm } from '../composables/useConfirm'

const { dialog, answer } = useConfirm()
</script>

<template>
  <div
    v-if="dialog.open"
    class="fixed inset-0 z-[250] grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
    @click.self="answer(false)"
  >
    <div class="shell-header w-full max-w-md rounded-2xl p-6 shadow-2xl shadow-slate-900/20">
      <h2 class="text-lg font-black text-slate-950">{{ dialog.title }}</h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ dialog.message }}</p>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          class="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
          type="button"
          @click="answer(false)"
        >
          {{ dialog.cancelLabel }}
        </button>
        <button
          class="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition focus:outline-none focus:ring-4"
          :class="
            dialog.tone === 'danger'
              ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/20'
              : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/20'
          "
          type="button"
          @click="answer(true)"
        >
          {{ dialog.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
