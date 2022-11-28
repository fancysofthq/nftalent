import * as Account from "./Account";
import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";
import { BigNumber } from "ethers";
import * as ipfs from "@/services/ipfs";
import axios from "axios";
import * as eth from "@/services/eth";
import * as IPNFTEth from "@/services/eth/contract/IPNFT";
import edb from "@/services/eth/event-db";
import { AddressZero } from "@ethersproject/constants";
import { CID } from "multiformats";
import { markRaw, Ref, ref } from "vue";

/**
 * A wrapper around IPNFT1155 token carrying auxiliary data.
 */
export default class IPNFT {
  readonly token: IPNFTEth.Token;

  private readonly _metadata: Ref<ERC1155Metadata | undefined> = ref();

  private readonly _ipnft721Minter: Ref<Account.default | undefined> = ref();
  private readonly _ipnft721MintedAt: Ref<Date | undefined> = ref();
  private readonly _ipnft721Royalty: Ref<number | undefined> = ref();
  private readonly _ipnft721CurrentOwner: Ref<Account.default | undefined> =
    ref();

  private readonly _ipnft1155Balance: Ref<BigNumber | undefined> = ref();
  private readonly _ipnft1155TotalSupply: Ref<BigNumber | undefined> = ref();
  private readonly _ipnft1155Finalized: Ref<boolean | null | undefined> = ref();
  private readonly _ipnft1155ExpiredAt: Ref<Date | null | undefined> = ref();

  private _metadataPromise?: Promise<ERC1155Metadata>;
  private _ipnft721MinterPromise?: Promise<Account.default>;
  private _ipnft721MintedAtPromise?: Promise<Date | undefined>;
  private _ipnft721RoyaltyPromise?: Promise<number>;
  private _ipnft721CurrentOwnerPromise?: Promise<Account.default>;
  private _ipnft1155BalancePromise?: Promise<BigNumber>;
  private _ipnft1155TotalSupplyPromise?: Promise<BigNumber>;
  private _ipnft1155FinalizedPromise?: Promise<boolean | null>;
  private _ipnft1155ExpiredAtPromise?: Promise<Date | null>;

  constructor(
    token: IPNFTEth.Token,
    {
      metadata,
      ipnft721Minter,
      ipnft721MintedAt,
      ipnft721Royalty,
      ipnft721CurrentOwner,
      ipnft1155Balance,
      ipnft1155TotalSupply,
      ipnft1155Finalized,
      ipnft1155ExpiredAt,
    }: {
      metadata: Ref<ERC1155Metadata | undefined>;
      ipnft721Minter: Ref<Account.default | undefined>;
      ipnft721MintedAt: Ref<Date | undefined>;
      ipnft721Royalty: Ref<number | undefined>;
      ipnft721CurrentOwner: Ref<Account.default | undefined>;
      ipnft1155Balance: Ref<BigNumber | undefined>;
      ipnft1155TotalSupply: Ref<BigNumber | undefined>;
      ipnft1155Finalized: Ref<boolean | null | undefined>;
      ipnft1155ExpiredAt: Ref<Date | null | undefined>;
    } = {
      metadata: ref(),
      ipnft721Minter: ref(),
      ipnft721MintedAt: ref(),
      ipnft721Royalty: ref(),
      ipnft721CurrentOwner: ref(),
      ipnft1155Balance: ref(),
      ipnft1155TotalSupply: ref(),
      ipnft1155Finalized: ref(),
      ipnft1155ExpiredAt: ref(),
    }
  ) {
    this.token = token;
    this._metadata = metadata;
    this._ipnft721Minter = ipnft721Minter;
    this._ipnft721MintedAt = ipnft721MintedAt;
    this._ipnft721Royalty = ipnft721Royalty;
    this._ipnft721CurrentOwner = ipnft721CurrentOwner;
    this._ipnft1155Balance = ipnft1155Balance;
    this._ipnft1155TotalSupply = ipnft1155TotalSupply;
    this._ipnft1155Finalized = ipnft1155Finalized;
    this._ipnft1155ExpiredAt = ipnft1155ExpiredAt;
  }

  get metadata(): ERC1155Metadata | undefined {
    return this._metadata.value;
  }

  set metadata(value: ERC1155Metadata | undefined) {
    this._metadata.value = value;
  }

  get ipnft721Minter(): Account.default | undefined {
    return this._ipnft721Minter.value;
  }

  set ipnft721Minter(value: Account.default | undefined) {
    this._ipnft721Minter.value = value;
  }

  get ipnft721MintedAt(): Date | undefined {
    return this._ipnft721MintedAt.value;
  }

  set ipnft721MintedAt(value: Date | undefined) {
    this._ipnft721MintedAt.value = value;
  }

  get ipnft721Royalty(): number | undefined {
    return this._ipnft721Royalty.value;
  }

  set ipnft721Royalty(value: number | undefined) {
    this._ipnft721Royalty.value = value;
  }

  get ipnft721CurrentOwner(): Account.default | undefined {
    return this._ipnft721CurrentOwner.value;
  }

  set ipnft721CurrentOwner(value: Account.default | undefined) {
    this._ipnft721CurrentOwner.value = value;
  }

  get ipnft1155Balance(): BigNumber | undefined {
    return this._ipnft1155Balance.value;
  }

  set ipnft1155Balance(value: BigNumber | undefined) {
    this._ipnft1155Balance.value = value;
  }

  get ipnft1155TotalSupply(): BigNumber | undefined {
    return this._ipnft1155TotalSupply.value;
  }

  set ipnft1155TotalSupply(value: BigNumber | undefined) {
    this._ipnft1155TotalSupply.value = value;
  }

  get ipnft1155Finalized(): boolean | null | undefined {
    return this._ipnft1155Finalized.value;
  }

  set ipnft1155Finalized(value: boolean | null | undefined) {
    this._ipnft1155Finalized.value = value;
  }

  get ipnft1155ExpiredAt(): Date | null | undefined {
    return this._ipnft1155ExpiredAt.value;
  }

  set ipnft1155ExpiredAt(value: Date | null | undefined) {
    this._ipnft1155ExpiredAt.value = value;
  }

  async fetchIPFSMetadata(): Promise<void> {
    const uri = ipfs
      .processUri(ipfs.ipnftMetadataUri(IPNFTEth.uint256ToCID(this.token.id)))
      .toString();

    this._metadata.value ||= await (this._metadataPromise ||= (
      await axios.get(uri)
    ).data);
  }

  async fetchEthMetadata() {
    await Promise.all([this._fetchIPNFT721(), this._fetchIPNFT1155()]);
  }

  private async _fetchIPNFT721(): Promise<void> {
    this._ipnft721Minter.value ||= await (this._ipnft721MinterPromise ||=
      (async () =>
        Account.getOrCreateFromAddress(
          await eth.ipnft721.ownerOf(this.token)
        ))());

    this._ipnft721MintedAt.value ||= await (this._ipnft721MintedAtPromise ||=
      (async () =>
        await ipnft721MintedAtBlock(this.token).then((bn) => {
          if (bn) {
            return eth.provider
              .value!.getBlock(bn)
              .then((b) => new Date(b.timestamp * 1000));
          }
        }))());

    this._ipnft721Royalty.value ||= await (this._ipnft721RoyaltyPromise ||=
      (async () => await eth.ipnft721.royaltyNumber(this.token))());

    this._ipnft721CurrentOwner.value ||=
      await (this._ipnft721CurrentOwnerPromise ||= (async () =>
        Account.getOrCreateFromAddress(
          await eth.ipnft721.ownerOf(this.token)
        ))());
  }

  private async _fetchIPNFT1155(): Promise<void> {
    this._ipnft1155Balance.value ||= await (this._ipnft1155BalancePromise ||=
      (async () =>
        await eth.ipnft1155.balanceOf(
          eth.account.value!.address.value!,
          this.token
        ))());

    this._ipnft1155TotalSupply.value ||=
      await (this._ipnft1155TotalSupplyPromise ||= (async () =>
        await eth.ipnft1155.totalSupply(this.token))());

    this._ipnft1155Finalized.value ||=
      await (this._ipnft1155FinalizedPromise ||= (async () =>
        await eth.ipnft1155.isFinalized(this.token))());

    this._ipnft1155ExpiredAt.value ||=
      await (this._ipnft1155ExpiredAtPromise ||= (async () =>
        await eth.ipnft1155.expiredAt(this.token))());
  }
}

const memoized = new Map<CID, IPNFT>();

// Get existing token or create new instance
export function getOrCreate(cid: CID): IPNFT {
  if (memoized.has(cid)) {
    return memoized.get(cid)!;
  }

  const token = markRaw(new IPNFT(new IPNFTEth.Token(cid)));
  memoized.set(cid, token);
  return token;
}

async function ipnft721MintedAtBlock(
  token: IPNFTEth.Token
): Promise<number | undefined> {
  return (
    await edb.findEvent(
      "IPNFT721.Transfer",
      "from-tokenId",
      [AddressZero, token.id._hex],
      "next"
    )
  )?.blockNumber;
}
