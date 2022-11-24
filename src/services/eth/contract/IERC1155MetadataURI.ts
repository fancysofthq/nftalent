import { Ierc1155MetadataUri as BaseType } from "@/../lib/ipnft/waffle/types/Ierc1155MetadataUri";
import { abi } from "@/../lib/ipnft/waffle/IERC1155MetadataURI.json";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { Token } from "./IERC1155";

export default class IERC1155MetadataURI {
  private readonly _contract: BaseType;

  static get interfaceId(): string {
    return "0x0e89341c";
  }

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(address, abi, providerOrSigner);
  }

  async uri(token: Token): Promise<string> {
    return await this._contract.uri(token.id);
  }
}
