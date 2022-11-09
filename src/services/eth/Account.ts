import { Buffer } from "buffer";

export default class Account {
  readonly bytes: Buffer;

  static zero() {
    return new Account(Buffer.alloc(20));
  }

  constructor(address: Buffer | string) {
    if (address instanceof Buffer) this.bytes = address;
    else this.bytes = Account.bytes(address);
  }

  /**
   * @param {DataHexstring} address case-insensitive, starting with `0x`.
   */
  static bytes(address: string): Buffer {
    return Buffer.from(address.substring(2), "hex");
  }

  get address(): string {
    return this.toString();
  }

  /**
   * Return the hex string representation of the address.
   */
  toString(): string {
    Buffer.alloc(32).toString;
    return "0x" + this.bytes.toString("hex");
  }

  equals(other: Account): boolean {
    return this.bytes.equals(other.bytes);
  }

  isZero(): boolean {
    return this.bytes.every((b) => b == 0);
  }

  get trimmed(): string {
    return "0x" + this.toString().slice(2, 8).toUpperCase();
  }
}
