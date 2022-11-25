import { BigNumber } from "@ethersproject/bignumber";
import Model from "@/models/Account";

/**
 * A generic NFT.
 */
export type NFT = {
  contract: Model;
  id: BigNumber;
};
