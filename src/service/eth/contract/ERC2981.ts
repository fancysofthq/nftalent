import Account from "../Account";

export type RoyaltyInfo = {
  receiver: Account;

  /** 0-1. */
  royalty: number;
};
