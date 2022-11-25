<script setup lang="ts">
interface Props {
  animate?: boolean;
  rounded?: boolean;
}

const { animate = true, rounded = true } = defineProps<Props>();
</script>

<template lang="pug">
.content-placeholder-wrapper(:class="{ rounded: rounded }")
  div(:class="{ 'content-placeholder-activity': animate }")
</template>

<style lang="scss">
.content-placeholder-wrapper {
  position: relative;
  background-color: rgb(211, 211, 211);
  overflow: hidden;
}

.content-placeholder-activity {
  position: absolute;
  left: -45%;
  height: 100%;
  width: 45%;
  background-image: linear-gradient(
    to left,
    rgba(251, 251, 251, 0.05),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.6),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.05)
  );
  background-image: -moz-linear-gradient(
    to left,
    rgba(251, 251, 251, 0.05),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.6),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.05)
  );
  background-image: -webkit-linear-gradient(
    to left,
    rgba(251, 251, 251, 0.05),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.6),
    rgba(251, 251, 251, 0.3),
    rgba(251, 251, 251, 0.05)
  );
  animation: content-placeholder-loading 1s infinite;
}

@keyframes content-placeholder-loading {
  0% {
    left: -45%;
  }
  100% {
    left: 100%;
  }
}
</style>
