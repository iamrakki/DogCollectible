require('@nomiclabs/hardhat-ethers');
require("hardhat-contract-sizer");
require("@nomicfoundation/hardhat-chai-matchers");

require('dotenv').config();

const { PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, 
      },
    },
  },
  networks: {
    hardhat: {},
    xdc: {
      url: `https://rpc.apothem.network`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
    only: [],
  },
};