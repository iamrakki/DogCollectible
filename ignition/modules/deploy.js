const { ethers } = require('hardhat');

async function main() {

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);

  // Deploy the DogCollectibleFactory contract
    const DogCollectibleFactory = await ethers.getContractFactory("DogCollectibleFactory");
    const dogCollectibleFactory = await DogCollectibleFactory.deploy();
    await dogCollectibleFactory.deployed();
    console.log("DogCollectibleFactory deployed to:", dogCollectibleFactory.address);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});