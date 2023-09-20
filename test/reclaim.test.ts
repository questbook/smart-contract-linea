import {
  CompleteClaimData,
  createSignDataForClaim,
  fetchWitnessListForClaim,
  hashClaimInfo,
} from "@reclaimprotocol/crypto-sdk";
// import { generateProof } from "@semaphore-protocol/proof";
import { expect } from "chai";
import { Wallet, utils } from "ethers";
import { Reclaim } from "../src/types";
import { deployReclaimContract, randomEthAddress, randomWallet } from "./utils";

const NUM_WITNESSES = 5;
const MOCK_HOST_PREFIX = "localhost:555";

describe("Reclaim Tests", () => {
  let contract: Reclaim;

  let witnesses: { wallet: Wallet; host: string }[] = [];

  beforeEach(async () => {
    contract = await deployReclaimContract();

    witnesses = [];
    for (let i = 0; i < NUM_WITNESSES; i++) {
      const witness = await randomWallet();
      const host = MOCK_HOST_PREFIX + i.toString();
      await contract.updateWitnessWhitelist(witness.address, true);
      await contract.connect(witness).addAsWitness(witness.address, host);
      witnesses.push({ wallet: witness, host });
    }
  });

  it("should fail to execute admin functions if not owner", async () => {
    const NOT_OWNER_MSG = "Ownable: caller is not the owner";
    const user = await randomWallet();
    contract = await contract.connect(user);

    const expectedRejections = [
      () => contract.updateWitnessWhitelist(randomEthAddress(), true),
      () => contract.createGroup(1, 2),
    ];

    for (const reject of expectedRejections) {
      await expect(reject()).to.be.revertedWith(NOT_OWNER_MSG);
    }
  });

  it("should insert some epochs", async () => {
    const currentEpoch = await contract.currentEpoch();
    for (let i = 1; i < 5; i++) {
      const tx = await contract.addNewEpoch();
      await tx.wait();
      // current epoch
      const epoch = await contract.fetchEpoch(0);
      expect(epoch.id).to.be.eq(currentEpoch + i);
      expect(epoch.witnesses).to.have.length(NUM_WITNESSES);
      expect(epoch.timestampStart).to.be.gt(0);

      const epochById = await contract.fetchEpoch(epoch.id);
      expect(epochById.id).to.be.eq(epoch.id);
    }
  });

  describe("Proofs tests", async () => {
    let superProofs;
    let user;
    beforeEach(async () => {
      user = await randomWallet();
      const provider = "uidai-dob";
      const parameters = '{"dob":"0000-00-00"}';
      const context = randomEthAddress() + "some-application-specific-context";

      const claimInfo = { provider, parameters, context };
      const infoHash = hashClaimInfo(claimInfo);

      await contract.addNewEpoch();
      const currentEpoch = await contract.currentEpoch();

      const timestampS = Math.floor(Date.now() / 1000);

      const claimData: CompleteClaimData = {
        identifier: infoHash,
        owner: user.address,
        timestampS,
        epoch: currentEpoch,
      };

      const claimDataStr = createSignDataForClaim(claimData);
      const signatures = await Promise.all(
        witnesses.map((w) => w.wallet.signMessage(claimDataStr))
      );

      superProofs = [
        {
          claimInfo,
          signedClaim: {
            signatures,
            claim: claimData,
          },
        },
        {
          claimInfo,
          signedClaim: {
            signatures,
            claim: claimData,
          },
        },
      ];
    });

    it("should verify a claim", async () => {
      await contract.connect(user).verifyProof(superProofs[1]);
    });

    it("should return the provider name from the proof", async () => {
      const result = await contract.getProviderFromProof(superProofs[0]);
      expect(result).to.equal(superProofs[0].claimInfo.provider);
    });

    it("should return the context message from the proof", async () => {
      const result = await contract.getContextMessageFromProof(superProofs[0]);
      let context = superProofs[0].claimInfo.context as string;
      expect(result).to.equal(context.substring(42, context.length));
    });

    it("should return the context address from the proof", async () => {
      const result = await contract.getContextAddressFromProof(superProofs[0]);
      let context = superProofs[0].claimInfo.context as string;
      expect(result).to.equal(context.substring(0, 42));
    });
  });
});

describe("Reclaim Witness Fetch Tests", () => {
  const NUM_WITNESSES = 15;

  let contract: Reclaim;
  let witnesses: { wallet: Wallet; host: string }[] = [];

  beforeEach(async () => {
    contract = await deployReclaimContract();

    witnesses = [];
    for (let i = 0; i < NUM_WITNESSES; i++) {
      const witness = await randomWallet();
      const host = MOCK_HOST_PREFIX + i.toString();
      await contract.updateWitnessWhitelist(witness.address, true);
      await contract.connect(witness).addAsWitness(witness.address, host);
      witnesses.push({ wallet: witness, host });
    }
  });

  // check TS & solidity implementations match
  it("match fetchWitnessList implementation for claim", async () => {
    await contract.addNewEpoch();
    const currentEpoch = await contract.fetchEpoch(0);

    const identifier = hashClaimInfo({
      parameters: "1234",
      provider: "test",
      context: "test",
    });

    const timestampS = Math.floor(Date.now() / 1000);

    const witnessesTs = await fetchWitnessListForClaim(
      {
        epoch: currentEpoch.id,
        witnesses: currentEpoch.witnesses.map((w) => ({
          id: w.addr,
          url: w.host,
        })),
        witnessesRequiredForClaim:
          currentEpoch.minimumWitnessesForClaimCreation,
        nextEpochTimestampS: 0,
      },
      identifier,
      timestampS
    );

    const witnessesContract = await contract.fetchWitnessesForClaim(
      currentEpoch.id,
      identifier,
      timestampS
    );

    const witnessesContractHosts = witnessesContract.length;
    for (let i = 0; i < witnessesContractHosts; i++) {
      expect(witnessesContract[i].host.toLowerCase()).to.equal(
        witnessesTs[i].url.toLowerCase()
      );
    }
  });
});
