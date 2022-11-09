import { type ContractTransaction, BigNumberish } from "ethers";
import * as eth from "@/services/eth";
import { Tag as IPNFTTag, Token as IPNFT } from "@/services/eth/contract/IPNFT";
import { Uint8 } from "@/util";
import { CID } from "multiformats/cid";
import NFTSimpleListing, {
  ListingConfig,
} from "@/services/eth/contract/NFTSimpleListing";
import { Block } from "multiformats/block";

export async function mint721(
  root: Block<unknown>,
  ipnftTag: IPNFTTag,
  royalty: Uint8
): Promise<ContractTransaction> {
  return await eth.ipnft721.mint(eth.account.value!, root, ipnftTag, royalty);
}

export async function qualifyRedeemable(
  cid: CID,
  matureSince: Date,
  expiredAt: Date
): Promise<ContractTransaction> {
  return await eth.erc1876Redeemable.qualify(
    cid.multihash.digest,
    matureSince,
    expiredAt
  );
}

export async function mint1155(
  token: IPNFT,
  editions: number,
  price: BigNumberish
): Promise<ContractTransaction> {
  return await eth.ipnft1155.mint(
    NFTSimpleListing.account,
    token,
    editions,
    false,
    new ListingConfig(price, eth.app.address).toBytes()
  );
}
