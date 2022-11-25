import { Buffer } from "buffer";
import { Uint8 } from "@/util";

export class Address {
  readonly bytes: Buffer;

  static zero() {
    return new Address(Uint8.zeroes(20));
  }

  constructor(address: Uint8Array | Buffer | string) {
    if (address instanceof Uint8Array) this.bytes = Buffer.from(address);
    else if (typeof address == "string")
      this.bytes = Buffer.from(address.substring(2), "hex");
    else this.bytes = address;
  }

  equals(other: Address | undefined): boolean {
    return other?.bytes.equals(this.bytes) ?? false;
  }

  toString(): string {
    return "0x" + this.bytes.toString("hex");
  }

  get display(): string {
    return (
      this.toString().substring(0, 6) + "…" + this.toString().substring(38)
    );
  }
}
