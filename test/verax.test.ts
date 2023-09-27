import { veraxFixture } from "./fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { ReclaimPortal } from "../src/types";

describe("Verax tests", () => {
  it("should attestation be done succesfully", async () => {
    const {
      //   contract,
      //   witnesses,
      owner,
      //   user,
      superProofs,
      //   semaphore,
      //   router,
      //   attestationRegistry,
      //   moduleRegistry,
      //   portalRegistry,
      //   schemaRegistry,
      reclaimPortal,
      schemaId,
      //   userMerkelizerModule,
    } = await loadFixture(veraxFixture);
    const identity = new Identity();
    const member = identity.getCommitment().toString();

    superProofs[0].claimInfo.context = owner + superProofs[0].claimInfo.context;
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

    console.dir(tx, { depth: null });
  });
});
