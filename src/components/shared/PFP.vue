<script lang="ts">
function pfpCacheKey(account: string) {
  return `cache.pfp.${account}`;
}

export function invalidatePfpCache(account: string) {
  localStorage.removeItem(pfpCacheKey(account));
}

/**
 * Return a raw `"image"` key value from an according NFT metadata.
 */
export async function queryPfpUrl(account: string): Promise<URL | undefined> {
  const cached = localStorage.getItem(pfpCacheKey(account));

  if (cached) {
    return new URL(cached);
  }

  const accountObj = await eventDb.db.get("Account", account);

  const pfp =
    accountObj?.personas.apps[eth.app.toString()]?.pfp ||
    accountObj?.personas.basic?.pfp;

  if (pfp) {
    const erc165 = new IERC165(
      new Address(pfp.contractAddress),
      eth.provider.value!
    );
    let rawTokenURI: string;

    if (await erc165.supportsInterface(IERC721Metadata.interfaceId)) {
      const erc721 = new IERC721Metadata(
        new Address(pfp.contractAddress),
        eth.provider.value!
      );

      rawTokenURI = (
        await erc721.tokenURI(
          new IERC721Token(
            new Address(pfp.contractAddress),
            BigNumber.from(pfp.tokenId)
          )
        )
      ).replaceAll("{id}", pfp.tokenId.slice(2));
    } else if (
      await erc165.supportsInterface(IERC1155MetadataURI.interfaceId)
    ) {
      const nft = new IERC1155MetadataURI(
        new Address(pfp.contractAddress),
        eth.provider.value!
      );

      rawTokenURI = (
        await nft.uri(
          new IERC721Token(
            new Address(pfp.contractAddress),
            BigNumber.from(pfp.tokenId)
          )
        )
      ).replaceAll("{id}", pfp.tokenId.slice(2));
    } else {
      throw new Error("Unsupported PFP contract");
    }

    const processedTokenURI = IPFS.processUri(new URL(rawTokenURI));
    const response = await fetch(processedTokenURI);
    const json = await response.json();
    const image = json.image;

    localStorage.setItem(pfpCacheKey(account), image);

    return new URL(image);
  }
}
</script>

<script setup lang="ts">
import * as Account from "@/models/Account";
import eventDb from "@/services/eth/event-db";
import * as jdenticon from "jdenticon";
import { type Ref, ref, onMounted } from "vue";
import * as eth from "@/services/eth";
import { BigNumber } from "@ethersproject/bignumber";
import { Token as IERC721Token } from "@/services/eth/contract/IERC721";
import IERC165 from "@/services/eth/contract/IERC165";
import IERC721Metadata from "@/services/eth/contract/IERC721Metadata";
import * as IPFS from "@/services/ipfs";
import IERC1155MetadataURI from "@/services/eth/contract/IERC1155MetadataURI";
import { Address } from "@/services/eth/Address";

const { account } = defineProps<{
  account: Account.default;
}>();

const img: Ref<URL | undefined> = ref();
const svgRef: Ref<SVGElement | null> = ref(null);

function updateSvg() {
  jdenticon.updateSvg(svgRef.value!, account.address.value?.toString());
}

onMounted(async () => {
  if (account.address.value) {
    updateSvg();
  } else {
    await account.resolve();
    updateSvg();
  }

  queryPfp();
});

async function queryPfp() {
  const url = await queryPfpUrl(account.address.value!.toString());
  if (url) img.value = IPFS.processUri(url);
}
</script>

<template lang="pug">
img.daisy-mask.daisy-mask-hexagon.object-contain(
  v-if="img"
  :src="img.toString()"
)
svg.daisy-mask.daisy-mask-squircle(ref="svgRef" v-else)
</template>
