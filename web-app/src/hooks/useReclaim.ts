// import { providers, Contract } from "ethers";
// import { useCallback } from "react";
// import RECLAIM from "../../contract-artifacts/Reclaim.json";
// import {
//   type WalletClient,
//   useWalletClient,
//   useAccount,
//   useContractWrite,
// } from "wagmi";
// import { getWalletClient, getContract } from "wagmi/actions";

// function walletClientToSigner(walletClient: WalletClient) {
//   console.log("wallet", walletClient);
//   const { account } = walletClient;

//   const provider = new providers.JsonRpcProvider(
//     `https://opt-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
//   );
//   const signer = provider.getSigner(account.address);
//   return signer;
// }

// export default function useReclaim() {
//   const { address } = useAccount();

//   //   const provider = new providers.JsonRpcProvider(
//   //     `https://opt-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
//   //   );

//   const merkelizeUser = useCallback(async (proof: any, idCommitement: any) => {
//     const walletClient = await getWalletClient();
//     const reclaim = new Contract(
//       process.env.NEXT_PUBLIC_RECLAIM_CONTRACT_ADDRESS!,
//       RECLAIM.abi,
//       walletClientToSigner(walletClient!)
//     );
//     console.log(process.env.NEXT_PUBLIC_RECLAIM_CONTRACT_ADDRESS!);
//     console.log("Reclaim Address", reclaim.address);

//     const proofReq = {
//       claimInfo: {
//         provider: proof.provider,
//         context: proof.context,
//         parameters: proof.parameters,
//       },
//       signedClaim: {
//         signatures: proof.signatures,
//         claim: {
//           identifier: proof.identifier,
//           owner: proof.ownerPublicKey,
//           timestampS: proof.timestampS,
//           epoch: proof.epoch,
//         },
//       },
//     };

//     console.log("parsed proof => ", proofReq);
//     const res = await reclaim.merkelizeUser(proofReq, idCommitement);
//     console.log(res);
//     return res;
//   }, []);

//   return {
//     merkelizeUser,
//   };
// }
