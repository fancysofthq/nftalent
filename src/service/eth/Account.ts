import { Buffer } from "buffer";

export default class Account {
  readonly address: Buffer;

  static zero() {
    return new Account(Buffer.alloc(20));
  }

  constructor(address: Buffer | string) {
    if (address instanceof Buffer) this.address = address;
    else this.address = Account.addressBytes(address);
  }

  /**
   * @param {DataHexstring} address case-insensitive, starting with `0x`.
   */
  static addressBytes(address: string): Buffer {
    return Buffer.from(address.substring(2), "hex");
  }

  /**
   * Return the hex string representation of the address.
   */
  toString(): string {
    Buffer.alloc(32).toString;
    return "0x" + this.address.toString("hex");
  }

  equals(other: Account): boolean {
    return this.address.equals(other.address);
  }

  get trimmed(): string {
    return "0x" + this.toString().slice(2, 8).toUpperCase();
  }
}
