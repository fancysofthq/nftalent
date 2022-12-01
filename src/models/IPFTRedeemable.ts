import Account from "./Account";
import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";
import { BigNumber } from "ethers";
import * as ipfs from "@/services/ipfs";
import axios from "axios";
import * as eth from "@/services/eth";
import edb from "@/services/eth/event-db";
import { CID } from "multiformats";
import { markRaw, Ref, ref } from "vue";
import { Buffer } from "buffer";
import * as IPFT from "@/services/eth/contract/IPFT";

/**
 * A wrapper around IPNFT1155 token carrying auxiliary data.
 */
export default class IPFTRedeemable {
  readonly cid: CID;

  private readonly _metadata: Ref<ERC1155Metadata | undefined> = ref();

  private readonly _author: Ref<Account | undefined> = ref();
  private readonly _claimedAt: Ref<Date | undefined> = ref();
  private readonly _royalty: Ref<number | undefined> = ref();
  private readonly _balance: Ref<BigNumber | undefined> = ref();
  private readonly _totalSupply: Ref<BigNumber | undefined> = ref();
  private readonly _finalized: Ref<boolean | null | undefined> = ref();
  private readonly _expiredAt: Ref<Date | undefined> = ref();

  private _metadataPromise?: Promise<ERC1155Metadata>;
  private _authorPromise?: Promise<Account>;
  private _claimedAtPromise?: Promise<Date | undefined>;
  private _royaltyPromise?: Promise<number>;
  private _balancePromise?: Promise<BigNumber>;
  private _totalSupplyPromise?: Promise<BigNumber>;
  private _finalizedPromise?: Promise<boolean | null>;
  private _expiredAtPromise?: Promise<Date>;

  private static memoized = new Map<CID, IPFTRedeemable>();

  /**
   * Get existing token or create new instance.
   */
  static getOrCreate(cid: CID): IPFTRedeemable {
    if (IPFTRedeemable.memoized.has(cid)) {
      return IPFTRedeemable.memoized.get(cid)!;
    }

    const token = markRaw(new IPFTRedeemable(cid));
    IPFTRedeemable.memoized.set(cid, token);
    return token;
  }

  constructor(
    cid: CID,
    {
      metadata,
      claimer,
      claimedAt,
      royalty,
      balance,
      totalSupply,
      finalized,
      expiredAt,
    }: {
      metadata: Ref<ERC1155Metadata | undefined>;
      claimer: Ref<Account | undefined>;
      claimedAt: Ref<Date | undefined>;
      royalty: Ref<number | undefined>;
      balance: Ref<BigNumber | undefined>;
      totalSupply: Ref<BigNumber | undefined>;
      finalized: Ref<boolean | null | undefined>;
      expiredAt: Ref<Date | undefined>;
    } = {
      metadata: ref(),
      claimer: ref(),
      claimedAt: ref(),
      royalty: ref(),
      balance: ref(),
      totalSupply: ref(),
      finalized: ref(),
      expiredAt: ref(),
    }
  ) {
    this.cid = cid;
    this._metadata = metadata;
    this._author = claimer;
    this._claimedAt = claimedAt;
    this._royalty = royalty;
    this._balance = balance;
    this._totalSupply = totalSupply;
    this._finalized = finalized;
    this._expiredAt = expiredAt;
  }

  get id(): BigNumber {
    return IPFT.cidToUint256(this.cid);
  }

  get metadata(): ERC1155Metadata | undefined {
    return this._metadata.value;
  }

  set metadata(value: ERC1155Metadata | undefined) {
    this._metadata.value = value;
  }

  get author(): Account | undefined {
    return this._author.value;
  }

  set author(value: Account | undefined) {
    this._author.value = value;
  }

  get claimedAt(): Date | undefined {
    return this._claimedAt.value;
  }

  set claimedAt(value: Date | undefined) {
    this._claimedAt.value = value;
  }

  get royalty(): number | undefined {
    return this._royalty.value;
  }

  set royalty(value: number | undefined) {
    this._royalty.value = value;
  }

  get balance(): BigNumber | undefined {
    return this._balance.value;
  }

  set balance(value: BigNumber | undefined) {
    this._balance.value = value;
  }

  get totalSupply(): BigNumber | undefined {
    return this._totalSupply.value;
  }

  set totalSupply(value: BigNumber | undefined) {
    this._totalSupply.value = value;
  }

  get finalized(): boolean | null | undefined {
    return this._finalized.value;
  }

  set finalized(value: boolean | null | undefined) {
    this._finalized.value = value;
  }

  get expiredAt(): Date | undefined {
    return this._expiredAt.value;
  }

  set expiredAt(value: Date | undefined) {
    this._expiredAt.value = value;
  }

  async fetchIPFSMetadata(): Promise<void> {
    const uri = ipfs.processUri(ipfs.ipnftMetadataUri(this.cid)).toString();

    this._metadata.value ||= await (this._metadataPromise ||= (
      await axios.get(uri)
    ).data);
  }

  async fetchEthData(): Promise<void> {
    this._author.value ||= await (this._authorPromise ||= (async () =>
      Account.getOrCreateFromAddress(
        await eth.ipftRedeemable.author(this.cid)
      ))());

    this._claimedAt.value ||= await (this._claimedAtPromise ||= (async () =>
      await claimedAtBlock(this.cid).then((bn) => {
        if (bn) {
          return eth.provider
            .value!.getBlock(bn)
            .then((b) => new Date(b.timestamp * 1000));
        }
      }))());

    this._royalty.value ||= await (this._royaltyPromise ||= (async () =>
      await eth.ipftRedeemable.royaltyNumber(this.cid))());

    this._balance.value ||= await (this._balancePromise ||= (async () =>
      await eth.ipftRedeemable.balanceOf(
        eth.account.value!.address.value!,
        this.cid
      ))());

    this._totalSupply.value ||= await (this._totalSupplyPromise ||= (async () =>
      await eth.ipftRedeemable.totalSupply(this.cid))());

    this._finalized.value ||= await (this._finalizedPromise ||= (async () =>
      await eth.ipftRedeemable.isFinalized(this.cid))());

    this._expiredAt.value ||= await (this._expiredAtPromise ||= (async () =>
      await eth.ipftRedeemable.expiredAt(this.cid))());
  }
}

async function claimedAtBlock(cid: CID): Promise<number | undefined> {
  return (
    await edb.findEvent(
      "IPFTRedeemable.Claim",
      "id",
      IPFT.cidToUint256(cid)._hex,
      "nextunique"
    )
  )?.blockNumber;
}
