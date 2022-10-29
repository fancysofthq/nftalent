import { BigNumber } from "ethers";
import Account from "../Account";

export type Metadata = {
  name: string;
  description: string;
  image: string;
  properties: any;
};

export default class ERC1155Token {
  readonly contract: Account;
  readonly id: BigNumber;
  metadata?: Metadata;

  constructor(contract: Account, id: BigNumber, metadata?: Metadata) {
    this.contract = contract;
    this.id = id;
    this.metadata = metadata;
  }

  equals(other: ERC1155Token): boolean {
    return this.contract.equals(other.contract) && this.id.eq(other.id);
  }
}
