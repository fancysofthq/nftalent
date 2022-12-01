import Account from "./Account";
import IPFTRedeemable from "./IPFTRedeemable";
import * as IPFT from "@/services/eth/contract/IPFT";
import edb from "@/services/eth/event-db";
import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike } from "ethers/lib/utils";
import { ref, type ShallowRef } from "vue";
import * as OpenStore from "@/services/eth/contract/OpenStore";
import { markRaw } from "@vue/reactivity";
import * as DagCbor from "@ipld/dag-cbor";
import { keccak256 } from "@multiformats/sha3";

export default class Listing {
  readonly id: BytesLike;
  readonly token: IPFTRedeemable;
  readonly seller: Account;
  readonly app: Account;
  readonly priceRef: ShallowRef<BigNumber>;
  readonly stockSizeRef: ShallowRef<BigNumber>;

  private static memoized = new Map<string, Listing>();

  /**
   * Get an existing listing or create new model instance.
   */
  static getOrCreate(raw: OpenStore.Listing): Listing {
    const id = raw.id.toString();

    if (Listing.memoized.has(id)) {
      return Listing.memoized.get(id)!;
    } else {
      const token = markRaw(new Listing(raw));
      Listing.memoized.set(id, token);
      return token;
    }
  }

  private constructor(raw: OpenStore.Listing) {
    this.id = raw.id;
    this.token = IPFTRedeemable.getOrCreate(
      IPFT.uint256ToCID(raw.token.id, DagCbor.code, keccak256.code)
    );
    this.seller = Account.getOrCreateFromAddress(raw.seller);
    this.app = Account.getOrCreateFromAddress(raw.app);
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
    let priceTemp = BigNumber.from(0);
    let stockSizeTemp = BigNumber.from(0);

    const promises = [
      edb.iterateEventsIndex(
        "OpenStore.Replenish",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          priceTemp = BigNumber.from(event.price);
          stockSizeTemp = stockSizeTemp.add(BigNumber.from(event.amount));
        }
      ),

      edb.iterateEventsIndex(
        "OpenStore.Withdraw",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          stockSizeTemp = stockSizeTemp.sub(BigNumber.from(event.amount));
        }
      ),

      edb.iterateEventsIndex(
        "OpenStore.Purchase",
        "listingId",
        this.id.toString(),
        "next",
        (event) => {
          stockSizeTemp = stockSizeTemp.sub(BigNumber.from(event.amount));
        }
      ),
    ];

    await Promise.all(promises);

    this.priceRef.value = priceTemp;
    this.stockSizeRef.value = stockSizeTemp;
  }
}
