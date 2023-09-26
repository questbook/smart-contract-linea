// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import {AbstractModule} from "./interface/AbstractModule.sol";
import {AttestationPayload} from "./types/Structs.sol";

contract ProofVerifierModule is AbstractModule {
	function run(
		AttestationPayload memory attestationPayload,
		bytes memory validationPayload,
		address txSender
	) public override {}
}
