# Reclaim Smart Contract

EVM smart contract that enables minting of credentials on-chain through a network of oracles and semaphore.

## Setup

1. Run `npm install --legacy-peer-deps`
2. To test, `npm run test`

## Contracts Addresses

### Optimism Goerli

| Contract              | Address                                    |
|-----------------------|--------------------------------------------|
| Reclaim               | 0xCc08210D8f15323104A629a925E4cc59D0fa2Fe1 |
| Semaphore             | 0xACE04E6DeB9567C1B8F37D113F2Da9E690Fc128d |
| SemaphoreVerifier     | 0x93a9d327836A5279E835EF3147ac1fb54FBd726B |

### Linea Testnet

| Contract              | Address                                    |
|-----------------------|--------------------------------------------|
| Reclaim               | 0xf223E215B2c9A2E5FE1B2971d5694684b2E734C1 |
| Semaphore             | 0xd9692F91DC89f14f4211fa07aD2Bd1E9aD99D953 |
| SemaphoreVerifier     | 0xD594971cea3fb43Dd3d2De87C216ac2aCE320fc2 |


## Commands

- `NETWORK={network} npx hardhat deploy` to deploy the Reclaim contract to a chain. `{network}` is the chain, for example, "eth-goerli" or "polygon-mainnet"
- `NETWORK={network} npx hardhat upgrade --address {proxy address of the Reclaim contract}` to upgrade the contract

- `npm run prettier` to lint your solidity files



# Dapp Integration with Reclaim Tutorial

## Introduction

This tutorial will guide you through the process of integrating a Dapp with Reclaim using Solidity and Ether.js. The integration involves verifying user claims and completing actions based on the user's identity.

## Prerequisites

Before you begin, make sure you have the following:

- Dapp ready with client app and smart contract
- Ether.js library to register dapp in reclaim contract

## Sequence Diagram

![Sequence Diagram](./docs/dapp-reclaim-integration.svg
)

## Steps

1. **Dapp Creation**

    - Dapp communicates with the Reclaim Contract to create a new Dapp using the `createDapp(uint256 externalNullifier)` function.
    - The Reclaim Contract emits a `DappCreated` event with the Dapp's unique identifier (dappId).
    - Dapp captures the dappId from the event.

2. **Claim Verification**

    - Reclaim Wallet verifies a claim using the Reclaim Wallet.
    - Reclaim Wallet returns a signed claim (proof) to the Dapp.

3. **Merkelize User**
	- The MerkelizeUser function on the Reclaim Contract serves as a critical part of this verification process. Meaning that in order to verify the identity later, the user needs to be merkelized or in other word "member of semaphore group(part of merkle tree)"
    - Dapp calls `MerkelizeUser(proof, idCommitment)` on the Reclaim Contract.
    - The Reclaim Contract calls `addMember(groupId, idCommitment)` on Semaphore, another participant.
  -  Semaphore emits a `MemberAdded` event.

4. **Semaphore Proof Generation**

    - Semaphore SDK generates a Semaphore proof.

5. **Verify User Identity**

    - Dapp verifies the user's identity using the Semaphore proof.
    - If verification is successful, Dapp can proceed with actions like airdrops.

6. **Completing the Action**

    - Dapp Smart Contract calls `airDrop()` or any other relevant action.
    - Dapp Smart Contract verifies the user's identity with the Reclaim Contract using `verifyMerkleIdentity(semaphoreProof, dappId, externalNullifier)`.
    - The Reclaim Contract verifies the proof with Semaphore using `verifyProof`.
    - If successful, the Reclaim Contract completes the action and emits a `ProofVerified` event.
    - Dapp Smart Contract completes the airdrop action successfully.



## Notes

1. GroupId is calculated from the provider string:

```
function calculateGroupIdFromProvider(
		string memory provider
	) internal pure returns (uint256) {
		bytes memory providerBytes = bytes(provider);
		bytes memory hashedProvider = abi.encodePacked(keccak256(providerBytes));
		uint256 groupId = BytesUtils.bytesToUInt(hashedProvider, 32);
		return groupId;
	}
```
