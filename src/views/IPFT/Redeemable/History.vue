<script setup lang="ts">
import * as IPFT from "@/services/eth/contract/IPFT";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import { type Ref, ref, onUnmounted } from "vue";
import Entry from "./HistoryEntry.vue";

type Entry = {
  event: EventWrapper;
  token: IPFTRedeemable;
};

const props = defineProps<{ token: IPFTRedeemable }>();
const entries: Ref<Entry[]> = ref([]);
let cancelFeed = false;

eth.onConnect(async () => {
  subscribeToFeed(
    props.token,
    (_entries) => {
      if (cancelFeed) return;
      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: IPFTRedeemable.getOrCreate(IPFT.uint256ToCID(e.tokenId)),
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
import edb, { type Event } from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import * as eth from "@/services/eth";
import * as IERC1155 from "@/services/eth/contract/IERC1155";
import * as OpenStore from "@/services/eth/contract/OpenStore";

export enum EventKind {
  Mint,
  List,
  Purchase,
  Redeem,
}

export class EventWrapper {
  constructor(public readonly kind: EventKind, private readonly event: Event) {}

  get blockNumber(): number {
    return this.event.blockNumber;
  }

  get logIndex(): number {
    return this.event.logIndex;
  }

  get isMint(): boolean {
    return this.kind == EventKind.Mint;
  }

  get asMint(): IERC1155.Transfer {
    if (!this.isMint) throw new Error("Invalid event kind");
    return this.event as IERC1155.Transfer;
  }

  get isList(): boolean {
    return this.kind == EventKind.List;
  }

  get asList(): OpenStore.List {
    if (!this.isList) throw new Error("Invalid event kind");
    return this.event as OpenStore.List;
  }

  get isPurchase(): boolean {
    return this.kind == EventKind.Purchase;
  }

  get asPurchase(): OpenStore.Purchase {
    if (!this.isPurchase) throw new Error("Invalid event kind");
    return this.event as OpenStore.Purchase;
  }

  get isRedeem(): boolean {
    return this.kind == EventKind.Redeem;
  }

  get asRedeem(): IERC1155.Transfer {
    if (!this.isRedeem) throw new Error("Invalid event kind");
    return this.event as IERC1155.Transfer;
  }

  get tokenId(): BigNumber {
    switch (this.kind) {
      case EventKind.Mint:
        return BigNumber.from(this.asMint.id);
      case EventKind.List:
        return BigNumber.from(this.asList.token.id);
      case EventKind.Purchase:
        return BigNumber.from(this.asPurchase.token.id);
      case EventKind.Redeem:
        return BigNumber.from(this.asRedeem.id);
    }
  }
}

// OPTIMIZE: Lots of boilerplate code in feed functions.
async function subscribeToFeed(
  filter: IPFTRedeemable,
  callback: (events: EventWrapper[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let transferBlock = 0;
  let listBlock = 0;
  let purchaseBlock = 0;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventWrapper[] = [];

    // Mint & Redeem
    promises.push(
      edb.iterateEventsIndex(
        "IPFTRedeemable.Transfer",
        "id-blockNumber",
        IDBKeyRange.bound(
          [filter.id._hex, transferBlock],
          [filter.id._hex, Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          transferBlock = e.blockNumber + 1;

          if (e.from == AddressZero) {
            events.push(new EventWrapper(EventKind.Mint, e));
          } else if (e.to == eth.ipftRedeemable.address.toString()) {
            events.push(new EventWrapper(EventKind.Redeem, e));
          }
        }
      )
    );

    // List
    promises.push(
      edb.iterateEventsIndex(
        "OpenStore.List",
        "token-blockNumber",
        IDBKeyRange.bound(
          [
            eth.app.toString(),
            eth.ipftRedeemable.address.toString(),
            filter.id._hex,
            listBlock,
          ],
          [
            eth.app.toString(),
            eth.ipftRedeemable.address.toString(),
            filter.id._hex,
            Number.MAX_SAFE_INTEGER,
          ]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.List, e));
        }
      )
    );

    // Purchase
    promises.push(
      edb.iterateEventsIndex(
        "OpenStore.Purchase",
        "token-blockNumber",
        IDBKeyRange.bound(
          [
            eth.app.toString(),
            eth.ipftRedeemable.address.toString(),
            filter.id._hex,
            purchaseBlock,
          ],
          [
            eth.app.toString(),
            eth.ipftRedeemable.address.toString(),
            filter.id._hex,
            Number.MAX_SAFE_INTEGER,
          ]
        ),
        "next",
        (e) => {
          purchaseBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.Purchase, e));
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
