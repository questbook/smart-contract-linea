import { task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { getContractAddress } from "./utils";
import { generateMockWitnessesList } from "../test/utils";
import fs from "fs";

task("add-new-epoch", "Start a new epoch").setAction(
  async (taskArgs, { ethers, network }) => {
    const signerAddress = await ethers.provider.getSigner().getAddress();
    console.log(
      `adding witness on "${network.name}" from address "${signerAddress}"`
    );
    const witnesses = await generateMockWitnessesList(
      5,
      "http://localhost:555",
      ethers
    );

    console.log(
      Object.entries(witnesses.witnessesWallets).map(([key, val], isx, _) => {
        const r = {};
        r[key] = val.privateKey;
        return r;
      })
    );

    const contractAddress = getContractAddress(network.name, "Reclaim");
    const factory = await ethers.getContractFactory("Reclaim");
    const contract = factory.attach(contractAddress);
    // const currentEpoch = await contract.fetchEpoch(0);

    const tx = await contract.addNewEpoch(witnesses.mockWitnesses, 3);
    await tx.wait();
    // console.log(tx);
    // return; //
    const currentEpoch = await contract.fetchEpoch(0);

    fs.writeFileSync(
      "./witnesses.json",
      JSON.stringify(
        Object.entries(witnesses.witnessesWallets).map(([key, val], isx, _) => {
          const r = {};
          r[key] = val.privateKey;
          return r;
        })
      )
    );
    console.log(`current epoch: ${currentEpoch.id}`);
    console.log(
      `epoch witnesses: ${currentEpoch.witnesses.map((w) => w.addr).join(", ")}`
    );
    console.log(`epoch start: ${new Date(currentEpoch.timestampStart * 1000)}`);
  }
);
