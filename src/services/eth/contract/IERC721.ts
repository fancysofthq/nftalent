import { BigNumber } from "ethers";
import Account from "../Account";
import { EventBase } from "./common";
import { NFT } from "./NFT";

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
  readonly contract: Account;
  readonly id: BigNumber;

  constructor(contract: Account, id: BigNumber) {
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
