import Account from "@/services/eth/Account";
import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";
import { Listing } from "@/services/eth/contract/NFTSimpleListing";
import { BigNumber } from "ethers";
import * as ipfs from "@/services/ipfs";
import axios from "axios";
import * as eth from "@/services/eth";
import {
  uint256ToCID,
  Token as IPNFToken,
} from "@/services/eth/contract/IPNFT";
import edb from "@/services/eth/event-db";
import { AddressZero } from "@ethersproject/constants";
import { Token as ERC721Token } from "@/services/eth/contract/IERC721";
import { CID } from "multiformats";
import { markRaw, Ref, ref } from "vue";

/**
 * A wrapper around IPNFT1155 token carrying auxiliary data.
 */
export default class IPNFTSuper {
  readonly token: IPNFToken;

  private _metadata: Ref<ERC1155Metadata | undefined>;
  private _ipnft721: Ref<AuxIPNFT721 | undefined>;
  private _ipnft1155: Ref<AuxIPNFT1155 | undefined>;
  private _redeemable: Ref<AuxRedeemable | undefined>;
  private _nftSimpleListing: Ref<AuxNFTSimpleListing | undefined>;

  private _metadataPromise?: Promise<ERC1155Metadata>;
  private _ipnft721Promise?: Promise<AuxIPNFT721>;
  private _ipnft1155Promise?: Promise<AuxIPNFT1155>;
  private _redeemablePromise?: Promise<AuxRedeemable>;
  private _nftSimpleListingPromise?: Promise<AuxNFTSimpleListing>;

  constructor(
    token: IPNFToken,
    {
      metadata,
      ipnft721,
      ipnft1155,
      redeemable,
      nftSimpleListing,
    }: {
      metadata: Ref<ERC1155Metadata | undefined>;
      ipnft721: Ref<AuxIPNFT721 | undefined>;
      ipnft1155: Ref<AuxIPNFT1155 | undefined>;
      redeemable: Ref<AuxRedeemable | undefined>;
      nftSimpleListing: Ref<AuxNFTSimpleListing | undefined>;
    } = {
      metadata: ref(),
      ipnft721: ref(),
      ipnft1155: ref(),
      redeemable: ref(),
      nftSimpleListing: ref(),
    }
  ) {
    this.token = token;
    this._metadata = metadata;
    this._ipnft721 = ipnft721;
    this._ipnft1155 = ipnft1155;
    this._redeemable = redeemable;
    this._nftSimpleListing = nftSimpleListing;
  }

  async fetchIPFSMetadata(): Promise<void> {
    const uri = ipfs
      .processUri(ipfs.ipnftMetadataUri(uint256ToCID(this.token.id)))
      .toString();

    this._metadata.value ||= await (this._metadataPromise ||= (
      await axios.get(uri)
    ).data);
  }

  async fetchEthMetadata() {
    await Promise.all([
      this._fetchIPNFT721(),
      this._fetchIPNFT1155(),
      this._fetchRedeemable(),
      this._fetchNFTSimpleListing(),
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

  get ipnft1155MintedTotal(): BigNumber | undefined {
    return this._ipnft1155.value?.mintedTotal;
  }

  get ipnft1155Finalized(): boolean | undefined {
    return this._ipnft1155.value?.finalized;
  }

  get redeemableQualifiedAt(): Date | undefined {
    return this._redeemable.value?.qualifiedAt;
  }

  get redeemableMatureSince(): Date | undefined {
    return this._redeemable.value?.matureSince;
  }

  get redeemableExpiredAt(): Date | undefined {
    return this._redeemable.value?.expiredAt;
  }

  get nftSimpleListingPrimaryListing(): Listing | undefined {
    return this._nftSimpleListing.value?.primaryListing;
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
      mintedTotal: await eth.ipnft1155.totalSupply(this.token),
      finalized: await eth.ipnft1155.finalized(this.token),
    }))());
  }

  private async _fetchRedeemable(): Promise<void> {
    this._redeemable.value ||= await (this._redeemablePromise ||=
      (async () => ({
        qualifiedAt: await erc1876RedeemableQualifiedAtBlock(
          this.token.toERC721Token()
        ).then(async (bn) => {
          if (bn) {
            const b = await eth.provider.value!.getBlock(bn);
            return new Date(b.timestamp * 1000);
          }
        }),
        matureSince: await eth.erc1876Redeemable.matureSince(this.token.id),
        expiredAt: await eth.erc1876Redeemable.expiredAt(this.token.id),
      }))());
  }

  private async _fetchNFTSimpleListing(): Promise<void> {
    this._nftSimpleListing.value ||= await (this._nftSimpleListingPromise ||=
      (async () => ({
        primaryListing: await eth.nftSimpleListing.findPrimaryListing(
          this.token.toERC1155Token()
        ),
      }))());
  }
}

const memoized = new Map<CID, IPNFTSuper>();

// Get existing token or create new instance
export function getOrCreate(cid: CID): IPNFTSuper {
  if (memoized.has(cid)) {
    return memoized.get(cid)!;
  }

  const token = markRaw(new IPNFTSuper(new IPNFToken(cid)));
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
  mintedTotal: BigNumber;
  finalized: boolean;
};

type AuxRedeemable = {
  qualifiedAt?: Date;
  matureSince?: Date;
  expiredAt?: Date;
};

type AuxNFTSimpleListing = {
  primaryListing?: Listing;
};

async function ipnft721MintedAtBlock(
  token: IPNFToken
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

async function erc1876RedeemableQualifiedAtBlock(
  token: ERC721Token
): Promise<number | undefined> {
  return (
    await edb.findEvent(
      "ERC1876Redeemable.Qualify",
      "tokenId",
      token.id._hex,
      "next"
    )
  )?.blockNumber;
}
