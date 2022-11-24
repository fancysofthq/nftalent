import { type FileWithUrl } from "@/components/shared/SelectImage.vue";
import { Ierc1155 as BaseType } from "@/../lib/ipnft/waffle/types/Ierc1155";
import { abi } from "@/../lib/ipnft/waffle/IERC1155.json";
import { BigNumber, Signer } from "ethers";
import Account from "../Account";
import { EventBase } from "./common";
import { NFT } from "./NFT";
import { Provider } from "@ethersproject/abstract-provider";

export type Metadata = {
  $schema: string;
  name: string;
  description: string;
  image: string | URL | FileWithUrl;
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

export default class IERC1155 {
  private readonly _contract: BaseType;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(address, abi, providerOrSigner);
  }
}
