// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import {AbstractPortal} from "./interface/AbstractPortal.sol";
import {AttestationPayload} from "./types/Structs.sol";

contract ReclaimPortal is AbstractPortal {
	function _beforeAttest(
		AttestationPayload memory attestation,
		uint256 value
	) internal override {}

	function _afterAttest() internal override {}

	function _onRevoke(bytes32 attestationId, bytes32 replacedBy) internal override {}

	function _onBulkRevoke(
		bytes32[] memory attestationIds,
		bytes32[] memory replacedBy
	) internal override {}

	function _onBulkAttest(
		AttestationPayload[] memory attestationsPayloads,
		bytes[][] memory validationPayloads
	) internal override {}
}
