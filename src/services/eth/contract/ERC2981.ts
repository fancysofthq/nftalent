import { BigNumberish } from "ethers";
import Model from "@/models/Account";

export type RoyaltyInfo = {
  receiver: Model;
  royalty: BigNumberish;
};
