import Account from "@/service/eth/Account";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { id2Cid, type Metadata } from "@/service/eth/contract/NFTime";
import { Listing } from "@/service/eth/contract/NFTSimpleListing";
import { BigNumber } from "ethers";
import * as ipfs from "@/service/ipfs";
import axios from "axios";
import * as eth from "@/service/eth";
import { markRaw, ref, type Ref } from "vue";

export type Aux = {
  metadata: Ref<Metadata | undefined>;
  balance: Ref<BigNumber | undefined>;
  royalty: Ref<number | undefined>;
  expiredAt: Ref<Date | undefined>;
  minter: Ref<Account | undefined>;
  mintedEditions: Ref<BigNumber | undefined>;
  mintedAt: Ref<Date | undefined>;
  primaryListing: Ref<Listing | undefined>;
};

export class RichToken {
  readonly token: ERC1155Token;
  readonly aux: Aux;

  constructor(
    token: ERC1155Token,
    aux: Aux | undefined = {
      metadata: ref(),
      balance: ref(),
      royalty: ref(),
      expiredAt: ref(),
      minter: ref(),
      mintedEditions: ref(),
      mintedAt: ref(),
      primaryListing: ref(),
    }
  ) {
    this.token = token;
    this.aux = markRaw(aux);
  }

  async enrichMetadata(): Promise<void> {
    const res = await axios.get(
      ipfs.processUri(ipfs.ipnftMetadataUri(id2Cid(this.token.id))).toString()
    );

    this.aux.metadata.value = res.data;
  }

  async enrichEth() {
    const cid = id2Cid(this.token.id);

    eth.nftime.balanceOf(eth.account.value!, cid).then((res) => {
      this.aux.balance.value = res;
    });

    eth.nftime.getToken(cid).then((res) => {
      this.aux.royalty.value = res.royalty.value / 255;
      this.aux.minter.value = res.minter;
      this.aux.expiredAt.value = res.expiredAt;
    });

    eth.nftime.findMintEvent(cid).then((res) => {
      if (res) {
        this.aux.mintedEditions.value = BigNumber.from(res!.value);
        eth.provider.value!.getBlock(res.blockNumber).then((block) => {
          this.aux.mintedAt.value = new Date(block.timestamp * 1000);
        });
      }
    });
  }

  async enrichPrimaryListing(): Promise<void> {
    eth.nftSimpleListing.findPrimaryListing(this.token).then((res) => {
      if (res) {
        this.aux.primaryListing.value = res;
      }
    });
  }
}
