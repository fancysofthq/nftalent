<script setup lang="ts">
import SelectImage, { type FileWithUrl } from "@/components/SelectImage.vue";
import { computed, ref, type Ref } from "vue";
import TagInput from "@/components/TagInput.vue";
import TokenPreview from "@/components/TokenPreview.vue";
import { BigNumber, ethers } from "ethers";
import { account } from "@/service/eth";
import Account from "@/service/eth/Account";
import { ERC1155TokenWrapper } from "@/service/db";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { type Metadata } from "@/service/eth/contract/IPNFTRedeemable";
import { type RoyaltyInfo } from "@/service/eth/contract/ERC2981";

const image: Ref<FileWithUrl | undefined> = ref(undefined);
const name: Ref<string | undefined> = ref(undefined);
const description: Ref<string | undefined> = ref(undefined);

// TODO: Make it dynamic.
const duration: Ref<number | undefined> = ref(1000 * 60 * 60);

const today = new Date();
const oneMonthApart = new Date();
oneMonthApart.setMonth(oneMonthApart.getMonth() + 1);
const expiresAt: Ref<Date> = ref(oneMonthApart);

const tags: Ref<string[]> = ref([]);
const priceEth: Ref<number> = ref(0.025);
const editions: Ref<number> = ref(0);
const royalty: Ref<number> = ref(10);

const price = computed(() => {
  return ethers.utils.parseEther(priceEth.value.toString());
});

const isMintable = computed(() => {
  return (
    image.value !== undefined &&
    name.value !== undefined &&
    price.value.gt(0) &&
    description.value !== undefined &&
    duration.value !== undefined &&
    expiresAt.value > today &&
    editions.value > 0
  );
});

const tokenPreview = computed(() => {
  return new ERC1155TokenWrapper(
    new ERC1155Token(Account.zero(), BigNumber.from(0), {
      name: name.value || "Name",
      description: description.value || "Description",
      image: image.value?.url || "",
      properties: {
        tags: tags.value,
        duration: duration.value || 0,
        expiresAt: expiresAt.value || new Date(),
      },
    } as Metadata),
    account.value || Account.zero(),
    editions.value,
    price.value,
    {
      receiver: account.value || Account.zero(),
      royalty: royalty.value ? royalty.value / 255 : 0,
    } as RoyaltyInfo
  );
});

function mint() {
  console.debug("Minting", {
    image: image.value,
    name: name.value,
    description: description.value,
    duration: duration.value,
    expiresAt: expiresAt.value,
    tags: tags.value,
  });
}

function onExpiresAtChange(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    expiresAt.value = new Date(event.target.value);
  }
}
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg ✨ Mint
    form.daisy-form-control.max-w-3xl.w-full.border.divide-y
      .p-4
        .flex.justify-between.items-center
          .w-full
            label.daisy-label
              span.daisy-label-text.font-semibold
                span Image
                span.ml-1(v-if="!image") ⚠️
            SelectImage.h-32.w-32.bg-base-200.rounded(
              v-model:image="image"
              :file="image"
              @update:file="image = $event"
            )
          div
            //- label.daisy-label
            //-   span.daisy-label-text.font-semibold Help
            //- p.p-4.bg-success.text-success-content.rounded-lg.h-32.text-sm For now, a token duration is set to 1 hour.

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Name
            span.ml-1(v-if="!name") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="text"
          placeholder="Name"
          v-model="name"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Description (Markdown)
            span.ml-1(v-if="!description") ⚠️
        textarea.daisy-textarea.daisy-textarea-bordered.w-full.-mb-1(
          type="text"
          placeholder="Description"
          rows="3"
          v-model="description"
        )

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Price (ETH/hr)
            span.ml-1(v-if="!price.gt(0)") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          placeholder="Price"
          step="0.005"
          v-model="priceEth"
        )

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Editions
            span.ml-1(v-if="editions == 0") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          placeholder="Editions"
          v-model="editions"
        )

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Royalty (0-255)
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          max="255"
          min="0"
          placeholder="Royalty"
          v-model="royalty"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Expires at
            span.ml-1(v-if="!(expiresAt > today)") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="date"
          :value="expiresAt.getFullYear() + '-' + (expiresAt.getMonth() + 1) + '-' + expiresAt.getDate()"
          @change="onExpiresAtChange"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold Tags
        TagInput.w-full(v-model="tags" placeholder="example-tag")

      .grid.p-4.gap-3.w-full(style="grid-template-columns: 10rem auto")
        img.rounded-lg.aspect-square.object-cover.w-full(
          :src="image?.url || 'https://via.placeholder.com/1024'"
        )
        TokenPreview.w-full(:token="tokenPreview")

      .p-4
        button.daisy-btn.w-full.daisy-btn-accent(
          @click="mint"
          :disabled="!isMintable"
        ) 
          span.text-lg ✨
          span Mint!
</template>

<style scoped lang="scss"></style>
