import { BaseContract } from "ethers";
import { Semaphore } from "./src/types";
import {
  AttestationRegistry,
  ModuleRegistry,
  Router,
  PortalRegistry,
  SchemaRegistry,
} from "./src/types/contracts/verax/registry/index";

export interface VeraxRegisteries {
  attestationRegistry: AttestationRegistry;
  moduleRegistry: ModuleRegistry;
  router: Router;
  portalRegistry: PortalRegistry;
  schemaRegistry: SchemaRegistry;
}

export interface ReturnObjectSemaphoreDeployTask {
  semaphore: Semaphore;
  pairingAddress: BaseContract["address"];
  semaphoreVerifierAddress: BaseContract["address"];
  poseidonAddress: BaseContract["address"];
  incrementalBinaryTreeAddress: BaseContract["address"];
}
