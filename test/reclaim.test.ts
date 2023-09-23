import {
  CompleteClaimData,
  createSignDataForClaim,
  fetchWitnessListForClaim,
  hashClaimInfo,
} from "@reclaimprotocol/crypto-sdk";

import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";
import { expect, use } from "chai";
import { Wallet, utils } from "ethers";
import { Reclaim, Semaphore } from "../src/types";
import {
  deployReclaimContract,
  generateMockWitnessesList,
  randomEthAddress,
  randomWallet,
  randomiseWitnessList,
} from "./utils";
import { ethers, network, run } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SemaphoreEthers } from "@semaphore-protocol/data";
import { randomBytes } from "crypto";

describe("Reclaim Tests", () => {
  const NUM_WITNESSES = 5;
  const MOCK_HOST_PREFIX = "localhost:555";

  async function deployFixture() {
    let owner: SignerWithAddress = await ethers.getSigners()[0];
    const { semaphore } = await run("deploy:semaphore", { logs: false });
    let contract: Reclaim = await deployReclaimContract(semaphore, owner);
    let { mockWitnesses, witnessesWallets } = await generateMockWitnessesList(
      NUM_WITNESSES,
      MOCK_HOST_PREFIX
    );
    let witnesses = await randomiseWitnessList(mockWitnesses);
    return { contract, witnesses, owner, semaphore, witnessesWallets };
  }

  it("should fail to execute admin functions if not owner", async () => {
    let { contract, witnesses } = await loadFixture(deployFixture);
    const NOT_OWNER_MSG = "Ownable: caller is not the owner";
    const user = await randomWallet();
    contract = await contract.connect(user);

    const expectedRejections = [() => contract.addNewEpoch(witnesses, 5)];
    for (const reject of expectedRejections) {
      expect(reject()).to.be.revertedWith(NOT_OWNER_MSG);
    }
  });

  it("should insert some epochs", async () => {
    let { contract, witnesses } = await loadFixture(deployFixture);
    const currentEpoch = await contract.currentEpoch();
    for (let i = 1; i < 5; i++) {
      const tx = await contract.addNewEpoch(witnesses, 5);
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

  it("should fail to create group with Reclaim__GroupAlreadyExists error", async () => {
    let { contract } = await loadFixture(deployFixture);
    expect(await contract.createGroup("test", 18)).to.emit(
      contract,
      "GroupCreated"
    );

    expect(contract.createGroup("test", 18)).to.be.revertedWith(
      "Reclaim__GroupAlreadyExists"
    );
  });
  describe("Proofs tests", async () => {
    async function proofsFixture() {
      let { contract, witnesses, owner, semaphore, witnessesWallets } =
        await loadFixture(deployFixture);

      let superProofs;
      let user = await randomWallet(40);
      await contract.addNewEpoch(witnesses, 5);
      const currentEpoch = await contract.currentEpoch();
      const timestampS = Math.floor(Date.now() / 1000);

      const createClaimInfo = () => {
        const provider = "uid-dob";
        const parameters = '{"dob":"0000-00-00"}';
        const context =
          randomEthAddress() + "some-application-specific-context";
        return { provider, parameters, context };
      };

      const createClaimData = (
        claimInfo,
        epoch,
        address,
        timestampS
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
        witnesses,
        witnessesWallets
      ) => {
        const claimDataStr = createSignDataForClaim(claimData);
        const signatures = await Promise.all(
          witnesses.map(async (w) => {
            const addr = await w.addr;
            return witnessesWallets[addr].signMessage(claimDataStr);
          })
        );
        return signatures;
      };

      const claimInfos = await Promise.all([
        createClaimInfo(),
        createClaimInfo(),
      ]);

      const claimDatas = await Promise.all([
        createClaimData(claimInfos[0], currentEpoch, user.address, timestampS),
        createClaimData(claimInfos[1], currentEpoch, user.address, timestampS),
      ]);

      const signatureForEachClaim = await Promise.all([
        generateSignatures(claimDatas[0], witnesses, witnessesWallets),
        generateSignatures(claimDatas[1], witnesses, witnessesWallets),
      ]);
      superProofs = [
        {
          claimInfo: claimInfos[0],
          signedClaim: {
            signatures: signatureForEachClaim[0],
            claim: claimDatas[0],
          },
        },
        {
          claimInfo: claimInfos[1],
          signedClaim: {
            signatures: signatureForEachClaim[1],
            claim: claimDatas[1],
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
      let { contract, superProofs, semaphore, witnesses } = await loadFixture(
        proofsFixture
      );
      // SemaphoreEthers obj to ease querying data from semaphore
      const semaphoreEthers = new SemaphoreEthers("http://localhost:8545", {
        address: semaphore.address,
      });
      // init two identities
      const identity = new Identity();

      const member = identity.getCommitment().toString();

      // Creating group and add member through recalim
      const tx = await contract.createGroup(
        superProofs[1].claimInfo.provider,
        20
      );
      const txReceipt = await tx.wait(1);

      const txMerkelizeFirstUser = await contract.merkelizeUser(
        superProofs[1],
        member
      );

      await txMerkelizeFirstUser.wait();
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

    it("should merkelize user and create group in one call", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );
      const identity = new Identity();
      const member = identity.getCommitment().toString();
      const tx = await contract.merkelizeUser(superProofs[1], member);
      expect(tx).to.emit(contract, "GroupCreated");
    });

    it("should fail to merkelize the user twice with UserAlreadyMerkelized error", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );
      const identity = new Identity();
      const member = identity.getCommitment().toString();
      const tx = await contract.merkelizeUser(superProofs[1], member);

      await expect(
        contract.merkelizeUser(superProofs[1], member)
      ).to.be.revertedWithCustomError(
        contract,
        "Reclaim__UserAlreadyMerkelized"
      );
    });

    it("should fail to merkelize user with no signatures error", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );
      const identity = new Identity();

      const member = identity.getCommitment().toString();

      await contract.createGroup(superProofs[1].claimInfo.provider, 20);

      superProofs[1].signedClaim.signatures = [];

      expect(contract.merkelizeUser(superProofs[1], member)).to.be.revertedWith(
        "No signatures"
      );
    });

    it("should fail to merkelize user with number of signatures not equal to number of witnesses error", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );
      const identity = new Identity();

      const member = identity.getCommitment().toString();

      await contract.createGroup(superProofs[1].claimInfo.provider, 20);

      superProofs[1].signedClaim.signatures.pop();

      expect(contract.merkelizeUser(superProofs[1], member)).to.be.revertedWith(
        "Number of signatures not equal to number of witnesses"
      );
    });

    it("should fail to merkelize user with signatures not appropriate error", async () => {
      let { contract, superProofs, semaphore } = await loadFixture(
        proofsFixture
      );
      const identity = new Identity();

      const member = identity.getCommitment().toString();

      await contract.createGroup(superProofs[1].claimInfo.provider, 20);

      superProofs[1].signedClaim.signatures.pop();
      superProofs[1].signedClaim.signatures = [
        randomBytes(12),
        ...superProofs[1].signedClaim.signatures,
      ];

      expect(contract.merkelizeUser(superProofs[1], member)).to.be.revertedWith(
        "Signature not appropriate"
      );
    });
  });
});

describe("Reclaim Witness Fetch Tests", () => {
  const NUM_WITNESSES = 15;
  const MOCK_HOST_PREFIX = "localhost:555";
  let contract: Reclaim;
  let witnesses: Reclaim.WitnessStruct[] = [];

  beforeEach(async () => {
    const { semaphore } = await run("deploy:semaphore", {
      logs: false,
    });

    contract = await deployReclaimContract(semaphore);
    let { mockWitnesses } = await generateMockWitnessesList(
      NUM_WITNESSES,
      MOCK_HOST_PREFIX
    );
    witnesses = await randomiseWitnessList(mockWitnesses);
  });

  // check TS & solidity implementations match
  it("match fetchWitnessList implementation for claim", async () => {
    await contract.addNewEpoch(witnesses, 5);
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
