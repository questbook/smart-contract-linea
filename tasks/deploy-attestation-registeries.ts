import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import verify from "../scripts/verify";
import {
  AttestationRegistry,
  ModuleRegistry,
  PortalRegistry,
  Router,
  SchemaRegistry,
} from "../src/types";
import { VeraxRegisteries } from "../types";
import fs from "fs";

task("deploy-registeries").setAction(
  async ({ log }, { ethers, network, upgrades }): Promise<VeraxRegisteries> => {
    if (log) {
      console.log(`START SCRIPT`);

      console.log("Deploying Router...");
    }
    const Router = await ethers.getContractFactory("Router");
    const router = (await upgrades.deployProxy(Router)) as Router;
    await router.deployTransaction.wait();
    const routerProxyAddress = await router.address;
    const routerImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(routerProxyAddress);

    await verify(routerProxyAddress, network.name);
    if (log) {
      console.log(`Router successfully deployed and verified!`);
      console.log(`Proxy is at ${routerProxyAddress}`);
      console.log(`Implementation is at ${routerImplementationAddress}`);

      console.log(`\n----\n`);

      console.log("Deploying AttestationRegistry...");
    }

    const AttestationRegistry = await ethers.getContractFactory(
      "AttestationRegistry"
    );
    const attestationRegistry = (await upgrades.deployProxy(
      AttestationRegistry
    )) as AttestationRegistry;
    await attestationRegistry.deployTransaction.wait();
    const attestationRegistryProxyAddress = await attestationRegistry.address;
    const attestationRegistryImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(
        attestationRegistryProxyAddress
      );

    await verify(attestationRegistryProxyAddress, network.name);
    if (log) {
      console.log(`AttestationRegistry successfully deployed and verified!`);
      console.log(`Proxy is at ${attestationRegistryProxyAddress}`);
      console.log(
        `Implementation is at ${attestationRegistryImplementationAddress}`
      );

      console.log(`\n----\n`);

      console.log("Deploying ModuleRegistry...");
    }
    const ModuleRegistry = await ethers.getContractFactory("ModuleRegistry");
    const moduleRegistry = (await upgrades.deployProxy(
      ModuleRegistry
    )) as ModuleRegistry;
    await moduleRegistry.deployTransaction.wait();
    const moduleRegistryProxyAddress = await moduleRegistry.address;
    const moduleRegistryImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(
        moduleRegistryProxyAddress
      );

    await verify(moduleRegistryProxyAddress, network.name);
    if (log) {
      console.log(`ModuleRegistry successfully deployed and verified!`);
      console.log(`Proxy is at ${moduleRegistryProxyAddress}`);
      console.log(
        `Implementation is at ${moduleRegistryImplementationAddress}`
      );

      console.log(`\n----\n`);

      console.log("Deploying PortalRegistry...");
    }
    const PortalRegistry = await ethers.getContractFactory("PortalRegistry");
    const portalRegistry = (await upgrades.deployProxy(
      PortalRegistry
    )) as PortalRegistry;
    await portalRegistry.deployTransaction.wait();
    const portalRegistryProxyAddress = await portalRegistry.address;
    const portalRegistryImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(
        portalRegistryProxyAddress
      );

    await verify(portalRegistryProxyAddress, network.name);
    if (log) {
      console.log(`PortalRegistry successfully deployed and verified!`);
      console.log(`Proxy is at ${portalRegistryProxyAddress}`);
      console.log(
        `Implementation is at ${portalRegistryImplementationAddress}`
      );

      console.log(`\n----\n`);

      console.log("Deploying SchemaRegistry...");
    }
    const SchemaRegistry = await ethers.getContractFactory("SchemaRegistry");
    const schemaRegistry = (await upgrades.deployProxy(
      SchemaRegistry
    )) as SchemaRegistry;
    await schemaRegistry.deployTransaction.wait();
    const schemaRegistryProxyAddress = await schemaRegistry.address;
    const schemaRegistryImplementationAddress =
      await upgrades.erc1967.getImplementationAddress(
        schemaRegistryProxyAddress
      );

    await verify(schemaRegistryProxyAddress, network.name);
    if (log) {
      console.log(`SchemaRegistry successfully deployed and verified!`);
      console.log(`Proxy is at ${schemaRegistryProxyAddress}`);
      console.log(
        `Implementation is at ${schemaRegistryImplementationAddress}`
      );

      console.log(`\n----\n`);

      console.log("Updating Router with the registries addresses...");
    }
    await router.updateAttestationRegistry(attestationRegistryProxyAddress);
    await router.updateModuleRegistry(moduleRegistryProxyAddress);
    await router.updatePortalRegistry(portalRegistryProxyAddress);
    await router.updateSchemaRegistry(schemaRegistryProxyAddress);

    if (log) {
      console.log("Router updated with the registries addresses!");

      console.log(`\n----\n`);

      console.log(`Updating registries with the Router address...`);

      console.log("Updating AttestationRegistry with the Router address...");
    }
    await attestationRegistry.updateRouter(routerProxyAddress);
    if (log) {
      console.log("AttestationRegistry updated!");

      console.log("Updating ModuleRegistry with the Router address...");
    }
    await moduleRegistry.updateRouter(routerProxyAddress);
    if (log) {
      console.log("ModuleRegistry updated!");

      console.log("Updating PortalRegistry with the Router address...");
    }
    await portalRegistry.updateRouter(routerProxyAddress);
    if (log) {
      console.log("PortalRegistry updated!");

      console.log("Updating SchemaRegistry with the Router address...");
    }
    await schemaRegistry.updateRouter(routerProxyAddress);

    if (log) {
      console.log("SchemaRegistry updated!");
      console.log("Registries updated with the Router address!");

      console.log(`\n----\n`);

      console.log(`** SUMMARY **`);
      console.log(`Router = ${routerProxyAddress}`);
      console.log(`AttestationRegistry = ${attestationRegistryProxyAddress}`);
      console.log(`ModuleRegistry = ${moduleRegistryProxyAddress}`);
      console.log(`PortalRegistry = ${portalRegistryProxyAddress}`);
      console.log(`SchemaRegistry = ${schemaRegistryProxyAddress}`);
    }
    if (network.name !== "hardhat") {
      const content = JSON.parse(
        fs.readFileSync("./resources/contract-network-config.json", "utf-8")
      );
      const networkDetails = content["networks"][network.name];
      networkDetails["Router"] = { address: routerProxyAddress, explorer: "" };
      networkDetails["AttestationRegistry"] = {
        address: attestationRegistryProxyAddress,
        explorer: "",
      };
      networkDetails["ModuleRegistry"] = {
        address: moduleRegistryProxyAddress,
        explorer: "",
      };
      networkDetails["PortalRegistry"] = {
        address: portalRegistryProxyAddress,
        explorer: "",
      };
      networkDetails["SchemaRegistry"] = {
        address: schemaRegistryProxyAddress,
        explorer: "",
      };
      content["networks"][network.name] = networkDetails;
      fs.writeFileSync(
        "./resources/contract-network-config.json",
        JSON.stringify(content)
      );
    }
    return {
      router,
      attestationRegistry,
      moduleRegistry,
      portalRegistry,
      schemaRegistry,
    };
  }
);
