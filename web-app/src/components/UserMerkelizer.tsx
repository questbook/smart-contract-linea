import { Identity } from "@semaphore-protocol/identity";
import { useAccount } from "wagmi";
import { useContractWrite, usePrepareContractWrite } from "wagmi";
import RECLAIM from "../../contract-artifacts/Reclaim.json";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function UserMerkelizer({ proofObj }: any) {
  const { address } = useAccount();

  const [identity, setIdentity] = useState<Identity>();
  const [isPrepared, setIsPrepared] = useState(false);

  useEffect(() => {
    if (!identity) {
      const newIdentity = new Identity(address);
      setIdentity(newIdentity);
      console.log("Generated new identity: ", newIdentity);
    }
  }, [identity]);

  const proofReq = {
    claimInfo: {
      provider: proofObj.provider,
      context: proofObj.context,
      parameters: proofObj.parameters,
    },
    signedClaim: {
      signatures: proofObj.signatures,
      claim: {
        identifier: proofObj.identifier,
        owner: ethers.computeAddress(`0x${proofObj.ownerPublicKey}`),
        timestampS: proofObj.timestampS,
        epoch: proofObj.epoch,
      },
    },
  };

  const { config } = usePrepareContractWrite({
    enabled: !!identity,
    // @ts-expect-error events
    address: process.env.NEXT_PUBLIC_RECLAIM_CONTRACT_ADDRESS!,
    abi: RECLAIM.abi,
    functionName: "merkelizeUser",
    args: [proofReq, identity?.commitment.toString()],
    chainId: 420,
    onSuccess(data) {
      console.log("Successful - register prepare: ", data);
      setIsPrepared(true);
    },
    onError(error) {
      console.log("Error in verify Proof: ", error);
    },
  });

  const contractWrite = useContractWrite(config);
  return (
    <>
      {!contractWrite.isSuccess && (
        <div className="button-container">
          <button
            className="glow-on-hover"
            onClick={() => {
              contractWrite.write?.();
            }}
            disabled={
              contractWrite.isLoading || contractWrite.isSuccess || !isPrepared
            }
          >
            Verify Reclaim Proof &
            <br />
            Register Semaphore Identity
          </button>
          {contractWrite.isLoading && <div className="loading-spinner" />}
        </div>
      )}
    </>
  );
}
