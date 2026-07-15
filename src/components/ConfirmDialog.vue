<script setup>
import { useConfirm } from '../composables/useConfirm'

const { dialog, answer } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="dialog.open"
      class="confirm-dialog-backdrop"
      @click.self="answer(false)"
    >
      <div
        class="confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'confirm-dialog-title'"
      >
        <div class="confirm-dialog-handle" aria-hidden="true"></div>
        <header class="confirm-dialog-header">
          <h2 id="confirm-dialog-title" class="confirm-dialog-title">{{ dialog.title }}</h2>
          <p class="confirm-dialog-message">{{ dialog.message }}</p>
        </header>
        <footer class="confirm-dialog-footer">
          <button
            class="confirm-dialog-btn confirm-dialog-btn--secondary"
            type="button"
            @click="answer(false)"
          >
            {{ dialog.cancelLabel }}
          </button>
          <button
            class="confirm-dialog-btn confirm-dialog-btn--primary"
            :class="dialog.tone === 'danger' ? 'confirm-dialog-btn--danger' : 'confirm-dialog-btn--ok'"
            type="button"
            @click="answer(true)"
          >
            {{ dialog.confirmLabel }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
