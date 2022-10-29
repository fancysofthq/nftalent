<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ modelValue: string[]; placeholder?: string }>();
const emit = defineEmits(["update:modelValue"]);

const newTag = ref("");

function addTag(e: FocusEvent | KeyboardEvent) {
  if (!newTag.value) return;
  props.modelValue.push(newTag.value);
  emit("update:modelValue", props.modelValue);
  newTag.value = "";
}

function onDelete(e: KeyboardEvent) {
  console.debug("onDelete");

  if (!newTag.value) {
    e.preventDefault();

    if (props.modelValue.length) {
      props.modelValue.pop();
      emit("update:modelValue", props.modelValue);
    }
  }
}

function deleteTag(index: number) {
  props.modelValue.splice(index, 1);
  emit("update:modelValue", props.modelValue);
}

function onCustomKey(e: KeyboardEvent) {
  switch (e.keyCode) {
    case 188:
    case 32:
      e.preventDefault();
      addTag(e);
      break;
  }
}
</script>

<template lang="pug">
.tag-input.daisy-input.daisy-input-bordered.flex.items-center.gap-1.flex-wrap.h-fit.px-4.py-2
  span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.inline-flex.gap-1(
    v-for="(tag, index) of modelValue"
  ) 
    | {{ tag }}
    span.cursor-pointer.text-error(@click="deleteTag(index)") x
  input.daisy-input.daisy-input-sm.px-0.grow(
    type="text"
    v-model="newTag"
    @keydown.delete="onDelete"
    @blur="addTag"
    @keyup.enter="addTag"
    @keydown="onCustomKey"
    :placeholder="modelValue.length ? '' : placeholder"
  )
</template>
