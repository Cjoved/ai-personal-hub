<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

defineOptions({ inheritAttrs: false })

const emit = defineEmits(['update:modelValue'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="finance-date-input">
    <span class="finance-date-input__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    </span>
    <input
      v-bind="$attrs"
      :id="id || undefined"
      class="finance-input finance-date-input__field"
      type="date"
      :name="name || undefined"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :aria-label="ariaLabel || $attrs['aria-label'] || undefined"
      @input="onInput"
    />
  </div>
</template>
