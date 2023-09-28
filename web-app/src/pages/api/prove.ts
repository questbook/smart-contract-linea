import { providers, Wallet } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  CompleteClaimData,
  ClaimInfo,
  createSignDataForClaim,
  fetchWitnessListForClaim,
  hashClaimInfo,
} from "@reclaimprotocol/crypto-sdk";

const witnesses = [
  {
    "0x4287329c9f1bde5E7619407e9a76779FE5F4F86E":
      "0xf9cbed4e93a8361b17c47825e9c7d86e9893c3a313104640ed1bec80e56a9318",
  },
  {
    "0x4eE6dbe8F2696c22E272E8B7836ba3f305e18Cc8":
      "0x041fe6ae6f5fd255a016ca2ad2b07a636f6f62cb51983ad2dace8de582a30d63",
  },
  {
    "0xEf30Ed3D685b6dcdEE94F8Bf42B6180b50fb8cdE":
      "0x01e78037aaa8c21842e728014ae714b59c630a5cfd8530389fab83e79b1a7ad5",
  },
  {
    "0x66950f356D1Bff53014CaC3f3A6ff555d2500874":
      "0xed3ccbbea0c591bedf7b912a105644b38d5edadb0526408974231373741765cc",
  },
  {
    "0xFC204a0B7F25d093689D14881cf5487B26Eb536e":
      "0xc79795e386bb0f5696fb263cec85904dfa7f801f19bb4500fc924b0f7065a81d",
  },
];

const createClaimData = (
  claimInfo: ClaimInfo,
  epoch: number,
  address: string,
  timestampS: number
): CompleteClaimData => {
  const infoHash = hashClaimInfo(claimInfo);
  return {
    identifier: infoHash,
    owner: address,
    timestampS,
    epoch: epoch,
  };
};

const generateSignatures = async (
  claimData: CompleteClaimData,
  wallets: Wallet[]
) => {
  const claimDataStr = createSignDataForClaim(claimData);
  const signatures = await Promise.all(
    wallets.map(async (w) => {
      return w.signMessage(claimDataStr);
    })
  );
  return signatures;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ethereumNetwork = process.env.DEFAULT_NETWORK;
  const infuraApiKey = process.env.INFURA_API_KEY;

  const providerWeb3 =
    ethereumNetwork === "localhost"
      ? new providers.JsonRpcProvider("http://127.0.0.1:8545")
      : new providers.InfuraProvider(ethereumNetwork, infuraApiKey);

  const witnessesWallets = [];
  for (let witness of witnesses) {
    let signerWallet = new Wallet(Object.values(witness)[0], providerWeb3);
    witnessesWallets.push(signerWallet);
  }

  try {
    const { provider, context, parameters, address } = req.body;
    const claimInfo: ClaimInfo = { provider, context, parameters };

    const completeClaimData = createClaimData(
      claimInfo,
      1,
      address,
      new Date().getTime()
    );

    const signatures = await generateSignatures(
      completeClaimData,
      witnessesWallets
    );

    const proof = {
      claimInfo: claimInfo,
      signedClaim: {
        signatures: signatures,
        claim: completeClaimData,
      },
    };

    console.log(proof);
    res.send(proof);
  } catch (error: any) {
    console.error(error);

    res.status(500).end();
  }
}
