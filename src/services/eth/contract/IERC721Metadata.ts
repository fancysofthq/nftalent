import { Ierc721Metadata as BaseType } from "@/../lib/ipnft/waffle/types/Ierc721Metadata";
import { abi } from "@/../lib/ipnft/waffle/IERC721Metadata.json";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { Token } from "./IERC721";

export default class IERC721Metadata {
  private readonly _contract: BaseType;

  static get interfaceId(): string {
    return "0x5b5e139f";
  }

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(address, abi, providerOrSigner);
  }

  async tokenURI(token: Token): Promise<string> {
    return await this._contract.tokenURI(token.id);
  }
}