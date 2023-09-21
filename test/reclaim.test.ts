import {
  CompleteClaimData,
  createSignDataForClaim,
  fetchWitnessListForClaim,
  hashClaimInfo,
} from "@reclaimprotocol/crypto-sdk";

import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";
import { expect } from "chai";
import { Wallet, utils } from "ethers";
import { Reclaim, Semaphore } from "../src/types";
import { deployReclaimContract, randomEthAddress, randomWallet } from "./utils";
import { ethers, network, run } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SemaphoreEthers } from "@semaphore-protocol/data";

const NUM_WITNESSES = 5;
const MOCK_HOST_PREFIX = "localhost:555";

describe("Reclaim Tests", () => {
  async function deployFixture() {
    let owner: SignerWithAddress = await ethers.getSigners()[0];
    const { semaphore } = await run("deploy:semaphore");
    let contract: Reclaim = await deployReclaimContract(semaphore, owner);
    let witnesses: { wallet: Wallet; host: string }[] = [];
    for (let i = 0; i < NUM_WITNESSES; i++) {
      const witness = await randomWallet();
      const host = MOCK_HOST_PREFIX + i.toString();
      await contract.updateWitnessWhitelist(witness.address, true);
      await contract.connect(witness).addAsWitness(witness.address, host);
      witnesses.push({ wallet: witness, host });
    }
    return { contract, witnesses, owner, semaphore };
  }

  it("should fail to execute admin functions if not owner", async () => {
    let { contract } = await loadFixture(deployFixture);
    const NOT_OWNER_MSG = "Ownable: caller is not the owner";
    const user = await randomWallet();
    contract = await contract.connect(user);

    const expectedRejections = [
      () => contract.updateWitnessWhitelist(randomEthAddress(), true),
      () => contract.createGroup("test", 2),
    ];
    for (const reject of expectedRejections) {
      expect(reject()).to.be.revertedWith(NOT_OWNER_MSG);
    }
  });

  it("should insert some epochs", async () => {
    let { contract } = await loadFixture(deployFixture);
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

  it("emit an event after creating a group", async () => {
    let { contract } = await loadFixture(deployFixture);
    expect(await contract.createGroup("test", 18)).to.emit(
      contract,
      "GroupCreated"
    );
  });

  describe("Proofs tests", async () => {
    async function proofsFixture() {
      let { contract, witnesses, owner, semaphore } = await loadFixture(
        deployFixture
      );
      let superProofs;
      let user = await randomWallet(40);
      const provider = "uid-dob";
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
      return { contract, witnesses, owner, user, superProofs, semaphore };
    }

    it("should verify a claim", async () => {
      let { contract, user, superProofs } = await loadFixture(proofsFixture);
      await contract.connect(user).verifyProof(superProofs[1]);
    });

    it("should return the provider name from the proof", async () => {
      let { contract, superProofs } = await loadFixture(proofsFixture);
      const result = await contract.getProviderFromProof(superProofs[0]);
      expect(result).to.equal(superProofs[0].claimInfo.provider);
    });

    it("should return the context message from the proof", async () => {
      let { contract, superProofs } = await loadFixture(proofsFixture);
      const result = await contract.getContextMessageFromProof(superProofs[0]);
      let context = superProofs[0].claimInfo.context as string;
      expect(result).to.equal(context.substring(42, context.length));
    });

    it("should return the context address from the proof", async () => {
      let { contract, superProofs } = await loadFixture(proofsFixture);
      const result = await contract.getContextAddressFromProof(superProofs[0]);
      let context = superProofs[0].claimInfo.context as string;
      expect(result).to.equal(context.substring(0, 42));
    });

    it("should return the context address from the proof", async () => {
      let { contract, superProofs } = await loadFixture(proofsFixture);
      const result = await contract.getContextAddressFromProof(superProofs[0]);
      let context = superProofs[0].claimInfo.context as string;
      expect(result).to.equal(context.substring(0, 42));
    });

    it("should create unique groupId for each provider", async () => {
      let { contract } = await loadFixture(proofsFixture);
      const providersMock = ["google-account", "github-cred", "account-google"];
      const groupIds: Set<Number> = new Set();
      for (let provider of providersMock) {
        const txReceipt = await (
          await contract.createGroup(provider, 18)
        ).wait();
        if (
          txReceipt.events !== undefined &&
          txReceipt.events[2].args !== undefined
        ) {
          groupIds.add(txReceipt.events[2].args[0].toNumber());
        }
      }
      expect(providersMock.length).to.equal(groupIds.size);
    });

    it("should contract be admin, merkelize the user and verify merkle identity", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );

      // SemaphoreEthers obj to ease querying data from semaphore
      const semaphoreEthers = new SemaphoreEthers("http://localhost:8545", {
        address: semaphore.address,
      });
      // init two identities
      const identity = new Identity();
      const identitySec = new Identity();

      const member = identity.getCommitment().toString();
      const memberSec = identitySec.getCommitment().toString();

      // Creating group and add member through recalim
      const tx = await contract.createGroup(
        superProofs[1].claimInfo.provider,
        20
      );
      const txReceipt = await tx.wait(1);

      await contract.merkelizeUser(superProofs[1], member);
      await contract.merkelizeUser(superProofs[0], memberSec);

      // get groupId from events
      let groupId;
      if (
        txReceipt.events !== undefined &&
        txReceipt.events[2].args !== undefined
      ) {
        groupId = txReceipt.events[2].args[0].toString();
      }

      let group = new Group(groupId);
      group.addMember(member);

      const admin = await semaphoreEthers.getGroupAdmin(groupId);
      const memberFromSemaphore = await semaphoreEthers.getGroupMembers(
        groupId
      );

      expect(memberFromSemaphore[0]).to.equal(member);
      expect(contract.address).to.equal(admin);

      const signal = utils.formatBytes32String("Hellox");
      const fullProof = await generateProof(identity, group, groupId, signal, {
        zkeyFilePath: "./resources/semaphore.zkey",
        wasmFilePath: "./resources/semaphore.wasm",
      });

      const semaphoreTransaction = await contract.verifyMerkelIdentity(
        groupId,
        fullProof.merkleTreeRoot,
        fullProof.signal,
        fullProof.nullifierHash,
        fullProof.externalNullifier,
        fullProof.proof
      );
      await expect(semaphoreTransaction)
        .to.emit(semaphore, "ProofVerified")
        .withArgs(
          groupId,
          fullProof.merkleTreeRoot,
          fullProof.nullifierHash,
          groupId,
          fullProof.signal
        );
    });
  });
});

describe("Reclaim Witness Fetch Tests", () => {
  const NUM_WITNESSES = 15;

  let contract: Reclaim;
  let witnesses: { wallet: Wallet; host: string }[] = [];

  beforeEach(async () => {
    const { semaphore } = await run("deploy:semaphore");
    contract = await deployReclaimContract(semaphore);

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
