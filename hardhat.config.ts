import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";
import "hardhat-gas-reporter";
import { BLOCK_NUMBER } from "./constants/constants";

require("dotenv").config();

process.env.TEST_MNEMONIC =
  "test test test test test test test test test test test junk";

// Defaults to CHAINID=1 so things will run with mainnet fork if not specified
const CHAINID = process.env.CHAINID ? Number(process.env.CHAINID) : 1;

export default {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        runs: 200,
        enabled: true,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.TEST_MNEMONIC,
      },
      chainId: CHAINID,
      forking: {
        url: process.env.TEST_URI,
        blockNumber: BLOCK_NUMBER[CHAINID],
        gasLimit: 8e6,
      },
    },
    mainnet: {
      url: process.env.TEST_URI,
      chainId: 1,
      accounts: {
        mnemonic: process.env.MAINNET_MNEMONIC,
      },
    },
    goerli: {
      url: process.env.GOERLI_URI,
      chainId: 5,
      accounts: {
        mnemonic: process.env.GOERLI_MNEMONIC,
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_URI,
      chainId: 11155111,
      accounts: {
        mnemonic: process.env.SEPOLIA_MNEMONIC,
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
  },
};
