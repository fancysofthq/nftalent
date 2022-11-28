<script setup lang="ts">
import * as IPNFT from "@/services/eth/contract/IPNFT";
import IPNFTModel from "@/models/IPNFT";
import { onMounted, type Ref, ref, onUnmounted } from "vue";
import Entry from "./HistoryEntry.vue";

type Entry = {
  event: EventWrapper;
  token: IPNFTModel;
};

const props = defineProps<{ token: IPNFT.Token }>();
const entries: Ref<Entry[]> = ref([]);
let cancelFeed = false;

onMounted(async () => {
  subscribeToFeed(
    props.token,
    (_entries) => {
      if (cancelFeed) return;
      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: IPNFTModel.getOrCreate(IPNFT.uint256ToCID(e.tokenId)),
        }))
      );
    },
    1000,
    () => cancelFeed
  );
});

onUnmounted(() => {
  cancelFeed = true;
});
</script>

<template lang="pug">
Entry(
  v-if="entries.length"
  v-for="entry in entries"
  :event="entry.event"
  :token="entry.token"
  style="grid-template-columns: 7rem auto"
)
.p-4.text-base-content.text-center(v-else) Empty history
</template>

<script lang="ts">
import edb, {
  type Event,
  type IERC1155Transfer,
  type IERC721Transfer,
  type List,
  type Purchase,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import * as eth from "@/services/eth";

export enum EventKind {
  IPNFT721Mint,
  IPNFT1155Mint,
  MetaStoreList,
  MetaStorePurchase,
  IPNFT1155Redeem,
}

export class EventWrapper {
  constructor(public readonly kind: EventKind, private readonly event: Event) {}

  get blockNumber(): number {
    return this.event.blockNumber;
  }

  get logIndex(): number {
    return this.event.logIndex;
  }

  get isIPNFT721Mint(): boolean {
    return this.kind == EventKind.IPNFT721Mint;
  }

  get asIPNFT721Mint(): IERC721Transfer {
    if (!this.isIPNFT721Mint) throw new Error("Invalid event kind");
    return this.event as IERC721Transfer;
  }

  get isIPNFT1155Mint(): boolean {
    return this.kind == EventKind.IPNFT1155Mint;
  }

  get asIPNFT1155Mint(): IERC1155Transfer {
    if (!this.isIPNFT1155Mint) throw new Error("Invalid event kind");
    return this.event as IERC1155Transfer;
  }

  get isMetaStoreList(): boolean {
    return this.kind == EventKind.MetaStoreList;
  }

  get asMetaStoreList(): List {
    if (!this.isMetaStoreList) throw new Error("Invalid event kind");
    return this.event as List;
  }

  get isMetaStorePurchase(): boolean {
    return this.kind == EventKind.MetaStorePurchase;
  }

  get asMetaStorePurchase(): Purchase {
    if (!this.isMetaStorePurchase) throw new Error("Invalid event kind");
    return this.event as Purchase;
  }

  get isIPNFT1155Redeem(): boolean {
    return this.kind == EventKind.IPNFT1155Redeem;
  }

  get asIPNFT1155Redeem(): IERC1155Transfer {
    if (!this.isIPNFT1155Redeem) throw new Error("Invalid event kind");
    return this.event as IERC1155Transfer;
  }

  get tokenId(): BigNumber {
    switch (this.kind) {
      case EventKind.IPNFT721Mint:
        return BigNumber.from(this.asIPNFT721Mint.tokenId);
      case EventKind.IPNFT1155Mint:
        return BigNumber.from(this.asIPNFT1155Mint.id);
      case EventKind.MetaStoreList:
        return BigNumber.from(this.asMetaStoreList.token.id);
      case EventKind.MetaStorePurchase:
        return BigNumber.from(this.asMetaStorePurchase.token.id);
      case EventKind.IPNFT1155Redeem:
        return BigNumber.from(this.asIPNFT1155Redeem.id);
    }
  }
}

// OPTIMIZE: Lots of boilerplate code in feed functions.
async function subscribeToFeed(
  filter: IPNFT.Token,
  callback: (events: EventWrapper[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let transferBlock = 0;
  let listBlock = 0;
  let purchaseBlock = 0;
  let ipnft721MintFound = false;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventWrapper[] = [];

    // IPNFT721 Mint (happens only once)
    if (!ipnft721MintFound) {
      promises.push(
        edb
          .findEvent(
            "IPNFT721.Transfer",
            "from-tokenId",
            [AddressZero, filter.id._hex],
            "nextunique"
          )
          .then((event) => {
            if (event) {
              events.push(new EventWrapper(EventKind.IPNFT721Mint, event));
              ipnft721MintFound = true;
            }
          })
      );
    }

    // IPNFT1155 Mint & Redeem
    promises.push(
      edb.iterateEventsIndex(
        "IPNFT1155.Transfer",
        "id-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, transferBlock],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          transferBlock = e.blockNumber + 1;

          if (e.from == AddressZero) {
            events.push(new EventWrapper(EventKind.IPNFT1155Mint, e));
          } else if (e.to == eth.ipnft1155.address.toString()) {
            events.push(new EventWrapper(EventKind.IPNFT1155Redeem, e));
          }
        }
      )
    );

    // MetaStore List
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.List",
        "token-blockNumber",
        IDBKeyRange.bound(
          [
            eth.app.toString(),
            eth.ipnft1155.address.toString(),
            filter.id._hex,
            listBlock,
          ],
          [
            eth.app.toString(),
            eth.ipnft1155.address.toString(),
            filter.id._hex,
            Number.MAX_SAFE_INTEGER,
          ]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.MetaStoreList, e));
        }
      )
    );

    // MetaStore Purchase
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.Purchase",
        "token-blockNumber",
        IDBKeyRange.bound(
          [
            eth.app.toString(),
            eth.ipnft1155.address.toString(),
            filter.id._hex,
            purchaseBlock,
          ],
          [
            eth.app.toString(),
            eth.ipnft1155.address.toString(),
            filter.id._hex,
            Number.MAX_SAFE_INTEGER,
          ]
        ),
        "next",
        (e) => {
          purchaseBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.MetaStorePurchase, e));
        }
      )
    );

    await Promise.all(promises);

    callback(
      events.sort((a, b) =>
        b.blockNumber == a.blockNumber
          ? b.logIndex - a.logIndex
          : b.blockNumber - a.blockNumber
      )
    );

    await timeout(pollInterval);
  }
}
</script>
