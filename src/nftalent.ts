import { type Metadata as ERC1155Metadata } from "@/services/eth/contract/IERC1155";

export namespace Collectible {
  export namespace Image {
    export type Metadata = ERC1155Metadata & {
      $schema: "nftalent/collectible/image?v=1";
      properties: {
        tags: string[];
        image?: {
          uri: string | URL | File;
          mime: string;
          bytesize: number;
        };
      };
    };
  }
}

export namespace Redeemable {
  export type Metadata = ERC1155Metadata & {
    $schema: "nftalent/redeemable/base?v=1";
    properties: {
      tags: string[];
      unit: string;
    };
  };
}
