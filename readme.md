# Reclaim Smart Contract

EVM smart contract that enables minting of credentials on-chain through a network of oracles.

## Setup

1. CD to `./path/to/reclaim/smart-contract`
2. Run `npm install`
3. To test, `npm run test`

## Commands

- `NETWORK={network} npx hardhat deploy` to deploy the Reclaim contract to a chain. `{network}` is the chain, for example, "eth-goerli" or "polygon-mainnet"
- `NETWORK={network} npx hardhat upgrade --address {proxy address of the Reclaim contract}` to upgrade the contract
- `NETWORK={network} hardhat whitelist-oracle --address {witness-address} ` to whitelist an oracle.
- `NETWORK={network} hardhat add-witness --address {witness-address} --host {oracle-host}` to add an oracle

  - Note: `{oracle-host}` must be the gRPC Web hostname of the oracle

- `npm run prettier` to lint your solidity files

## Flow

1. Witnesses register using the `addAswitness` function (Only owner or the whitelisted wallet can add an witness).
2. Owner will create groups that users can interact with using semaphore protocol. (Group can be related to dapp, community, specific purpose)
3. Once the user obtains the signatures from all Witnesses, they finally have the proof that they can verify.
4. User now will call `merkelizeUser`, then pass `groupId` and `superProof`, which in turn will verify the proof and add the user as member to group using semaphore protocol
5. User will be able to `verifyMerkelIdentity`
