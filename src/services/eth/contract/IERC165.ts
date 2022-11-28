import { Ierc165 as BaseType } from "@/../lib/ipnft/waffle/types/Ierc165";
import { abi } from "@/../lib/ipnft/waffle/IERC165.json";
import { BytesLike, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { Address } from "../Address";

export default class IERC165 {
  private readonly _contract: BaseType;

  constructor(
    public readonly address: Address,
    providerOrSigner: Provider | Signer
  ) {
    this._contract = new BaseType(address.toString(), abi, providerOrSigner);
  }

  async supportsInterface(interfaceId: BytesLike): Promise<boolean> {
    return await this._contract.supportsInterface(interfaceId);
  }
}
