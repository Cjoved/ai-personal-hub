<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
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
  placeholder: {
    type: String,
    default: '0.00',
  },
  min: {
    type: [String, Number],
    default: '0',
  },
  step: {
    type: [String, Number],
    default: '0.01',
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
  <div class="finance-money-input">
    <span class="finance-money-input__currency" aria-hidden="true">₱</span>
    <input
      v-bind="$attrs"
      :id="id || undefined"
      class="finance-input finance-money-input__field"
      type="number"
      inputmode="decimal"
      :name="name || undefined"
      :value="modelValue"
      :min="min"
      :step="step"
      :required="required"
      :disabled="disabled"
      :placeholder="placeholder"
      :aria-label="ariaLabel || $attrs['aria-label'] || undefined"
      @input="onInput"
    />
  </div>
</template>
