import { BigNumber } from "ethers";
import Account from "../Account";
import { EventBase } from "./common";
import { NFT } from "./NFT";

export type Metadata = {
  name: string;
  description: string;
  image: string;
  properties: any;
};

/**
 * A meta event for both `TransferSingle` and `TransferBatch` events.
 *
 * ```solidity
 * event TransferSingle(
 *   address indexed operator,
 *   address indexed from,
 *   address indexed to,
 *   uint256 id,
 *   uint256 value
 * );
 *
 * event TransferBatch(
 *     address indexed operator,
 *     address indexed from,
 *     address indexed to,
 *     uint256[] ids,
 *     uint256[] values
 * );
 * ```
 */
export type Transfer = EventBase & {
  subIndex: number; // NOTE: Would always be 0 for TransferSingle
  from: string;
  to: string;
  id: string; // NOTE: [^1]
  value: BigInt;
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
