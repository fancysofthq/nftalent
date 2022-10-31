<script setup lang="ts">
import SelectImage, { type FileWithUrl } from "@/components/SelectImage.vue";
import { computed, ref, type Ref } from "vue";
import TagInput from "@/components/TagInput.vue";
import TokenPreview from "@/components/TokenPreview.vue";
import { BigNumber, type ContractTransaction, ethers } from "ethers";
import * as eth from "@/service/eth";
import Account from "@/service/eth/Account";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { type Metadata } from "@/service/eth/contract/NFTime";
import Spinner, { Kind as SpinnerKind } from "@/components/Spinner.vue";
import { Uint8 } from "@/util";
import { CID } from "multiformats";
import { nftStorageApiKey } from "@/store";
import { NFTStorage } from "nft.storage";
import {
  Listing,
  ListingConfig,
} from "@/service/eth/contract/NFTSimpleListing";
import Placeholder from "@/components/Placeholder.vue";
import { RichToken } from "@/components/RichToken";

const image: Ref<FileWithUrl | undefined> = ref(undefined);
const name: Ref<string | undefined> = ref(undefined);
const description: Ref<string | undefined> = ref(undefined);

// TODO: Make it dynamic.
const duration: Ref<number | undefined> = ref(1000 * 60 * 60);

const today = new Date();
const oneMonthApart = new Date();
oneMonthApart.setHours(0, 0, 0, 0);
oneMonthApart.setMonth(oneMonthApart.getMonth() + 1);
const expiresAt: Ref<Date> = ref(oneMonthApart);

const tags: Ref<string[]> = ref([]);
const priceEth: Ref<number> = ref(0.025);
const editions: Ref<number> = ref(0);
const royalty: Ref<number> = ref(10);

const price = computed(() => {
  return ethers.utils.parseEther(priceEth.value.toString());
});

enum MintStage {
  UploadToIPFS,
  SendTransaction,
  Done,
}

function stageName(stage: MintStage | string) {
  switch (stage) {
    case MintStage.UploadToIPFS:
      return "Upload to IPFS";
    case MintStage.SendTransaction:
      return "Send transaction";
    case MintStage.Done:
      return "Done!";
  }
}

const mintStage: Ref<MintStage | undefined> = ref(undefined);
const mintInProgress = computed(() => mintStage.value !== undefined);
const cid: Ref<CID | undefined> = ref(undefined);

const isMintable = computed(() => {
  return (
    !mintInProgress.value &&
    nftStorageApiKey.value &&
    image.value !== undefined &&
    name.value !== undefined &&
    price.value.gt(0) &&
    description.value !== undefined &&
    duration.value !== undefined &&
    expiresAt.value > today &&
    editions.value > 0
  );
});

const erc1155Token = new ERC1155Token(Account.zero(), BigNumber.from(0));

const tokenPreview = computed(
  () =>
    new RichToken(erc1155Token, {
      metadata: ref({
        name: name.value || "Name",
        description: description.value || "Description",
        image: image.value?.url || "",
        properties: {
          tags: tags.value,
          duration: duration.value || 0,
        },
      } as Metadata),
      balance: ref(BigNumber.from(0)),
      royalty: computed(() => (royalty.value ? royalty.value / 255 : 0)),
      expiredAt: expiresAt,
      minter: eth.account,
      mintedEditions: computed(() => BigNumber.from(editions.value || 0)),
      mintedAt: ref(new Date()),
      primaryListing: ref(
        new Listing(
          BigNumber.from(0),
          Account.zero(),
          erc1155Token,
          BigNumber.from(editions.value || 0),
          new ListingConfig(price.value, eth.app, new Uint8(10))
        )
      ),
    })
);

async function uploadToIpfs(): Promise<CID> {
  if (!nftStorageApiKey.value) throw "No NFT Storage API key";

  const input = {
    $schema: "well-known://nftime/0.1",
    name: name.value!,
    description: description.value!,
    image: image.value!,
    properties: {
      tags: tags.value,
      duration: duration.value!,
      expiresAt: Math.round(expiresAt.value!.valueOf() / 1000),
    },
  };

  const nftStorageClient = new NFTStorage({ token: nftStorageApiKey.value });
  console.info("Uploading to NFT.storage...", input);
  const result = await nftStorageClient.store(input);
  console.debug(result);

  return CID.parse(result.ipnft);
}

async function ethMint(): Promise<ContractTransaction> {
  return await eth.nftime.mint(
    new Account(eth.nftSimpleListing.contract.address),
    cid.value!,
    BigNumber.from(editions.value!),
    expiresAt.value!,
    royalty.value!,
    new ListingConfig(price.value!, eth.app, new Uint8(10)).toBytes()
  );
}

async function mint() {
  if (!isMintable.value) throw new Error("Not mintable");

  mintStage.value = MintStage.UploadToIPFS;
  cid.value = await uploadToIpfs();

  mintStage.value = MintStage.SendTransaction;
  const tx = await ethMint();

  mintStage.value = MintStage.Done;
}

function onExpiresAtChange(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    expiresAt.value = new Date(event.target.value);
    console.debug(expiresAt.value);
  }
}

function date2InputDate(date: Date) {
  return (
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    date.getDate().toString().padStart(2, "0")
  );
}
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg ✨ Mint
    form.daisy-form-control.max-w-3xl.w-full.border.divide-y
      .p-4
        .daisy-alert.daisy-alert-error(v-if="!nftStorageApiKey")
          div
            span.text-2xl ⚠️
            span 
              span You don't have NFT.storage API key set up. Edit in&nbsp;
              router-link.daisy-link(to="/settings") Settings
              span .

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
              :disabled="mintInProgress"
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
          :disabled="mintInProgress"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Description (Markdown)
            span.ml-1(v-if="!description") ⚠️
        textarea.daisy-textarea.daisy-textarea-bordered.w-full.-mb-1.leading-tight(
          type="text"
          placeholder="Description"
          rows="3"
          v-model="description"
          :disabled="mintInProgress"
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
          :disabled="mintInProgress"
        )

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Editions
            span.ml-1(v-if="editions == 0") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          placeholder="Editions"
          v-model="editions"
          :disabled="mintInProgress"
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
          :disabled="mintInProgress"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Expires at
            span.ml-1(v-if="!(expiresAt > today)") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="date"
          :value="date2InputDate(expiresAt)"
          @change="onExpiresAtChange"
          :disabled="mintInProgress"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold Tags
        TagInput.w-full(
          v-model="tags"
          placeholder="example-tag"
          :disabled="mintInProgress"
        )

      .grid.p-4.gap-3.w-full(style="grid-template-columns: 10rem auto")
        img.rounded-lg.aspect-square.object-cover.w-full(
          v-if="image"
          :src="image.url"
        )
        Placeholder.w-full.aspect-square(v-else :animate="false")
        TokenPreview.w-full(:token="tokenPreview")

      .p-4.flex.flex-col.gap-4
        .daisy-steps.daisy-steps-vertical.p-2.border(
          :class="{ 'opacity-50': !mintInProgress }"
        )
          template(
            v-for="stage in Object.values(MintStage).slice(Object.values(MintStage).length / 2)"
          )
            .daisy-step(
              :class="{ 'daisy-step-primary': mintStage !== undefined && mintStage >= stage }"
            )
              .flex.gap-2
                span.text-base-content(
                  :class="{ 'text-opacity-50': !(mintStage !== undefined) || mintStage < stage, 'font-semibold': mintStage == stage }"
                ) {{ stageName(stage) }}
                router-link.daisy-link(
                  v-if="cid && stage == MintStage.Done && mintStage == MintStage.Done"
                  :to="'/' + cid"
                ) Visit token page
                span(v-if="mintStage !== undefined && mintStage > stage") ✅
                Spinner.leading-none.h-6.w-6.text-primary.stroke-2(
                  v-if="mintStage == stage && mintStage !== MintStage.Done"
                  :kind="SpinnerKind.Puff"
                )

        button.daisy-btn.w-full.daisy-btn-primary(
          @click="mint"
          :disabled="!isMintable || mintInProgress"
        ) 
          span.text-lg ✨
          span Mint
          .rounded-full.text-sm(
            style="box-shadow: 0 0.5px 1px hsl(var(--bc) / var(--tw-text-opacity)); padding: 0.25rem 0.5rem; background-color: hsl(var(--pc) / var(--tw-text-opacity))"
          ) 🦊⚡️
</template>

<style scoped lang="scss"></style>
