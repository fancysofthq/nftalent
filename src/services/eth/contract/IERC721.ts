import { BigNumber } from "ethers";
import Account from "../Account";

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
export type Transfer = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

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
}
