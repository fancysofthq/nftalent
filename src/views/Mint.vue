<script setup lang="ts">
import SelectImage, {
  type FileWithUrl,
} from "@/components/shared/SelectImage.vue";
import { computed, type ComputedRef, ref, type Ref } from "vue";
import TagInput from "@/components/shared/TagInput.vue";
import { BigNumber, ethers } from "ethers";
import * as eth from "@/services/eth";
import { Token as IPNFToken } from "@/services/eth/contract/IPNFT";
import * as nftalent from "@/nftalent";
import Spinner, { Kind as SpinnerKind } from "@/components/shared/Spinner.vue";
import { Uint8 } from "@/util";
import { CID } from "multiformats/cid";
import { web3StorageApiKey } from "@/store";
import { Listing } from "@/services/eth/contract/NFTSimpleListing";
import Placeholder from "@/components/shared/Placeholder.vue";
import IPNFTSuper from "@/models/IPNFTSuper";
import { addMonths, addDays } from "date-fns/fp";
import TokenVue from "@/components/Token.vue";
import { uploadToIpfs } from "@/logic/upload-to-ipfs";
import { mint1155, mint721, qualifyRedeemable } from "@/logic/mint";

const image: Ref<FileWithUrl | undefined> = ref();
const name: Ref<string | undefined> = ref();
const description: Ref<string | undefined> = ref();
const unit: Ref<string | undefined> = ref();
const priceEth: Ref<number> = ref(0.025);
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const matureSince: Ref<Date | undefined> = ref(addDays(-1)(today));
const expiredAt: Ref<Date | undefined> = ref(addMonths(1)(today));
const tags: Ref<string[]> = ref([]);
const editions: Ref<number> = ref(0);
const royalty: Ref<number> = ref(10);

const uploadProgress: Ref<number> = ref(0);

const price: ComputedRef<BigNumber> = computed(() => {
  return ethers.utils.parseEther(priceEth.value?.toString() || "0");
});

enum MintStage {
  UploadToIPFS,
  Mint721,
  QualifyRedeemable,
  Mint1155,
  Done,
}

function stageName(stage: MintStage): string {
  switch (stage) {
    case MintStage.UploadToIPFS:
      return "Upload to IPFS";
    case MintStage.Mint721:
      return "Mint IPNFT721 (copyright) token";
    case MintStage.QualifyRedeemable:
      return "Qualify token as redeemable";
    case MintStage.Mint1155:
      return "Mint IPNFT1155 token";
    case MintStage.Done:
      return "Done!";
  }
}

function stageEth(stage: MintStage): boolean {
  switch (stage) {
    case MintStage.UploadToIPFS:
      return false;
    case MintStage.Mint721:
      return true;
    case MintStage.QualifyRedeemable:
      return true;
    case MintStage.Mint1155:
      return true;
    case MintStage.Done:
      return false;
  }
}

const mintStage: Ref<MintStage | undefined> = ref();
const mintInProgress = computed(() => mintStage.value !== undefined);
const cid: Ref<CID | undefined> = ref();

const isCurrentlyMintable = computed(() => {
  return (
    !mintInProgress.value &&
    web3StorageApiKey.value &&
    image.value !== undefined &&
    name.value &&
    name.value.length > 0 &&
    description.value &&
    description.value.length > 0 &&
    unit.value &&
    unit.value.length > 0 &&
    price.value.gt(0) &&
    matureSince.value &&
    matureSince.value < now &&
    expiredAt.value &&
    expiredAt.value > now &&
    editions.value > 0
  );
});

const token = computed(
  () =>
    new IPNFToken(
      cid.value || CID.parse("QmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4")
    )
);

const tokenSuper: ComputedRef<IPNFTSuper> = computed(() => {
  return new IPNFTSuper(token.value, {
    metadata: ref({
      $schema: "nftalent/redeemable/base?v=1",
      name: name.value!,
      description: description.value!,
      image: image.value?.url!,
      properties: {
        tags: tags.value,
        unit: unit.value,
      },
    } as nftalent.MetadataRedeemableBase),
    ipnft721: ref({
      minter: eth.account.value!,
      mintedAt: now,
      royalty: royalty.value / 255,
    }),
    ipnft1155: ref({
      balance: BigNumber.from(0),
      mintedTotal: BigNumber.from(editions.value || 0),
      finalized: false, // TODO: finalize
    }),
    redeemable: ref({
      qualifiedAt: now,
      matureSince: matureSince.value,
      expiredAt: expiredAt.value,
    }),
    nftSimpleListing: ref({
      primaryListing: new Listing(
        // Listing.id(rawIpnft.toERC1155Token(), eth.account.value!),
        Uint8.zeroes(32),
        token.value.toERC1155Token(),
        eth.account.value!,
        eth.app,
        price.value,
        BigNumber.from(editions.value || 0)
      ),
    }),
  });
});

async function mint() {
  if (!isCurrentlyMintable.value) throw new Error("Not mintable");

  mintStage.value = MintStage.UploadToIPFS;
  const { root, ipnftTag } = await uploadToIpfs(
    {
      name: name.value!,
      description: description.value!,
      image: image.value!,
      properties: {
        tags: tags.value,
        unit: unit.value!,
      },
    },
    (progress) => {
      uploadProgress.value = progress;
    }
  );
  cid.value = root.cid;

  mintStage.value = MintStage.Mint721;
  let tx = await mint721(root, ipnftTag, new Uint8(royalty.value));
  console.log("mint721", tx);

  mintStage.value = MintStage.QualifyRedeemable;
  tx = await qualifyRedeemable(root.cid, matureSince.value!, expiredAt.value!);
  console.log("qualifyRedeemable", tx);

  mintStage.value = MintStage.Mint1155;
  tx = await mint1155(token.value, editions.value, price.value);
  console.log("mint1155", tx);

  mintStage.value = MintStage.Done;
}

function onMatureSinceChange(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    matureSince.value = event.target.valueAsDate || undefined;
  }
}

function onExpiresAtChange(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    expiredAt.value = event.target.valueAsDate || undefined;
  }
}

function date2InputDate(date: Date | undefined): string {
  if (date === undefined) return "";

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
    h2.font-bold.text-lg ✨ Mint a redeemable IPNFT
    form.daisy-form-control.max-w-3xl.w-full.border.divide-y.rounded-lg
      .p-4
        .daisy-alert.daisy-alert-error(v-if="!web3StorageApiKey")
          div
            span.text-2xl ⚠️
            span 
              span You don't have Web3.Storage API key set up. Edit in&nbsp;
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
        textarea.daisy-textarea.daisy-textarea-bordered.w-full.-mb-1.leading-snug(
          type="text"
          placeholder="Description"
          rows="3"
          v-model="description"
          :disabled="mintInProgress"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Unit
            span.ml-1(v-if="!unit") ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="text"
          placeholder="1 hour"
          v-model="unit"
          :disabled="mintInProgress"
        )

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Price (
            img.inline-block.mr-1(
              src="/img/eth-icon.svg"
              style="height: 1.11rem"
              alt="ETH"
              title="ETH"
            )
            span per unit)
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
            span Redeem not before
            span.ml-1(
              v-if="!(matureSince && expiredAt && matureSince < expiredAt)"
            ) ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="date"
          :value="date2InputDate(matureSince)"
          @change="onMatureSinceChange"
          :disabled="mintInProgress"
        )

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Redeem expires at
            span.ml-1(
              v-if="!(matureSince && expiredAt && expiredAt > now && expiredAt > matureSince)"
            ) ⚠️
        input.daisy-input.daisy-input-bordered.w-full(
          type="date"
          :value="date2InputDate(expiredAt)"
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
        img.rounded.aspect-square.object-cover.w-full(
          v-if="image"
          :src="image.url"
        )
        Placeholder.w-full.aspect-square(v-else :animate="false")
        TokenVue.w-full(:token="tokenSuper" :animatePlaceholder="false")

      .p-4.flex.flex-col.gap-4
        .daisy-steps.daisy-steps-vertical.p-2.border(
          :class="{ 'opacity-50': !mintInProgress }"
        )
          template(v-for="stage in Object.values(MintStage).length / 2")
            .daisy-step(
              :class="{ 'daisy-step-primary': mintStage !== undefined && mintStage >= stage - 1 }"
            )
              .flex.gap-2
                span.text-base-content(
                  :class="{ 'text-opacity-50': !(mintStage !== undefined) || mintStage < stage - 1, 'font-semibold': mintStage == stage - 1 }"
                ) {{ stageName(stage - 1) }}
                  span.ml-1(
                    v-if="stage - 1 === MintStage.UploadToIPFS && mintStage == stage - 1"
                  ) {{ (uploadProgress * 100).toFixed(0) }}%
                span(v-if="stageEth(stage - 1)") 🦊⚡️
                router-link.daisy-link(
                  v-if="cid && stage - 1 == MintStage.Done && mintStage == MintStage.Done"
                  :to="'/' + cid"
                ) Visit token page
                span(v-if="mintStage !== undefined && mintStage > stage - 1") ✅
                Spinner.leading-none.h-6.w-6.text-primary.stroke-2(
                  v-if="mintStage == stage - 1 && mintStage !== MintStage.Done"
                  :kind="SpinnerKind.Puff"
                )

        button.daisy-btn.w-full.daisy-btn-primary(
          @click="mint"
          :disabled="!isCurrentlyMintable || mintInProgress"
        ) 
          span.text-lg ✨
          span Mint
          .rounded-full.text-sm(
            style="box-shadow: 0 0.5px 1px hsl(var(--bc) / var(--tw-text-opacity)); padding: 0.25rem 0.5rem; background-color: hsl(var(--pc) / var(--tw-text-opacity))"
          ) 🦊⚡️
</template>

<style scoped lang="scss"></style>
