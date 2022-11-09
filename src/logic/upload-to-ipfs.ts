import * as eth from "@/services/eth";
import { Tag as IPNFTTag } from "@/services/eth/contract/IPNFT";
import * as nftalent from "@/nftalent";
import { web3StorageApiKey } from "@/store";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import { ipfsUri } from "@/services/ipfs";
import IPNFT721 from "@/services/eth/contract/IPNFT721";
import { Web3Storage } from "web3.storage";
import * as Block from "multiformats/block";
import { pack } from "ipfs-car/pack";
import { MemoryBlockStore } from "ipfs-car/blockstore/memory"; // You can also use the `level-blockstore` module
import BlockstoreCarReader from "@/services/ipfs/blockstore-car-reader";
import { FileWithUrl } from "@/components/shared/SelectImage.vue";

// TODO: Implement NFT.storage logic, that is iterate through
// the metadata object and replace files with CIDs.
export async function uploadToIpfs(
  metadata: {
    name: string;
    image: FileWithUrl;
    description: string;
    properties: { tags: string[]; unit: string };
  },
  progressCallback: (fraction: number) => void
): Promise<{
  root: Block.Block<unknown>;
  ipnftTag: IPNFTTag;
}> {
  if (!web3StorageApiKey.value) throw "No Web3.Storage API key set";
  const client = new Web3Storage({ token: web3StorageApiKey.value });

  const blockstore = new MemoryBlockStore();

  const { root: imageCid } = await pack({
    input: new Uint8Array(await metadata.image.arrayBuffer()),
    blockstore,
    hasher: sha256,
    wrapWithDirectory: false, // Wraps input into a directory. Defaults to `true`
    maxChunkSize: 1024 * 1024,
  });

  const { root: metadataCid } = await pack({
    input: new TextEncoder().encode(
      JSON.stringify({
        $schema: "nftalent/redeemable/base?v=1",
        name: metadata.name,
        description: metadata.description,
        image: ipfsUri(imageCid).toString(),
        properties: {
          tags: metadata.properties.tags,
          unit: metadata.properties.unit,
        },
      } as nftalent.MetadataRedeemableBase)
    ),
    blockstore,
    hasher: sha256,
    wrapWithDirectory: false,
    maxChunkSize: 1024 * 1024,
  });

  const ipnftTag = new IPNFTTag(
    (await eth.provider.value!.getNetwork()).chainId,
    IPNFT721.account.address,
    eth.account.value!.address,
    await eth.ipnft721.minterNonce(eth.account.value!)
  );

  const root = await Block.encode({
    value: {
      image: imageCid,
      "metadata.json": metadataCid,
      ipnft: ipnftTag.bytes,
    },
    codec: dagCbor,
    hasher: sha256,
  });
  await blockstore.put(root.cid, root.bytes);

  const reader = new BlockstoreCarReader(1, [root.cid], blockstore);

  let totalByteSize = 0;
  for await (const block of reader.blocks()) {
    totalByteSize += block.bytes.length;
  }
  console.debug("Total bytes:", totalByteSize);

  let storedByteSize = 0;
  await client.putCar(reader, {
    maxChunkSize: 1024 * 1024,
    onStoredChunk: (size) => {
      storedByteSize += size;
      console.debug(
        "Stored bytes:",
        storedByteSize,
        `(${(storedByteSize / totalByteSize) * 100}%)`
      );
      progressCallback(storedByteSize / totalByteSize);
    },
  });

  return { root, ipnftTag };
}
