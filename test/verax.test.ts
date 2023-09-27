import { veraxFixture } from "./fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { ReclaimPortal } from "../src/types";
import { ethers } from "hardhat";
import { registerSchema } from "./utils";
import { hashClaimInfo } from "@reclaimprotocol/crypto-sdk";

describe("Verax tests", () => {
  it("should attestation be done succesfully", async () => {
    const { superProofs, attestationRegistry, schemaRegistry, reclaimPortal } =
      await loadFixture(veraxFixture);
    const identity = new Identity();
    const member = identity.getCommitment().toString();

    await registerSchema(schemaRegistry, "uid-dob", "string dob");

    const schemaId = await schemaRegistry.getIdFromSchemaString("string dob");

    const AttestationRequest: ReclaimPortal.AttestationRequestStruct = {
      data: {
        proof: superProofs[0],
        _identityCommitment: member,
        expirationTime: 1,
      },
      schema: schemaId,
    };
    const tx = await reclaimPortal[
      "attest((bytes32,(((string,string,string),((bytes32,address,uint32,uint32),bytes[])),uint256,uint64)))"
    ](AttestationRequest);

    expect(tx).to.emit(attestationRegistry, "AttestationRegistered");
  });

  it("should fail to attest with subject or contextAddress is invalid error", async () => {
    const error = "subject or contextAddress is invalid";
    const { superProofs, attestationRegistry, schemaRegistry, reclaimPortal } =
      await loadFixture(veraxFixture);
    const identity = new Identity();
    const member = identity.getCommitment().toString();

    await registerSchema(schemaRegistry, "uid-dob", "string dob");

    const schemaId = await schemaRegistry.getIdFromSchemaString("string dob");

    const AttestationRequest: ReclaimPortal.AttestationRequestStruct = {
      data: {
        proof: superProofs[1],
        _identityCommitment: member,
        expirationTime: 1,
      },
      schema: schemaId,
    };
    const attestPromise =
      reclaimPortal[
        "attest((bytes32,(((string,string,string),((bytes32,address,uint32,uint32),bytes[])),uint256,uint64)))"
      ](AttestationRequest);

    expect(attestPromise).to.be.revertedWith(error);
  });
});
