import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";

export type MetadataRedeemableBase = ERC1155Metadata & {
  $schema: "nftalent/redeemable/base?v=1";
  properties: {
    tags: string[];
    unit: string;
  };
};
