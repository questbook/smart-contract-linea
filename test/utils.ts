import { randomBytes } from "crypto";
import { BigNumber, Signer, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import type {} from "../hardhat.config";
import { Reclaim, SchemaRegistry, Semaphore } from "../src/types";
import type {} from "../src/types/hardhat";
import fs from "fs";

export function randomEthAddress() {
  const addr = randomBytes(20); // random address
  const addrHex = `0x${addr.toString("hex")}`;
  return addrHex;
}

export async function randomWallet(balanceEth: BigNumber | number = 1) {
  const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
  if ((balanceEth as number) > 0) {
    // fund the wallet so it can make transactions
    let wei =
      typeof balanceEth === "number"
        ? "0x" + Number(balanceEth * 1e18).toString(16)
        : balanceEth.toHexString();
    wei = wei.replace("0x0", "0x");
    await ethers.provider.send("hardhat_setBalance", [wallet.address, wei]);
  }

  return wallet;
}

export async function deployReclaimContract(
  semaphore: Semaphore,
  signer?: Signer
) {
  const factory = await ethers.getContractFactory("Reclaim", signer);
  let reclaim = (await upgrades.deployProxy(factory, [semaphore.address], {
    kind: "uups",
    initializer: "initialize",
  })) as Reclaim;

  //   await reclaim.initialize();
  if (signer) {
    reclaim = reclaim.connect(signer);
  }

  return reclaim;
}

export async function randomiseWitnessList(witnesses: Reclaim.WitnessStruct[]) {
  const shuffle = (array: Reclaim.WitnessStruct[]) => {
    return array.sort(() => Math.random() - 0.5);
  };

  const shuffledWitnesses = shuffle(witnesses);
  return shuffledWitnesses;
}

export async function generateMockWitnessesList(
  numOfWitnesses: number,
  hostPrefix: string
) {
  let mockWitnesses: Reclaim.WitnessStruct[] = [];
  let witnessesWallets: Record<string, Wallet> = {};
  for (let i = 1; i <= numOfWitnesses; i++) {
    const wallet: Wallet = await randomWallet();
    mockWitnesses.push({
      addr: wallet.address,
      host: hostPrefix + i,
    });
    witnessesWallets[wallet.address] = wallet;
  }
  return { mockWitnesses, witnessesWallets };
}

export async function registerSchema(
  schemaRegistery: SchemaRegistry,
  name: string,
  schema: string
) {
  await schemaRegistery.createSchema(name, "n/a", "n/a", schema);
}
