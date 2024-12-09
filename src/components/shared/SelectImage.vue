<script lang="ts">
export type FileWithUrl = File & { url?: URL };
</script>

<script setup lang="ts">
interface Props {
  file?: FileWithUrl;
  disabled?: boolean;
}

const { file, disabled = undefined } = defineProps<Props>();
const emit = defineEmits(["update:file"]);

function updateFile(file: FileWithUrl | undefined) {
  if (file) {
    file.url = new URL(URL.createObjectURL(file));
  }

  console.debug("Emitting file update", file);
  emit("update:file", file);
}

function onFileChange(e: Event) {
  updateFile((e.target as HTMLInputElement).files?.[0]);
}

function onFileDrop(e: DragEvent) {
  updateFile(e.dataTransfer!.files?.[0]);
}
</script>

<template lang="pug">
label.label.h-full.w-full.flex.flex-col.justify-center.items-center(
  @dragover.prevent
  @drop.prevent="onFileDrop"
  :class="{ 'cursor-pointer': !disabled, 'cursor-not-allowed': disabled }"
)
  img.h-full.w-full.object-cover.rounded(
    v-if="file"
    :src="file.url?.toString()"
  )
  .flex.flex-col.items-center.select-none(v-else)
    span.text-2xl 🖼
    span.text-sm.font-medium Select image
  input.input.hidden(
    type="file"
    @change="onFileChange"
    accept="image/*"
    :disabled="disabled"
  )
</template>

<style scoped lang="scss"></style>
