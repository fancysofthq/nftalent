import { Ierc721 as BaseType } from "@/../lib/ipnft/waffle/types/Ierc721";
import { abi } from "@/../lib/ipnft/waffle/IERC721.json";
import { BigNumber, Signer } from "ethers";
import { EventBase } from "./common";
import { NFT } from "./NFT";
import { Provider } from "@ethersproject/abstract-provider";
import { Address } from "../Address";

/**
 * Solidity mapping:
 *
 * ```solidity
 * Transfer(
 *   address indexed from,
 *   address indexed to,
 *   uint256 indexed tokenId
 * )
 * ```
 */
export type Transfer = EventBase & {
  from: string;
  to: string;
  tokenId: string;
};

export class Token {
  readonly contract: Address;
  readonly id: BigNumber;

  constructor(contract: Address, id: BigNumber) {
    this.contract = contract;
    this.id = id;
  }

  equals(other: Token): boolean {
    return this.contract.equals(other.contract) && this.id.eq(other.id);
  }

  toNFT(): NFT {
    return {
      contract: this.contract,
      id: this.id,
    };
  }
}

export default class IERC721 {
  private readonly _contract: BaseType;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(address, abi, providerOrSigner);
  }
}
