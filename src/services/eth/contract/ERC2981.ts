import { BigNumberish } from "ethers";
import Account from "../Account";

export type RoyaltyInfo = {
  receiver: Account;
  royalty: BigNumberish;
};
