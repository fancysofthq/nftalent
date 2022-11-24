<script setup lang="ts">
import SelectImage, {
  type FileWithUrl,
} from "@/components/shared/SelectImage.vue";
import { computed, type ComputedRef, ref, type Ref } from "vue";
import TagInput from "@/components/shared/TagInput.vue";
import { BigNumber, ethers } from "ethers";
import * as eth from "@/services/eth";
import * as IPNFT from "@/services/eth/contract/IPNFT";
import * as nftalent from "@/nftalent";
import Spinner, { Kind as SpinnerKind } from "@/components/shared/Spinner.vue";
import { Uint8 } from "@/util";
import { CID } from "multiformats/cid";
import { web3StorageApiKey } from "@/store";
import MetaStore from "@/services/eth/contract/MetaStore";
import IPNFTModel from "@/models/IPNFT";
import { addMonths } from "date-fns/fp";
import Token, { Kind as TokenKind } from "@/components/Token.vue";

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const previewImage: Ref<FileWithUrl | undefined> = ref();
const name: Ref<string | undefined> = ref("");
const description: Ref<string | undefined> = ref("");
const priceEth: Ref<number> = ref(0.025);
const tags: Ref<string[]> = ref([]);
const editions: Ref<number> = ref(0);
const royalty: Ref<number> = ref(10);
const isSellerApproved = ref(false);

enum Tab {
  CollectibeImage,
  Redeemable,
}

const tab = ref(Tab.CollectibeImage);

const imageOverride: Ref<FileWithUrl | undefined> = ref();

const redeemableExpiredAt: Ref<Date | undefined> = ref(addMonths(1)(today));
const redeemableUnit: Ref<string | undefined> = ref();

const uploadProgress: Ref<number> = ref(0);

const price: ComputedRef<BigNumber> = computed(() => {
  return ethers.utils.parseEther(priceEth.value?.toString() || "0");
});

enum MintStage {
  UploadToIPFS,
  MintIPNFT721,
  MintIPNFT1155,
  Done,
}

function stageName(stage: MintStage): string {
  switch (stage) {
    case MintStage.UploadToIPFS:
      return "Upload to IPFS";
    case MintStage.MintIPNFT721:
      return "Mint IPNFT721";
    case MintStage.MintIPNFT1155:
      return "Mint IPNFT1155";
    case MintStage.Done:
      return "Done!";
  }
}

function stageEth(stage: MintStage): boolean {
  switch (stage) {
    case MintStage.UploadToIPFS:
      return false;
    case MintStage.MintIPNFT721:
    case MintStage.MintIPNFT1155:
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
    isSellerApproved.value &&
    !mintInProgress.value &&
    web3StorageApiKey.value &&
    previewImage.value !== undefined &&
    name.value &&
    name.value.length > 0 &&
    description.value &&
    description.value.length > 0 &&
    price.value.gt(0) &&
    editions.value > 0 &&
    ((tab.value == Tab.Redeemable &&
      redeemableUnit.value &&
      redeemableUnit.value.length > 0 &&
      redeemableExpiredAt.value &&
      redeemableExpiredAt.value > now) ||
      tab.value == Tab.CollectibeImage)
  );
});

const metadata: ComputedRef<
  nftalent.Collectible.Image.Metadata | nftalent.Redeemable.Metadata
> = computed(() => {
  switch (tab.value) {
    case Tab.CollectibeImage:
      return {
        $schema: "nftalent/collectible/image?v=1",
        name: name.value!,
        description: description.value!,
        image: previewImage.value,
        properties: {
          tags: tags.value,
          image: imageOverride.value
            ? {
                uri: imageOverride.value || previewImage.value,
                mime: imageOverride.value?.type,
                bytesize: imageOverride.value?.size,
              }
            : undefined,
        },
      } as nftalent.Collectible.Image.Metadata;
    case Tab.Redeemable:
      return {
        $schema: "nftalent/redeemable/base?v=1",
        name: name.value!,
        description: description.value!,
        image: previewImage.value,
        properties: {
          tags: tags.value,
          unit: redeemableUnit.value,
        },
      } as nftalent.Redeemable.Metadata;
  }
});

const tokenModel: ComputedRef<IPNFTModel> = computed(() => {
  return new IPNFTModel(
    new IPNFT.Token(
      cid.value ||
        CID.parse("bafyreial4ixkorwjjluaifmpbzdxgqmcmjcvzqx3c3k32syzcoeqjdsgum")
    ),
    {
      metadata: ref(metadata.value),
      ipnft721Minter: ref(eth.account.value),
      ipnft721MintedAt: ref(now),
      ipnft721Royalty: ref(royalty.value / 255),
      ipnft721CurrentOwner: ref(eth.account.value),
      ipnft1155Balance: ref(BigNumber.from(0)),
      ipnft1155TotalSupply: ref(BigNumber.from(editions.value || 0)),
      ipnft1155Finalized: ref(false),
      ipnft1155ExpiredAt: ref(
        tab.value == Tab.Redeemable ? redeemableExpiredAt.value : null
      ),
    }
  );
});

async function mint() {
  if (!isCurrentlyMintable.value) throw new Error("Not mintable");

  mintStage.value = MintStage.UploadToIPFS;
  const { root, ipnftTag } = await uploadToIpfs(metadata.value, (progress) => {
    uploadProgress.value = progress;
  });
  cid.value = root.cid;

  mintStage.value = MintStage.MintIPNFT721;
  let tx = await mint721(root, ipnftTag, new Uint8(royalty.value));
  console.log("mintIPNFT", tx);

  const expiredAt =
    tab.value == Tab.Redeemable ? redeemableExpiredAt.value : undefined;

  mintStage.value = MintStage.MintIPNFT1155;
  tx = await mint1155(root.cid, editions.value, false, expiredAt, price.value);
  console.log("mint1155", tx);

  mintStage.value = MintStage.Done;
}

function onExpiresAtChange(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    redeemableExpiredAt.value = event.target.valueAsDate || undefined;
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

eth.onConnect(async () => {
  isSellerApproved.value = await eth.metaStore.sellerApproved(
    eth.account.value!
  );
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg ✨ Mint an IPNFT
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
                span Preview image
                span.ml-1(v-if="!previewImage") ⚠️
            SelectImage.h-32.w-32.bg-base-200.rounded(
              v-model:image="previewImage"
              :file="previewImage"
              @update:file="previewImage = $event"
              :disabled="mintInProgress"
            )

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
          span.daisy-label-text.font-semibold Tags
        TagInput.w-full(
          v-model="tags"
          placeholder="example-tag"
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

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Price (
            img.inline-block.mr-1(
              src="/img/eth-icon.svg"
              style="height: 1.11rem"
              alt="ETH"
              title="ETH"
            )
            span per token)
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

        label.daisy-label.min-w-min
          span.daisy-label-text.font-semibold 
            span Token type
        .daisy-tabs.daisy-tabs-boxed
          .daisy-tab(
            :class="{ 'daisy-tab-active': tab == Tab.CollectibeImage }"
            @click="tab = Tab.CollectibeImage"
          ) 🖼 Collectible
          .daisy-tab(
            :class="{ 'daisy-tab-active': tab == Tab.Redeemable }"
            @click="tab = Tab.Redeemable"
          ) 🎟 Redeemable

        template(v-if="tab == Tab.CollectibeImage")
          label.daisy-label
            span.daisy-label-text.font-semibold
              span Full-size image (optional)
          SelectImage.h-32.w-32.bg-base-200.rounded(
            v-model:image="imageOverride"
            :file="imageOverride"
            @update:file="imageOverride = $event"
            :disabled="mintInProgress"
          )

        template(v-else-if="tab == Tab.Redeemable")
          label.daisy-label
            span.daisy-label-text.font-semibold 
              span Redeemable unit
              span.ml-1(v-if="!redeemableUnit") ⚠️
          input.daisy-input.daisy-input-bordered.w-full(
            type="text"
            placeholder="1 hour"
            v-model="redeemableUnit"
            :disabled="mintInProgress"
          )

          label.daisy-label
            span.daisy-label-text.font-semibold 
              span Redeem expires at
              span.ml-1(
                v-if="!(redeemableExpiredAt && redeemableExpiredAt > now)"
              ) ⚠️
          input.daisy-input.daisy-input-bordered.w-full(
            type="date"
            :value="date2InputDate(redeemableExpiredAt)"
            @change="onExpiresAtChange"
            :disabled="mintInProgress"
          )

      .w-full.p-4.bg-checkerboard.bg-fixed.grid.gap-3(
        :class="{ 'grid-cols-3': tab == Tab.CollectibeImage, 'grid-cols-2': tab == Tab.Redeemable }"
      )
        Token.rounded-lg.bg-base-100.shadow-lg.h-min(
          v-if="tab === Tab.CollectibeImage"
          :token="tokenModel"
          :animatePlaceholder="false"
          :kind="TokenKind.Card"
        )
        Token.rounded-lg.bg-base-100.shadow-lg.col-span-2(
          :token="tokenModel"
          :animatePlaceholder="false"
          :kind="TokenKind.Full"
        )

      .p-4.flex.flex-col.text-base-content
        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Prerequisites
        .flex.flex-col
          .flex.gap-2
            span —
            span.text-lg {{ web3StorageApiKey ? "✅" : "⚠️" }}
            span 
              router-link.daisy-link(to="/settings") Web3 storage API key
              span &nbsp;is {{ web3StorageApiKey ? "set" : "not set" }}
          .flex.gap-2
            span —
            span.text-lg {{ isSellerApproved ? "✅" : "❌" }}
            span {{ isSellerApproved ? "Seller approved" : "Seller is not approved" }}

        label.daisy-label
          span.daisy-label-text.font-semibold 
            span Progress
        .daisy-steps.daisy-steps-vertical(
          :class="{ 'opacity-50': !mintInProgress }"
        )
          template(v-for="stage in Object.values(MintStage).length / 2")
            .daisy-step(
              v-if="stage <= MintStage.Done"
              :data-content="stage"
              :class="{ 'daisy-step-primary': mintStage !== undefined && mintStage >= stage - 1 }"
            )
              .flex.gap-2.w-full.items-center
                .min-w-fit(
                  :class="{ 'text-opacity-50': !(mintStage !== undefined) || mintStage < stage - 1, 'font-semibold': mintStage == stage - 1 }"
                ) {{ stageName(stage - 1) }}
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
                progress.daisy-progress.daisy-progress-primary(
                  v-if="stage - 1 === MintStage.UploadToIPFS"
                  :value="uploadProgress * 100"
                  max="100"
                ) 

        router-link.daisy-btn.daisy-btn-secondary.mt-2(
          v-if="cid && mintStage == MintStage.Done"
          :to="'/' + cid"
        ) 
          span.text-lg 👀
          span Visit token

        button.daisy-btn.w-full.daisy-btn-primary.mt-2(
          v-else
          @click="mint"
          :disabled="!isCurrentlyMintable || mintInProgress"
        ) 
          span.text-lg ✨
          span Mint
          .rounded-full.text-sm(
            style="box-shadow: 0 0.5px 1px hsl(var(--bc) / var(--tw-text-opacity)); padding: 0.25rem 0.5rem; background-color: hsl(var(--pc) / var(--tw-text-opacity))"
          ) 🦊⚡️
</template>

<script lang="ts">
import IPNFT721 from "@/services/eth/contract/IPNFT721";
import { type ContractTransaction, type BigNumberish } from "ethers";
import { ListingConfig } from "@/services/eth/contract/MetaStore";
import { Block, encode as encodeBlock } from "multiformats/block";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import { Web3Storage } from "web3.storage";
import { pack } from "ipfs-car/pack";
import { MemoryBlockStore } from "ipfs-car/blockstore/memory"; // You can also use the `level-blockstore` module
import BlockstoreCarReader from "@/services/ipfs/blockstore-car-reader";
import { type Blockstore } from "ipfs-car/blockstore";
import { RouterLink } from "vue-router";
import { type ToFile } from "ipfs-core-types/src/utils";
import { ipfsUri } from "@/services/ipfs";

async function mint721(
  root: Block<unknown>,
  ipnftTag: IPNFT.Tag,
  royalty: Uint8
): Promise<ContractTransaction> {
  return await eth.ipnft721.mint(eth.account.value!, root, ipnftTag, royalty);
}

async function mint1155(
  cid: CID,
  amount: BigNumberish,
  finalize: boolean,
  expiredAt: Date | undefined,
  price: BigNumberish
): Promise<ContractTransaction> {
  return await eth.ipnft1155.mint(
    MetaStore.account,
    new IPNFT.Token(cid),
    amount,
    finalize,
    expiredAt,
    new ListingConfig(
      eth.account.value!.address,
      eth.app.address,
      price
    ).toBytes()
  );
}

/**
 * Packs files contained in `metadata` into a separate folder within `blockstore`
 * and returns the directory CID along with JSON-ified metadata object.
 */
async function processMetadata(
  blockstore: Blockstore,
  metadata: nftalent.Collectible.Image.Metadata | nftalent.Redeemable.Metadata
): Promise<{ contentCID: CID; jsonMetadata: any }> {
  const input: ToFile[] = [];

  if (!(metadata.image instanceof File)) {
    throw new Error("metadata.image is not a file");
  }

  input.push({
    path: metadata.image.name,
    content: new Uint8Array(await metadata.image.arrayBuffer()),
  });

  switch (metadata.$schema) {
    case "nftalent/collectible/image?v=1": {
      if (metadata.properties.image?.uri) {
        console.debug(
          "metadata.properties.image.uri",
          metadata.properties.image.uri
        );

        if (!(metadata.properties.image.uri instanceof File)) {
          throw new Error("metadata.properties.image.uri is not a file");
        }

        input.push({
          path: metadata.properties.image.uri.name,
          content: new Uint8Array(
            await metadata.properties.image.uri.arrayBuffer()
          ),
        });
      }
    }
  }

  const { root: contentCID } = await pack({
    input,
    blockstore,
    hasher: sha256,
    wrapWithDirectory: true, // Wraps input into a directory. Defaults to `true`
    // maxChunkSize: 1024 * 1024,
  });

  const jsonMetadata = JSON.parse(JSON.stringify(metadata));

  jsonMetadata.image = new URL(ipfsUri(contentCID) + metadata.image.name);

  switch (metadata.$schema) {
    case "nftalent/collectible/image?v=1": {
      if (metadata.properties.image?.uri) {
        jsonMetadata.properties.image.uri = new URL(
          ipfsUri(contentCID) + metadata.properties.image.uri.name
        );
      }
    }
  }

  return { contentCID, jsonMetadata };
}

async function uploadToIpfs(
  metadata: nftalent.Collectible.Image.Metadata | nftalent.Redeemable.Metadata,
  progressCallback: (fraction: number) => void
): Promise<{
  root: Block<unknown>;
  ipnftTag: IPNFT.Tag;
}> {
  if (!web3StorageApiKey.value) throw "No Web3.Storage API key set";
  const client = new Web3Storage({ token: web3StorageApiKey.value });

  const blockstore = new MemoryBlockStore();

  const { contentCID, jsonMetadata } = await processMetadata(
    blockstore,
    metadata
  );

  const { root: metadataCid } = await pack({
    input: new TextEncoder().encode(JSON.stringify(jsonMetadata)),
    blockstore,
    hasher: sha256,
    wrapWithDirectory: false,
    // maxChunkSize: 1024 * 1024,
  });

  const ipnftTag = new IPNFT.Tag(
    (await eth.provider.value!.getNetwork()).chainId,
    IPNFT721.account.address,
    eth.account.value!.address,
    await eth.ipnft721.minterNonce(eth.account.value!)
  );

  const root = await encodeBlock({
    value: {
      content: contentCID,
      "metadata.json": metadataCid,
      ipnft: ipnftTag.bytes,
    },
    codec: dagCbor,
    hasher: sha256,
  });
  await blockstore.put(root.cid, root.bytes);

  const reader = new BlockstoreCarReader(1, [root.cid], blockstore);

  let totalByteSize = 0;
  for await (const block of reader.blocks()) {
    totalByteSize += block.bytes.length;
  }
  console.debug("Total bytes:", totalByteSize);

  let storedByteSize = 0;
  await client.putCar(reader, {
    maxChunkSize: 1024 * 1024,
    onStoredChunk: (size) => {
      storedByteSize += size;
      console.debug(
        "Stored bytes:",
        storedByteSize,
        `(${(storedByteSize / totalByteSize) * 100}%)`
      );
      progressCallback(storedByteSize / totalByteSize);
    },
  });

  return { root, ipnftTag };
}
</script>
