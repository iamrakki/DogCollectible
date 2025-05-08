require('@nomiclabs/hardhat-ethers');

module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    xdc: {
      url: `https://rpc.apothem.network`,
      accounts: [""]
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200, 
    },
  },
};
