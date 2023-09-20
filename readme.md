# Reclaim Smart Contract

EVM smart contract that enables minting of credentials on-chain through a network of oracles.

## Setup

1. CD to `./path/to/reclaim/smart-contract`
2. Run `npm install`
3. To test, `npm run test`

## Commands

- `NETWORK={network} npx hardhat deploy` to deploy the Reclaim contract to a chain. `{network}` is the chain, for example, "eth-goerli" or "polygon-mainnet"
- `NETWORK={network} npx hardhat upgrade --address {proxy address of the Reclaim contract}` to upgrade the contract
- `NETWORK={network} hardhat whitelist-oracle --address {oracle-address} ` to whitelist an oracle.
- `NETWORK={network} hardhat add-oracle --address {oracle-address} --host {oracle-host}` to add an oracle
	- Note: `{oracle-host}` must be the gRPC Web hostname of the oracle

- `npm run prettier` to lint your solidity files

## Flow

1. Oracles register themselves using the `addAsOracle` function
2. Users create a "mint request" & pay the requisite fees for the mint using the `requestCredentialMint` function. 
	- Here, N oracles are randomly assigned to the task, and the hostnames of the oracles are returned to the user.
	- A unique request ID is also returned. This request ID becomes the ID of the credential once the mint is complete
	- The user must prove access to the credential, to each of the oracles using the Reclaim protocol. Each oracle will then sign the credential claim data & return the signature
3. Once the user obtains the signatures from all Oracles, they finally mint the credential by submitted aforementioned signatures to the smart contract using `finaliseCredentialMint`
4. That's it! Users can now query credentials from any on-chain or off-chain data source.
	- Eg. of on-chain query
	``` solidity
	function checkIfUserHasEmail(uint256 credentialId) external {
		Reclaim reclaim = Reclaim(RECLAIM_CONTRACT_ADDR)
		(
			string memory _application,
			string memory _jsonParams,
			address identity,
			uint32 timestampS,
		) = credSc.mintedCredentials(credentialId);
		require(_application == "google-login", "Not valid!");
		require(_jsonParams == '{"emailAddress":"abcd@creatoros.co"}', "Not valid!");
		// proceed further...
	} 
	```
