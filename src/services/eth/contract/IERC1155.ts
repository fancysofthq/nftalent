import { type FileWithUrl } from "@/components/shared/SelectImage.vue";
import { Ierc1155 as BaseType } from "@/../lib/ipft/waffle/types/Ierc1155";
import { abi } from "@/../lib/ipft/waffle/IERC1155.json";
import { BigNumber, ethers, Signer } from "ethers";
import { EventBase } from "./common";
import { NFT } from "./NFT";
import { Provider } from "@ethersproject/abstract-provider";
import { Address } from "../Address";

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

export function fromTransferSingle(event: ethers.Event): Transfer {
  return {
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    subIndex: 0,

    from: (event.args!.from as string).toLowerCase(),
    to: (event.args!.to as string).toLowerCase(),
    id: (event.args!.id as BigNumber)._hex,
    value: (event.args!.value as BigNumber).toBigInt(),
  };
}

export function fromTransferBatch(e: ethers.Event): Transfer[] {
  return (e.args!.ids as BigNumber[]).map((id, i) => ({
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
    logIndex: e.logIndex,
    subIndex: i,

    from: (e.args!.from as string).toLowerCase(),
    to: (e.args!.to as string).toLowerCase(),
    id: id._hex,
    value: (e.args!.values as unknown as BigNumber[])[i].toBigInt(),
  }));
}

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

export default class IERC1155 {
  private readonly _contract: BaseType;

  constructor(
    public readonly address: Address,
    providerOrSigner: Provider | Signer
  ) {
    this._contract = new BaseType(address.toString(), abi, providerOrSigner);
  }
}
