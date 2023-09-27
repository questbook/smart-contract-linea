import { task } from "hardhat/config";
import verify from "../scripts/verify";
import { ReturnObjectSemaphoreDeployTask } from "../types";

task("deploy").setAction(async ({}, { ethers, network, upgrades }) => {
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

  await verify(incrementalBinaryTreeAddress, network.name);
  await verify(pairingAddress, network.name);
  await verify(semaphoreVerifierAddress, network.name);
  await verify(semaphore.address, network.name, [semaphoreVerifierAddress]);
  await verify(Reclaim.address, network.name, []);
});
