import { BigNumber } from "@ethersproject/bignumber";
import { Address } from "../Address";

/**
 * A generic NFT.
 */
export type NFT = {
  contract: Address;
  id: BigNumber;
};
