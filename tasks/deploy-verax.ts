import { task } from "hardhat/config";
import fs from "fs";
import { ReturnObjectSemaphoreDeployTask, VeraxRegisteries } from "../types";
import verify from "../scripts/verify";

task("deploy-verax").setAction(
  async (taskArgs, { ethers, network, upgrades }) => {
    const content = JSON.parse(
      fs.readFileSync("./resources/contract-network-config.json", "utf-8")
    );
    const networkDetails = content["networks"][network.name];
    console.log(networkDetails);

    const moduleRegistryFactory = await ethers.getContractFactory(
      "ModuleRegistry"
    );
    const portalRegistryFactory = await ethers.getContractFactory(
      "PortalRegistry"
    );

    const routerFactory = await ethers.getContractFactory("Router");

    const portalRegistry = await portalRegistryFactory.attach(
      networkDetails["PortalRegistry"]["address"]
    );

    const moduleRegistry = await moduleRegistryFactory.attach(
      networkDetails["ModuleRegistry"]["address"]
    );

    const router = await routerFactory.attach(
      networkDetails["Router"]["address"]
    );

    await portalRegistry.setIssuer((await ethers.getSigners())[0].address);

    const ReclaimFactory = await ethers.getContractFactory("Reclaim");
    const Reclaim = ReclaimFactory.attach(networkDetails["Reclaim"]["address"]);

    const userMerkelizerModuleFactory = await ethers.getContractFactory(
      "UserMerkelizerModule"
    );

    console.log(`Deploying UserMerkelizerModule..`);
    const userMerkelizerModule = await userMerkelizerModuleFactory.deploy(
      Reclaim.address
    );
    const userMerkelizerModuletx = await userMerkelizerModule.deployed();
    await userMerkelizerModuletx.deployTransaction.wait();
    console.log(
      `UserMerkelizerModule Deployed to address ${userMerkelizerModule.address}`
    );
    await verify(userMerkelizerModule.address, network.name, [Reclaim.address]);

    console.log("Registering UserMerkelizeirModule to ModuleRegistery");
    await moduleRegistry.register(
      "UserMerkelizeirModule",
      "Module to merkelize user and verify proof using reclaim contract",
      userMerkelizerModule.address
    );
    console.log("UserMerkelizeirModule registered to ModuleRegistry");

    const ReclaimPortalFactory = await ethers.getContractFactory(
      "ReclaimPortal"
    );
    console.log(`Deploying ReclaimPortal..`);
    const reclaimPortal = await ReclaimPortalFactory.deploy(
      [userMerkelizerModule.address],
      router.address
    );
    await reclaimPortal.deployTransaction.wait();
    console.log("ReclaimPortal deployed to " + reclaimPortal.address);

    await verify(reclaimPortal.address, network.name, [
      [userMerkelizerModule.address],
      router.address,
    ]);

    console.log("Registering ReclaimPortal to PortalRegistry");
    await portalRegistry.register(
      reclaimPortal.address,
      "ReclaimPortal",
      "Portal to attest claims",
      false,
      "Reclaim"
    );
    console.log("ReclaimPortal registered to PortalRegistry");

    networkDetails["ReclaimPortal"] = {
      address: reclaimPortal.address,
      explorer: "",
    };

    networkDetails["UserMerkelizerModule"] = {
      address: userMerkelizerModule.address,
      explorer: "",
    };
    content["networks"][network.name] = networkDetails;

    fs.writeFileSync(
      "./resources/contract-network-config.json",
      JSON.stringify(content)
    );
  }
);
