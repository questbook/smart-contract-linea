import { task } from "hardhat/config";
import { ReturnObjectSemaphoreDeployTask, VeraxRegisteries } from "../types";

task("deploy-verax").setAction(
  async (taskArgs, { ethers, network, upgrades }) => {
    const {
      router,
      attestationRegistry,
      moduleRegistry,
      portalRegistry,
      schemaRegistry,
    } = // @ts-expect-error events
      (await run("deploy-registeries")) as VeraxRegisteries;

    await portalRegistry.setIssuer((await ethers.getSigners())[0].address);
    const {
      semaphore,
      pairingAddress,
      semaphoreVerifierAddress,
      poseidonAddress,
      incrementalBinaryTreeAddress,
    } = // @ts-expect-error events
      (await run("deploy:semaphore")) as ReturnObjectSemaphoreDeployTask;

    const ReclaimFactory = await ethers.getContractFactory("Reclaim");
    const Reclaim = await upgrades.deployProxy(
      ReclaimFactory,
      [semaphore.address],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );
    const tx = await Reclaim.deployed();
    const res = await tx.deployTransaction.wait();

    // @ts-expect-error events
    console.log("Reclaim Implementation deployed to:", res.events[0].args[0]);
    console.log("Reclaim Proxy deployed to: ", Reclaim.address);

    const userMerkelizerModuleFactory = await ethers.getContractFactory(
      "UserMerkelizerModule"
    );

    const userMerkelizerModule = await userMerkelizerModuleFactory.deploy(
      Reclaim.address
    );
    const userMerkelizerModuletx = await userMerkelizerModule.deployed();
    await userMerkelizerModuletx.deployTransaction.wait();

    const moduleRegistrytx = await moduleRegistry.register(
      "UserMerkelizeirModule",
      "Module to merkelize user and verify proof using reclaim contract",
      userMerkelizerModule.address
    );

    console.log("UserMerkelizeirModule registered to moduleRegistry");

    const ReclaimPortalFactory = await ethers.getContractFactory(
      "ReclaimPortal"
    );
    const reclaimPortal = await ReclaimPortalFactory.deploy(
      [userMerkelizerModule.address],
      router.address
    );
    await reclaimPortal.deployTransaction.wait();

    console.log("ReclaimPortal deployed to " + reclaimPortal.address);

    const tx5 = await portalRegistry.register(
      reclaimPortal.address,
      "ReclaimPortal",
      "Portal",
      false,
      "Reclaim"
    );

    console.log("ReclaimPortal registered to portalRegistry");
  }
);
