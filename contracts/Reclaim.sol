// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./lib/SemaphoreInterface.sol";
import "./lib/Claims.sol";
import "./lib/Random.sol";
import "./lib/StringUtils.sol";
import "./lib/BytesUtils.sol";

/**
 * Reclaim Beacon contract
 */
contract Reclaim is Initializable, UUPSUpgradeable, OwnableUpgradeable {
	struct Witness {
		/** ETH address of the witness */
		address addr;
		/** Host to connect to the witness */
		string host;
	}

	struct Epoch {
		/** Epoch number */
		uint32 id;
		/** when the epoch changed */
		uint32 timestampStart;
		/** when the epoch will change */
		uint32 timestampEnd;
		/** Witnesses for this epoch */
		Witness[] witnesses;
		/**
		 * Minimum number of witnesses
		 * required to create a claim
		 * */
		uint8 minimumWitnessesForClaimCreation;
	}

	struct SuperProof {
		Claims.ClaimInfo claimInfo;
		Claims.SignedClaim signedClaim;
	}

	/** list of all registered witnesses */
	Witness[] public witnesses;
	/** the minimum number of witnesses required to create a claim */
	uint8 public minimumWitnessesForClaimCreation;
	/** whitelist of addresses that can become witnesses */
	mapping(address => bool) private witnessWhitelistMap;
	/** list of all epochs */
	Epoch[] public epochs;

	/** address of the semaphore contract */
	address public semaphoreAddress;

	/**
	 * duration of each epoch.
	 * is not a hard duration, but useful for
	 * caching purposes
	 * */
	uint32 public epochDurationS; // 1 day
	/**
	 * current epoch.
	 * starts at 1, so that the first epoch is 1
	 * */
	uint32 public currentEpoch;

	event EpochAdded(Epoch epoch);

	/**
	 * @notice Calls initialize on the base contracts
	 *
	 * @dev This acts as a constructor for the upgradeable proxy contract
	 */
	function initialize(address _semaphoreAddress) external initializer {
		__Ownable_init();
		minimumWitnessesForClaimCreation = 5;
		epochDurationS = 1 days;
		currentEpoch = 0;
		semaphoreAddress = _semaphoreAddress;
	}

	/**
	 * @notice Override of UUPSUpgradeable virtual function
	 *
	 * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
	 * {upgradeTo} and {upgradeToAndCall}.
	 */
	function _authorizeUpgrade(address) internal view override onlyOwner {}

	// epoch functions ---

	/**
	 * Fetch an epoch
	 * @param epoch the epoch number to fetch;
	 * pass 0 to fetch the current epoch
	 */
	function fetchEpoch(uint32 epoch) public view returns (Epoch memory) {
		if (epoch == 0) {
			return epochs[epochs.length - 1];
		}
		return epochs[epoch - 1];
	}

	/**
	 * Get the witnesses that'll sign the claim
	 */
	function fetchWitnessesForClaim(
		uint32 epoch,
		bytes32 identifier,
		uint32 timestampS
	) public view returns (Witness[] memory) {
		Epoch memory epochData = fetchEpoch(epoch);
		bytes memory completeInput = abi.encodePacked(
			// hex encode bytes
			StringUtils.bytes2str(
				// convert bytes32 to bytes
				abi.encodePacked(identifier)
			),
			"\n",
			StringUtils.uint2str(epoch),
			"\n",
			StringUtils.uint2str(epochData.minimumWitnessesForClaimCreation),
			"\n",
			StringUtils.uint2str(timestampS)
		);
		bytes memory completeHash = abi.encodePacked(keccak256(completeInput));

		Witness[] memory witnessesLeftList = epochData.witnesses;
		Witness[] memory selectedWitnesses = new Witness[](
			epochData.minimumWitnessesForClaimCreation
		);
		uint witnessesLeft = witnessesLeftList.length;

		uint byteOffset = 0;
		for (uint32 i = 0; i < epochData.minimumWitnessesForClaimCreation; i++) {
			uint randomSeed = BytesUtils.bytesToUInt(completeHash, byteOffset);
			uint witnessIndex = randomSeed % witnessesLeft;
			selectedWitnesses[i] = witnessesLeftList[witnessIndex];
			// remove the witness from the list of witnesses
			// we've utilised witness at index "idx"
			// we of course don't want to pick the same witness twice
			// so we remove it from the list of witnesses
			// and reduce the number of witnesses left to pick from
			// since solidity doesn't support "pop()" in memory arrays
			// we swap the last element with the element we want to remove
			witnessesLeftList[witnessIndex] = epochData.witnesses[witnessesLeft - 1];
			byteOffset = (byteOffset + 4) % completeHash.length;
			witnessesLeft -= 1;
		}

		return selectedWitnesses;
	}

	/**
	 * Get the provider name from the proof
	 */
	function getProviderFromProof(
		SuperProof memory superProof
	) external pure returns (string memory) {
		return superProof.claimInfo.provider;
	}

	/**
	 * Get the context message from the proof
	 */
	function getContextMessageFromProof(
		SuperProof memory superProof
	) external pure returns (string memory) {
		string memory context = superProof.claimInfo.context;
		return StringUtils.substring(context, 42, bytes(context).length);
	}

	/**
	 * Get the context address from the proof
	 */
	function getContextAddressFromProof(
		SuperProof memory superProof
	) external pure returns (string memory) {
		string memory context = superProof.claimInfo.context;
		return StringUtils.substring(context, 0, 42);
	}

	/**
	 * Call the function to assert
	 * the validity of several claims proofs
	 */
	function verifyProof(SuperProof memory superProof) public view {
		// create signed claim using claimData and signature.
		require(superProof.signedClaim.signatures.length > 0, "No signatures");
		Claims.SignedClaim memory signed = Claims.SignedClaim(
			superProof.signedClaim.claim,
			superProof.signedClaim.signatures
		);

		// check if the hash from the claimInfo is equal to the infoHash in the claimData
		bytes32 hashed = Claims.hashClaimInfo(superProof.claimInfo);
		require(superProof.signedClaim.claim.identifier == hashed);

		// fetch witness list from fetchEpoch(_epoch).witnesses
		Witness[] memory expectedWitnesses = fetchWitnessesForClaim(
			superProof.signedClaim.claim.epoch,
			superProof.signedClaim.claim.identifier,
			superProof.signedClaim.claim.timestampS
		);
		address[] memory signedWitnesses = Claims.recoverSignersOfSignedClaim(signed);
		// check if the number of signatures is equal to the number of witnesses
		require(
			signedWitnesses.length == expectedWitnesses.length,
			"Number of signatures not equal to number of witnesses"
		);

		// Update awaited: more checks on whose signatures can be considered.
		for (uint256 i = 0; i < signed.signatures.length; i++) {
			bool found = false;
			for (uint j = 0; j < expectedWitnesses.length; j++) {
				if (signedWitnesses[i] == expectedWitnesses[j].addr) {
					found = true;
					break;
				}
			}
			require(found, "Signature not appropriate");
		}

		//@TODO: verify zkproof
	}

	function merkelizeUser(
		uint256 groupId,
		SuperProof memory superProof,
		uint256 _identityCommitment
	) external {
		verifyProof(superProof);
		SemaphoreInterface(semaphoreAddress).addMember(groupId, _identityCommitment);
	}

	function verifyMerkelIdentity(
		uint256 groupId,
		uint256 _merkleTreeRoot,
		uint256 _signal,
		uint256 _nullifierHash,
		uint256 _externalNullifier,
		uint256[8] calldata _proof
	) external {
		SemaphoreInterface(semaphoreAddress).verifyProof(
			groupId,
			_merkleTreeRoot,
			_signal,
			_nullifierHash,
			_externalNullifier,
			_proof
		);
	}

	/**
	 * @dev Add a new epoch
	 */
	function addNewEpoch() external onlyOwner {
		if (epochDurationS == 0) {
			epochDurationS = 1 days;
		}
		if (epochs.length > 0) {
			epochs[epochs.length - 1].timestampEnd = uint32(block.timestamp);
		}

		currentEpoch += 1;
		epochs.push(
			Epoch(
				currentEpoch,
				uint32(block.timestamp),
				uint32(block.timestamp + epochDurationS),
				randomiseWitnessList(currentEpoch),
				requisiteWitnessesForClaimCreate()
			)
		);
		emit EpochAdded(epochs[epochs.length - 1]);
	}

	// witness functions ---

	/**
	 * @dev Remove the sender from the list of witnesses
	 * @notice any pending requests with this witness will continue to be processed
	 * However, no new requests will be assigned to this witness
	 */
	function removeAsWitness(address witnessAddress) external {
		require(
			msg.sender == owner() || msg.sender == witnessAddress,
			"Only owner or witness can remove itself"
		);

		for (uint256 i = 0; i < witnesses.length; i++) {
			if (witnesses[i].addr == witnessAddress) {
				witnesses[i] = witnesses[witnesses.length - 1];
				witnesses.pop();
				return;
			}
		}

		revert("Not an witness");
	}

	/**
	 * @dev Add the given address as an witness to the list of witnesses
	 * @param witnessAddress address of the witness
	 * @param host host:port of the witness (must be grpc-web compatible)
	 */
	function addAsWitness(address witnessAddress, string calldata host) external {
		require(
			canAddAsWitness(witnessAddress) &&
				(msg.sender == owner() || witnessAddress == msg.sender),
			"Only owner or the whitelisted wallet can add an witness"
		);

		for (uint256 i = 0; i < witnesses.length; i++) {
			require(witnesses[i].addr != witnessAddress, "Witness already exists");
		}

		witnesses.push(Witness(witnessAddress, host));
	}

	// admin functions ---

	function createGroup(
		uint256 groupId,
		uint256 merkleTreeDepth // address admin
	) external onlyOwner {
		SemaphoreInterface(semaphoreAddress).createGroup(
			groupId,
			merkleTreeDepth,
			address(this)
		);
	}

	function updateWitnessWhitelist(address addr, bool isWhitelisted) external onlyOwner {
		if (isWhitelisted) {
			witnessWhitelistMap[addr] = true;
		} else {
			delete witnessWhitelistMap[addr];
		}
	}

	// internal code -----

	/**
	 * @dev Pick a random set of witnesses from the available list of witnesses
	 * @param witnessAddresses Array to store the addresses of the witnesses
	 * @return Array of the hosts of the witnesses
	 */
	function pickRandomWitnesses(
		address[] storage witnessAddresses,
		uint256 seed
	) internal returns (string[] memory) {
		require(
			witnessAddresses.length <= witnesses.length,
			"Internal Error, Not Enough Witnesses"
		);
		Witness[] memory tempWitnesses = witnesses;
		uint256 witnessesLeft = tempWitnesses.length;

		string[] memory witnessHosts = new string[](witnessAddresses.length);
		for (uint8 i = 0; i < witnessAddresses.length; i++) {
			uint256 idx = Random.random(seed + i) % witnessesLeft;
			witnessAddresses[i] = tempWitnesses[idx].addr;
			witnessHosts[i] = tempWitnesses[idx].host;

			// we've utilised witness at index "idx"
			// we of course don't want to pick the same witness twice
			// so we remove it from the list of witnesses
			// and reduce the number of witnesses left to pick from
			// since solidity doesn't support "pop()" in memory arrays
			// we swap the last element with the element we want to remove
			tempWitnesses[idx] = tempWitnesses[witnessesLeft - 1];
			witnessesLeft -= 1;
		}
		return witnessHosts;
	}

	/**
	 * @dev Randomises the list of witnesses
	 */
	function randomiseWitnessList(uint256 seed) internal view returns (Witness[] memory) {
		Witness[] memory tempWitnesses = witnesses;
		Witness[] memory result = new Witness[](witnesses.length);
		uint256 witnessesLeft = tempWitnesses.length;

		for (uint8 i = 0; i < witnesses.length; i++) {
			uint256 idx = Random.random(seed + i) % witnessesLeft;
			result[i] = tempWitnesses[idx];

			// we've utilised witness at index "idx"
			// we of course don't want to pick the same witness twice
			// so we remove it from the list of witnesses
			// and reduce the number of witnesses left to pick from
			// since solidity doesn't support "pop()" in memory arrays
			// we swap the last element with the element we want to remove
			tempWitnesses[idx] = tempWitnesses[witnessesLeft - 1];
			witnessesLeft -= 1;
		}
		return result;
	}

	/**
	 * @dev Get the number of witnesses required to create a claim
	 */
	function requisiteWitnessesForClaimCreate() internal view returns (uint8) {
		// at least N witnesses are required
		// or the number of witnesses registered, whichever is lower
		return uint8(Math.min(minimumWitnessesForClaimCreation, witnesses.length));
	}

	function canAddAsWitness(address addr) internal view returns (bool) {
		return witnessWhitelistMap[addr];
	}

	function uintDifference(uint256 a, uint256 b) internal pure returns (uint256) {
		if (a > b) {
			return a - b;
		}

		return b - a;
	}
}
