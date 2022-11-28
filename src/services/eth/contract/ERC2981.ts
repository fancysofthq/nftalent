import { BigNumberish } from "ethers";
import { Address } from "../Address";

export type RoyaltyInfo = {
  receiver: Address;
  royalty: BigNumberish;
};
