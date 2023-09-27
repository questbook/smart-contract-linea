// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import {AbstractModule} from "./interfaces/AbstractModule.sol";
import {AttestationPayload} from "./types/Structs.sol";
import {Reclaim} from "../Reclaim.sol";
import "../lib/StringUtils.sol";

contract UserMerkelizerModule is AbstractModule {
	Reclaim private reclaim;

	constructor(address reclaimAddress) {
		reclaim = Reclaim(reclaimAddress);
	}

	function run(
		AttestationPayload memory attestationPayload,
		bytes memory validationPayload,
		address /* txSender */,
		uint256 /* value */
	) public override {
		(Reclaim.Proof memory proof, uint256 _identityCommitment) = abi.decode(
			validationPayload,
			(Reclaim.Proof, uint256)
		);
		string memory subject = StringUtils.bytes2str(attestationPayload.subject);
		string memory contextAddress = reclaim.getContextAddressFromProof(proof);

		require(
			StringUtils.areEqual(subject, contextAddress),
			"subject or contextAddress is invalid"
		);

		reclaim.merkelizeUser(proof, _identityCommitment);
	}
}
