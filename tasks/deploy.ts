import { task } from "hardhat/config";

const verify = async (contractAddress: string, args?: any[]) => {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
};

task("deploy").setAction(async ({}, { ethers, upgrades }) => {
  const {
    semaphore,
    pairingAddress,
    semaphoreVerifierAddress,
    poseidonAddress,
    incrementalBinaryTreeAddress,
  } = await run("deploy:semaphore");
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

  await verify(incrementalBinaryTreeAddress);
  await verify(pairingAddress);
  await verify(semaphoreVerifierAddress);
  await verify(semaphore, [semaphoreVerifierAddress]);
  await verify(Reclaim.address, []);
  //   await verify(res.events[0].args[0], []);
  //
});
