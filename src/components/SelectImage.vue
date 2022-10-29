<script lang="ts">
export type FileWithUrl = File & { url?: string };
</script>

<script setup lang="ts">
const props = defineProps<{ file: FileWithUrl | undefined }>();
const emit = defineEmits(["update:file"]);

function updateFile(file: FileWithUrl | undefined) {
  if (file) {
    file.url = URL.createObjectURL(file);
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
label.label.h-full.w-full.flex.flex-col.justify-center.items-center.cursor-pointer(
  @dragover.prevent
  @drop.prevent="onFileDrop"
)
  img.h-full.w-full.object-cover.rounded(v-if="file" :src="file.url")
  .flex.flex-col.items-center(v-else)
    span.text-2xl 🖼
    span.text-sm.font-medium Select image
  input.input.hidden(type="file" @change="onFileChange" accept="image/*")
</template>

<style scoped lang="scss"></style>
