<script lang="ts">
import edb, {
  type Event,
  type IERC1155Transfer,
  type IERC721Transfer,
  type List,
  type Purchase,
  type Redeem,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber, ethers } from "ethers";
import { AddressZero } from "@ethersproject/constants";

export enum EventKind {
  IERC721Transfer,
  IERC1155Transfer,
  Redeem,
  List,
  Purchase,
}

export class EventBox {
  constructor(public readonly kind: EventKind, private readonly event: Event) {}

  get blockNumber(): number {
    return this.event.blockNumber;
  }

  get logIndex(): number {
    return this.event.logIndex;
  }

  get isIERC721Transfer(): boolean {
    return this.kind == EventKind.IERC721Transfer;
  }

  get asIERC721Transfer(): IERC721Transfer {
    if (!this.isIERC721Transfer) throw new Error("Invalid event kind");
    return this.event as IERC721Transfer;
  }

  get isIERC1155Transfer(): boolean {
    return this.kind == EventKind.IERC1155Transfer;
  }

  get asIERC1155Transfer(): IERC1155Transfer {
    if (!this.isIERC1155Transfer) throw new Error("Invalid event kind");
    return this.event as IERC1155Transfer;
  }

  get isRedeem(): boolean {
    return this.kind == EventKind.Redeem;
  }

  get asRedeem(): Redeem {
    if (!this.isRedeem) throw new Error("Invalid event kind");
    return this.event as Redeem;
  }

  get isList(): boolean {
    return this.kind == EventKind.List;
  }

  get asList(): List {
    if (!this.isList) throw new Error("Invalid event kind");
    return this.event as List;
  }

  get isPurchase(): boolean {
    return this.kind == EventKind.Purchase;
  }

  get asPurchase(): Purchase {
    if (!this.isPurchase) throw new Error("Invalid event kind");
    return this.event as Purchase;
  }

  get tokenId(): BigNumber {
    switch (this.kind) {
      case EventKind.IERC721Transfer:
        return BigNumber.from(this.asIERC721Transfer.tokenId);
      case EventKind.IERC1155Transfer:
        return BigNumber.from(this.asIERC1155Transfer.id);
      case EventKind.Redeem:
        return BigNumber.from(this.asRedeem.tokenId);
      case EventKind.List:
        return BigNumber.from(this.asList.token.id);
      case EventKind.Purchase:
        return BigNumber.from(this.asPurchase.token.id);
    }
  }
}

// OPTIMIZE: Lots of boilerplate code in feed functions.
async function tokenFeed(
  filter: Token,
  callback: (events: EventBox[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let transferBlock1 = 0;
  let transferBlock2 = 0;
  let redeemBlock = 0;
  let listBlock = 0;
  let purchaseBlock = 0;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventBox[] = [];

    // IPNFT721Transfer
    promises.push(
      edb.iterateEventsIndex(
        "IPNFT721.Transfer",
        "tokenId-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, transferBlock1],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          transferBlock1 = e.blockNumber + 1;

          if (e.from == AddressZero || e.to == AddressZero) {
            return;
          }

          events.push(new EventBox(EventKind.IERC721Transfer, e));
        }
      )
    );

    // IPNFT1155Transfer
    promises.push(
      edb.iterateEventsIndex(
        "IPNFT1155.Transfer",
        "id-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, transferBlock2],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          transferBlock2 = e.blockNumber + 1;

          if (
            e.from == AddressZero ||
            e.to == AddressZero ||
            e.to == eth.nftSimpleListing.address ||
            e.from == eth.nftSimpleListing.address ||
            e.to == eth.erc1876Redeemable.address
          ) {
            return;
          }

          events.push(new EventBox(EventKind.IERC1155Transfer, e));
        }
      )
    );

    // Redeem
    promises.push(
      edb.iterateEventsIndex(
        "ERC1876Redeemable.Redeem",
        "tokenId-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, redeemBlock],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          redeemBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.Redeem, e));
        }
      )
    );

    // List
    promises.push(
      edb.iterateEventsIndex(
        "NFTSimpleListing.List",
        "tokenId-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, listBlock],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.List, e));
        }
      )
    );

    // Purchase
    promises.push(
      edb.iterateEventsIndex(
        "NFTSimpleListing.Purchase",
        "tokenId-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, purchaseBlock],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          purchaseBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.Purchase, e));
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

<script setup lang="ts">
import { Token } from "@/services/eth/contract/IPNFT";
import { uint256ToCID } from "@/services/eth/contract/IPNFT";
import IPNFTSuper, { getOrCreate } from "@/models/IPNFTSuper";
import { onMounted, type Ref, ref, onUnmounted } from "vue";
import Entry from "./TokenFeedEntry.vue";
import * as eth from "@/services/eth";

type Entry = {
  event: EventBox;
  token: IPNFTSuper;
};

const props = defineProps<{ token: Token }>();
const entries: Ref<Entry[]> = ref([]);
let cancelFeed = false;

onMounted(async () => {
  tokenFeed(
    props.token,
    (_entries) => {
      if (cancelFeed) return;
      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: getOrCreate(uint256ToCID(e.tokenId)),
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
.p-4.text-base-content.text-center(v-else) Empty feed
</template>

<style scoped lang="scss"></style>
