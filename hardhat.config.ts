import dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@semaphore-protocol/hardhat";
import "solidity-coverage";
import "./tasks";

const { PRIVATE_KEY, ALCHEMY_API_KEY, NETWORK } = process.env;
const hasCustomNetwork = NETWORK && NETWORK !== "hardhat";

if (hasCustomNetwork) {
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set");
  }

  if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY not set");
  }
}

const API_TEMPLATE = "https://{{network}}.g.alchemy.com/v2/{{key}}";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: NETWORK,
  networks: {
    hardhat: {
      // forking: {
      //   url: "https://eth-sepolia.g.alchemy.com/v2/" + ALCHEMY_API_KEY,
      //   blockNumber: 3231111,
      // },
      gas: 2100000,
      gasPrice: 8000000000,
    },
    ...(hasCustomNetwork
      ? {
          [NETWORK]: {
            url: API_TEMPLATE.replace("{{network}}", NETWORK).replace(
              "{{key}}",
              ALCHEMY_API_KEY!
            ),
            // uncomment to make tx go faster
            // gasPrice: 450000000000,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
};

export default config;
