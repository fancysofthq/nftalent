import { ethers, BigNumber } from "ethers";
import Account from "./eth/Account";
import ERC1155Token from "./eth/contract/ERC1155Token";
import { RoyaltyInfo } from "./eth/contract/ERC2981";
import { Metadata } from "./eth/contract/IPNFTRedeemable";

export class ERC1155TokenWrapper {
  readonly token: ERC1155Token;
  readonly minter?: Account;
  readonly editions?: number;
  readonly price?: BigNumber;
  readonly royalty?: RoyaltyInfo;
  readonly balance?: BigNumber;

  constructor(
    token: ERC1155Token,
    minter?: Account,
    editions?: number,
    price?: BigNumber,
    royalty?: RoyaltyInfo,
    balance?: BigNumber
  ) {
    this.token = token;
    this.minter = minter;
    this.editions = editions;
    this.price = price;
    this.royalty = royalty;
    this.balance = balance;
  }
}

export class Listing {
  readonly tokenWrapper: ERC1155TokenWrapper;
  readonly timestamp: Date;

  constructor(token: ERC1155TokenWrapper, timestamp: Date) {
    this.tokenWrapper = token;
    this.timestamp = timestamp;
  }
}

export class Purchase {
  readonly buyer: Account;
  readonly tokenWrapper: ERC1155TokenWrapper;
  readonly timestamp: Date;
  readonly sum: BigNumber;
  readonly amount: BigNumber;

  constructor(
    buyer: Account,
    token: ERC1155TokenWrapper,
    timestamp: Date,
    sum: BigNumber,
    amount: BigNumber
  ) {
    this.buyer = buyer;
    this.tokenWrapper = token;
    this.timestamp = timestamp;
    this.sum = sum;
    this.amount = amount;
  }
}

const dummyContract = Account.zero();

const backendDeveloper = new ERC1155TokenWrapper(
  new ERC1155Token(dummyContract, BigNumber.from(1), {
    name: "Backend developer",
    description:
      "Lorem ipsum dolor sit amet, **consectetur** adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    image: "http://placekitten.com/610/600",
    properties: {
      tags: ["foo", "bar"],
      duration: 60 * 60 * 1000,
      expiresAt: new Date(Date.parse("2021-09-01T00:00:00Z")),
    },
  } as Metadata),
  new Account("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
  10,
  ethers.utils.parseEther("0.025"),
  {
    receiver: new Account("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
    royalty: 0.1,
  } as RoyaltyInfo,
  BigNumber.from(1)
);

const wellnessCoachToken = new ERC1155TokenWrapper(
  new ERC1155Token(dummyContract, BigNumber.from(2), {
    name: "Welness coach",
    description:
      "_Cursus_ mattis molestie a iaculis at erat pellentesque. Vestibulum mattis ullamcorper velit sed ullamcorper morbi tincidunt ornare.",
    image: "http://placekitten.com/500/500",
    properties: {
      tags: ["foo", "bar"],
      duration: 60 * 60 * 1000,
      expiresAt: new Date(Date.parse("2021-09-01T00:00:00Z")),
    },
  } as Metadata),
  new Account("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
  25,
  ethers.utils.parseEther("0.5"),
  {
    receiver: new Account("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
    royalty: 0,
  } as RoyaltyInfo,
  BigNumber.from(0)
);

const frontendDeveloper = new ERC1155TokenWrapper(
  new ERC1155Token(dummyContract, BigNumber.from(3), {
    name: "Frontend Developer",
    description:
      "Rhoncus dolor purus non enim.\n\nGravida cum sociis natoque penatibus et magnis. Lectus vestibulum mattis ullamcorper velit sed ullamcorper. Porttitor massa id neque aliquam. Neque gravida in fermentum et sollicitudin ac orci phasellus egestas.",
    image: "http://placekitten.com/700/700",
    properties: {
      tags: ["bar", "baz"],
      duration: 60 * 60 * 1000,
      expiresAt: new Date(Date.parse("2021-09-01T00:00:00Z")),
    },
  } as Metadata),
  new Account("0x0ad618979094a85efa6186175279821f6bf72cc4"),
  40,
  ethers.utils.parseEther("0.02"),
  {
    receiver: new Account("0x0ad618979094a85efa6186175279821f6bf72cc4"),
    royalty: 0.25,
  } as RoyaltyInfo,
  BigNumber.from(0)
);

export function getToken(id: number): ERC1155TokenWrapper {
  switch (id) {
    case 1:
      return backendDeveloper;
    case 2:
      return wellnessCoachToken;
    case 3:
      return frontendDeveloper;
    default:
      throw new Error("Token not found");
  }
}

export const events = [
  new Listing(backendDeveloper, new Date()),
  new Listing(frontendDeveloper, new Date()),
  new Purchase(
    new Account("0x0000000000000000000000000000000000000000"),
    backendDeveloper,
    new Date(),
    ethers.utils.parseEther("0.6"),
    BigNumber.from(3)
  ),
  new Listing(wellnessCoachToken, new Date()),
];
