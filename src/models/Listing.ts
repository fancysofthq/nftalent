import Account from "@/services/eth/Account";
import IPNFTModel, { getOrCreate as getOrCreateIPNFT } from "./IPNFT";
import * as IPNFT from "@/services/eth/contract/IPNFT";
import edb from "@/services/eth/event-db";
import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike } from "ethers/lib/utils";
import { ref, type ShallowRef } from "vue";
import { Listing as RawListing } from "@/services/eth/contract/MetaStore";
import { markRaw } from "@vue/reactivity";

export default class Listing {
  readonly id: BytesLike;
  readonly token: IPNFTModel;
  readonly seller: Account;
  readonly app: Account;
  readonly priceRef: ShallowRef<BigNumber>;
  readonly stockSizeRef: ShallowRef<BigNumber>;

  constructor(raw: RawListing) {
    this.id = raw.id;
    this.token = getOrCreateIPNFT(IPNFT.uint256ToCID(raw.token.id));
    this.seller = raw.seller;
    this.app = raw.app;
    this.priceRef = ref(raw.price);
    this.stockSizeRef = ref(raw.stockSize);
  }

  get price(): BigNumber {
    return this.priceRef.value;
  }

  set price(value: BigNumber) {
    this.priceRef.value = value;
  }

  get stockSize(): BigNumber {
    return this.stockSizeRef.value;
  }

  stockSizeAdd(value: BigNumber) {
    this.stockSizeRef.value = this.stockSizeRef.value.add(value);
  }

  stockSizeSub(value: BigNumber) {
    this.stockSizeRef.value = this.stockSizeRef.value.sub(value);
  }

  async fetchData() {
    const promises = [
      edb.iterateEventsIndex(
        "MetaStore.Replenish",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          this.stockSizeRef.value = this.stockSizeRef.value.add(
            BigNumber.from(event.amount)
          );

          this.priceRef.value = BigNumber.from(event.price);
        }
      ),

      edb.iterateEventsIndex(
        "MetaStore.Withdraw",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          this.stockSizeRef.value = this.stockSizeRef.value.sub(
            BigNumber.from(event.amount)
          );
        }
      ),

      edb.iterateEventsIndex(
        "MetaStore.Purchase",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          this.stockSizeRef.value = this.stockSizeRef.value.sub(
            BigNumber.from(event.amount)
          );
        }
      ),
    ];

    await Promise.all(promises);
  }
}

const memoized = new Map<string, Listing>();

// Get an existing listing or create new model instance.
export function getOrCreate(raw: RawListing): Listing {
  const id = raw.id.toString();

  if (memoized.has(id)) {
    return memoized.get(id)!;
  } else {
    const token = markRaw(new Listing(raw));
    memoized.set(id, token);
    return token;
  }
}