import { IpnftRedeemable as BaseType } from "./abi/types/IpnftRedeemable";
import { abi } from "./abi/IPNFTRedeemable.json";
import { BigNumber, BytesLike, ethers, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { CID } from "multiformats";
import Account from "../Account";
import { type Metadata as ERC1155Metadata } from "./ERC1155Token";

export type Metadata = ERC1155Metadata & {
  properties: {
    tags: string[];
    duration: number;
    expiresAt: Date;
  };
};

export default class IPNFTRedeemable {
  readonly contract: BaseType;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new BaseType(address, abi, providerOrSigner);
  }

  async mint(
    to: Account,
    cid: CID,
    amount: BigNumber,
    expiredAt: Date,
    royalty: number,
    data: BytesLike = []
  ): Promise<void> {
    await this.contract.mint(
      to.toString(),
      BigNumber.from(cid.multihash.digest),
      amount,
      expiredAt.getTime(),
      royalty,
      data
    );
  }
}
