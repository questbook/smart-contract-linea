// import { Contract } from "ethers";
// import { useCallback } from "react";
// import RECLAIM_PORTAL from "../../contract-artifacts/ReclaimPortal.json";
// import { type WalletClient, useWalletClient, useAccount } from "wagmi";
// import { getWalletClient } from "wagmi/actions";
// import * as React from "react";

// export function walletClientToSigner(walletClient: WalletClient) {
//   console.log("wallet", walletClient);
//   const { account, chain, transport } = walletClient;

//   const provider = new providers.JsonRpcProvider(
//     `https://opt-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
//   );
//   const signer = provider.getSigner(account.address);
//   return signer;
// }

// export default function useReclaimPortal() {
//   const { address, isConnected } = useAccount();
//   if (!address) return { attest: () => {} };
//   const provider = new providers.JsonRpcProvider(
//     `https://opt-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
//   );
//   console.log(process.env.RECLAIM_PORTAL_CONTRACT_ADDRESS);

//   const attest = useCallback(async (proof: any, idCommitement: any) => {
//     const walletClient = await getWalletClient();
//     const reclaimPortal = new Contract(
//       process.env.NEXT_PUBLIC_RECLAIM_PORTAL_CONTRACT_ADDRESS!,
//       RECLAIM_PORTAL.abi,
//       walletClientToSigner(walletClient!)
//     );

//     const AttestationRequest = {
//       data: {
//         proof,
//         _identityCommitment: idCommitement,
//         expirationTime: 1,
//       },
//       schema:
//         "0xd6e6a35ddb2b667deda0a9b84a791be2b359da1b2ab9b2bc411996b11866c23d",
//     };
//     const res = await reclaimPortal[
//       "attest((bytes32,(((string,string,string),((bytes32,address,uint32,uint32),bytes[])),uint256,uint64)))"
//     ](AttestationRequest);
//     console.log(res);
//   }, []);

//   return {
//     attest,
//   };
// }
