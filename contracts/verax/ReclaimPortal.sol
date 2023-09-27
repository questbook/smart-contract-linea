// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import {AbstractPortal} from "./interfaces/AbstractPortal.sol";
import {AttestationPayload} from "./types/Structs.sol";
import "../Reclaim.sol";

contract ReclaimPortal is AbstractPortal {
	/// @notice Error thrown when trying to revoke an attestation
	error NoRevocation();
	/// @notice Error thrown when trying to bulk revoke attestations
	error NoBulkRevocation();

	struct AttestationRequestData {
		Reclaim.Proof proof;
		uint256 _identityCommitment;
		uint64 expirationTime;
	}

	struct AttestationRequest {
		bytes32 schema;
		AttestationRequestData data;
	}

	constructor(
		address[] memory modules,
		address router
	) AbstractPortal(modules, router) {}

	function attest(AttestationRequest memory attestationRequest) public payable {
		bytes[] memory validationPayload = new bytes[](1);
		AttestationPayload memory attestationPayload = AttestationPayload(
			attestationRequest.schema,
			attestationRequest.data.expirationTime,
			abi.encodePacked(msg.sender),
			abi.encode(attestationRequest.data.proof.claimInfo.parameters)
		);
		validationPayload[0] = abi.encode(
			attestationRequest.data.proof,
			attestationRequest.data._identityCommitment
		);

		super.attest(attestationPayload, validationPayload);
	}

	/// @inheritdoc AbstractPortal
	function withdraw(address payable to, uint256 amount) external override {}

	/**
	 * @inheritdoc AbstractPortal
	 * @notice This portal doesn't allow for an attestation to be revoked
	 */
	function _onRevoke(bytes32 /*attestationId*/) internal pure override {
		revert NoRevocation();
	}

	/**
	 * @inheritdoc AbstractPortal
	 * @notice This portal doesn't allow for attestations to be revoked
	 */
	function _onBulkRevoke(bytes32[] memory /*attestationIds*/) internal pure override {
		revert NoBulkRevocation();
	}
}
