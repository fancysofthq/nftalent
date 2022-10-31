<!-- SVGs by Sam Herbert (@sherb), for everyone. More @ http://goo.gl/7AJzbL -->

<script lang="ts">
export enum Kind {
  Puff,
  Rings,
  ThreeDots,
}
</script>

<script setup lang="ts">
defineProps<{ kind: Kind }>();
</script>

<template lang="pug">
.inline-block
  svg.inline-block(
    v-if="kind === Kind.Puff"
    viewBox="0 0 44 44"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
  )
    g(fill="none" fill-rule="evenodd" stroke-width="4")
      circle(cx="22" cy="22" r="1")
        animate(
          attributeName="r"
          begin="0s"
          dur="1.8s"
          values="1; 20"
          calcMode="spline"
          keyTimes="0; 1"
          keySplines="0.165, 0.84, 0.44, 1"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-opacity"
          begin="0s"
          dur="1.8s"
          values="1; 0"
          calcMode="spline"
          keyTimes="0; 1"
          keySplines="0.3, 0.61, 0.355, 1"
          repeatCount="indefinite"
        )
      circle(cx="22" cy="22" r="1")
        animate(
          attributeName="r"
          begin="-0.9s"
          dur="1.8s"
          values="1; 20"
          calcMode="spline"
          keyTimes="0; 1"
          keySplines="0.165, 0.84, 0.44, 1"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-opacity"
          begin="-0.9s"
          dur="1.8s"
          values="1; 0"
          calcMode="spline"
          keyTimes="0; 1"
          keySplines="0.3, 0.61, 0.355, 1"
          repeatCount="indefinite"
        )
  svg.inline-block(
    v-if="kind === Kind.Rings"
    width="45"
    height="45"
    viewBox="0 0 45 45"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
  )
    g(
      fill="none"
      fill-rule="evenodd"
      transform="translate(1 1)"
      stroke-width="2"
    )
      circle(cx="22" cy="22" r="6" stroke-opacity="0")
        animate(
          attributeName="r"
          begin="1.5s"
          dur="3s"
          values="6;22"
          calcMode="linear"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-opacity"
          begin="1.5s"
          dur="3s"
          values="1;0"
          calcMode="linear"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-width"
          begin="1.5s"
          dur="3s"
          values="2;0"
          calcMode="linear"
          repeatCount="indefinite"
        )
      circle(cx="22" cy="22" r="6" stroke-opacity="0")
        animate(
          attributeName="r"
          begin="3s"
          dur="3s"
          values="6;22"
          calcMode="linear"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-opacity"
          begin="3s"
          dur="3s"
          values="1;0"
          calcMode="linear"
          repeatCount="indefinite"
        )
        animate(
          attributeName="stroke-width"
          begin="3s"
          dur="3s"
          values="2;0"
          calcMode="linear"
          repeatCount="indefinite"
        )
      circle(cx="22" cy="22" r="8")
        animate(
          attributeName="r"
          begin="0s"
          dur="1.5s"
          values="6;1;2;3;4;5;6"
          calcMode="linear"
          repeatCount="indefinite"
        )
  svg.inline-block(
    v-if="kind === Kind.ThreeDots"
    width="120"
    height="30"
    viewBox="0 0 120 30"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  )
    circle(cx="15" cy="15" r="15")
      animate(
        attributeName="r"
        from="15"
        to="15"
        begin="0s"
        dur="0.8s"
        values="15;9;15"
        calcMode="linear"
        repeatCount="indefinite"
      )
      animate(
        attributeName="fill-opacity"
        from="1"
        to="1"
        begin="0s"
        dur="0.8s"
        values="1;.5;1"
        calcMode="linear"
        repeatCount="indefinite"
      )
    circle(cx="60" cy="15" r="9" fill-opacity="0.3")
      animate(
        attributeName="r"
        from="9"
        to="9"
        begin="0s"
        dur="0.8s"
        values="9;15;9"
        calcMode="linear"
        repeatCount="indefinite"
      )
      animate(
        attributeName="fill-opacity"
        from="0.5"
        to="0.5"
        begin="0s"
        dur="0.8s"
        values=".5;1;.5"
        calcMode="linear"
        repeatCount="indefinite"
      )
    circle(cx="105" cy="15" r="15")
      animate(
        attributeName="r"
        from="15"
        to="15"
        begin="0s"
        dur="0.8s"
        values="15;9;15"
        calcMode="linear"
        repeatCount="indefinite"
      )
      animate(
        attributeName="fill-opacity"
        from="1"
        to="1"
        begin="0s"
        dur="0.8s"
        values="1;.5;1"
        calcMode="linear"
        repeatCount="indefinite"
      )
</template>

<style scoped lang="scss"></style>
