import { BigNumber } from "@ethersproject/bignumber";
import Account from "../Account";

/**
 * A generic NFT.
 */
export type NFT = {
  contract: Account;
  id: BigNumber;
};
