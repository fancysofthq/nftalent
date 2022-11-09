import IPNFTSuper, {
  getOrCreate as getOrCreateIPNFTSuper,
} from "@/models/IPNFTSuper";
import Account from "@/services/eth/Account";
import { Listing } from "@/services/eth/contract/NFTSimpleListing";
import * as eth from "@/services/eth";
import { uint256ToCID } from "@/services/eth/contract/IPNFT";

export type IPNFTSuperListing = {
  listing: Listing;
  token: IPNFTSuper;
};

/**
 * Return active listings by account (including those with zero balance).
 */
export async function accountListings(
  account: Account
): Promise<IPNFTSuperListing[]> {
  // 1. Fetch all listings where the seller is the account.
  const listings = await eth.nftSimpleListing.listingsByAccount(account);

  // 2. Fetch the contract for actual listing actual details.
  await Promise.all(
    listings.map(async (listing) => {
      const res = await eth.nftSimpleListing.getListing(listing.id);
      if (!res) throw "Listing not found with id " + listing.id;

      listing.price = res.price;
      listing.stockSize = res.stockSize;
    })
  );

  return listings.map((listing) => ({
    listing: listing,
    token: getOrCreateIPNFTSuper(uint256ToCID(listing.token.id)),
  }));
}
