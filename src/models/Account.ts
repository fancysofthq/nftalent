import { Address } from "@/services/eth/Address";
import { computed, markRaw, ref, type Ref } from "vue";
import { resolve as resolveENS } from "@/services/ensideas";

export default class Account {
  private static memoized = new Map<Address | string, Account>();

  readonly address: Ref<Address | undefined>;
  readonly ensName: Ref<string | null | undefined>;

  readonly resolved = computed(() => {
    return this.address.value !== undefined && this.ensName.value !== undefined;
  });

  private _resolvedPromise?: Promise<void>;

  static getOrCreateFromAddress(
    address: Address | Uint8Array | Buffer | string,
    resolve = false
  ): Account {
    if (!(address instanceof Address)) address = new Address(address);

    if (Account.memoized.has(address)) {
      return Account.memoized.get(address)!;
    }

    const token = markRaw(Account.fromAddress(address));
    Account.memoized.set(address, token);

    if (resolve) token.resolve();
    return token;
  }

  static getOrCreateFromEnsName(name: string, resolve = false): Account {
    if (Account.memoized.has(name)) {
      return Account.memoized.get(name)!;
    }

    const token = markRaw(Account.fromENSName(name));
    Account.memoized.set(name, token);

    if (resolve) token.resolve();
    return token;
  }

  private static fromAddress(
    address: Address | Uint8Array | Buffer | string
  ): Account {
    if (!(address instanceof Address)) address = new Address(address);
    return new Account(ref(address), ref(undefined));
  }

  private static fromENSName(ensName: string): Account {
    return new Account(ref(undefined), ref(ensName));
  }

  private constructor(
    address: Ref<Address | undefined>,
    ensName: Ref<string | undefined>
  ) {
    this.address = address;
    this.ensName = ensName;
  }

  equals(other: Account): boolean {
    return this.address.value?.equals(other.address.value) ?? false;
  }

  async resolve(): Promise<Account> {
    if (this.resolved.value) return this;
    else if (
      this.ensName.value === undefined &&
      this.address.value === undefined
    ) {
      throw new Error("Unresolvable account");
    } else {
      this._resolvedPromise ||= (async () => {
        if (this.address.value && this.ensName.value === undefined) {
          this.ensName.value = (
            await resolveENS(this.address.value.toString())
          ).name;
        } else if (this.ensName.value && this.address.value === undefined) {
          this.address.value = new Address(
            (await resolveENS(this.ensName.value)).address
          );
        }
      })();
    }

    await this._resolvedPromise;
    return this;
  }
}
