import Account from "@/services/eth/Account";
import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";
import { Listing } from "@/services/eth/contract/MetaStore";
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

  private _metadata: Ref<ERC1155Metadata | undefined>;
  private _ipnft721: Ref<AuxIPNFT721 | undefined>;
  private _ipnft1155: Ref<AuxIPNFT1155 | undefined>;
  private _metaStore: Ref<AuxMetaStore | undefined>;

  private _metadataPromise?: Promise<ERC1155Metadata>;
  private _ipnft721Promise?: Promise<AuxIPNFT721>;
  private _ipnft1155Promise?: Promise<AuxIPNFT1155>;
  private _metaStorePromise?: Promise<AuxMetaStore>;

  constructor(
    token: IPNFTEth.Token,
    {
      metadata,
      ipnft,
      ipnft1155,
      metaStore,
    }: {
      metadata: Ref<ERC1155Metadata | undefined>;
      ipnft: Ref<AuxIPNFT721 | undefined>;
      ipnft1155: Ref<AuxIPNFT1155 | undefined>;
      metaStore: Ref<AuxMetaStore | undefined>;
    } = {
      metadata: ref(),
      ipnft: ref(),
      ipnft1155: ref(),
      metaStore: ref(),
    }
  ) {
    this.token = token;
    this._metadata = metadata;
    this._ipnft721 = ipnft;
    this._ipnft1155 = ipnft1155;
    this._metaStore = metaStore;
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
    await Promise.all([
      this._fetchIPNFT721(),
      this._fetchIPNFT1155(),
      this._fetchMetaStore(),
    ]);
  }

  get metadata(): ERC1155Metadata | undefined {
    return this._metadata.value;
  }

  get ipnft721Minter(): Account | undefined {
    return this._ipnft721.value?.minter;
  }

  get ipnft721MintedAt(): Date | undefined {
    return this._ipnft721.value?.mintedAt;
  }

  get ipnft721Royalty(): number | undefined {
    return this._ipnft721.value?.royalty;
  }

  get ipnft1155Balance(): BigNumber | undefined {
    return this._ipnft1155.value?.balance;
  }

  get ipnft1155TotalSupply(): BigNumber | undefined {
    return this._ipnft1155.value?.totalSupply;
  }

  get ipnft1155Finalized(): boolean | undefined {
    return this._ipnft1155.value?.finalized;
  }

  get ipnft1155ExpiredAt(): Date | undefined {
    return this._ipnft1155.value?.expiredAt;
  }

  private async _fetchIPNFT721(): Promise<void> {
    this._ipnft721.value ||= await (this._ipnft721Promise ||= (async () => ({
      minter: await eth.ipnft721.ownerOf(this.token),
      mintedAt: await ipnft721MintedAtBlock(this.token).then((bn) => {
        if (bn) {
          return eth.provider
            .value!.getBlock(bn)
            .then((b) => new Date(b.timestamp * 1000));
        }
      }),
      royalty: await eth.ipnft721.royaltyNumber(this.token),
    }))());
  }

  private async _fetchIPNFT1155(): Promise<void> {
    this._ipnft1155.value ||= await (this._ipnft1155Promise ||= (async () => ({
      balance: await eth.ipnft1155.balanceOf(eth.account.value!, this.token),
      totalSupply: await eth.ipnft1155.totalSupply(this.token),
      finalized: await eth.ipnft1155.finalized(this.token),
      expiredAt: await eth.ipnft1155.expiredAt(this.token),
    }))());
  }

  private async _fetchMetaStore(): Promise<void> {
    // TODO: Fetch all listings, signal the primary one?
    // this._metaStore.value ||= await (this._metaStorePromise ||= (async () => ({
    //   primaryListing: await eth.metaStore.findPrimaryListing({
    //     contract: IPNFT1155.account,
    //     id: this.token.id,
    //   }),
    // }))());
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

type AuxIPNFT721 = {
  minter: Account;
  mintedAt?: Date;
  royalty: number;
};

type AuxIPNFT1155 = {
  balance: BigNumber;
  totalSupply: BigNumber;
  expiredAt?: Date;
  finalized: boolean;
};

type AuxMetaStore = {
  primaryListing?: Listing;
};

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
