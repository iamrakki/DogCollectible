const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DogCollectible", function () {
  let dogCollectibleFactory;
  let dogCollectible;
  let owner;
  let addr1;
  let addr2;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the DogCollectibleFactory contract
    const DogCollectibleFactory = await ethers.getContractFactory("DogCollectibleFactory");
    dogCollectibleFactory = await DogCollectibleFactory.deploy();
    await dogCollectibleFactory.deployed();
    console.log("DogCollectibleFactory deployed to:", dogCollectibleFactory.address);

    
  });

  describe("Create createCollection", function () {
    it("Should create a new DogCollectible collection", async function () {
      const tx = await dogCollectibleFactory.createCollection("Dog Collectible", "DOG","https://web.whatsapp.com/", 80, 70, 80, 85, 90);
      const receipt = await tx.wait();
      const event = receipt.events.find(event => event.event === "CollectionCreated");
      const collectionAddress = event.args[0];
      dogCollectible = await ethers.getContractAt("DogCollectible", collectionAddress);
      expect(dogCollectible.address).to.not.be.undefined;
    });
  });

  describe("Deployment", function () {

    // set the admin role to the owner
    it("Should set the correct admin role", async function () {
      const adminRole = await dogCollectible.ADMIN_ROLE();
       const hasRole = await dogCollectible.hasRole(adminRole, dogCollectibleFactory.address);
             expect(hasRole).to.equal(true);
    });

    it("Should set the correct initial values", async function () {
      expect((await dogCollectible.initialSupply()).toNumber()).to.equal(120);
      expect((await dogCollectible.monthlyMintAmount()).toNumber()).to.equal(10);
    });
  });


  // Merge functions
  describe("Merge", function () {
    before(async function () {
      // Mint initial tokens for testing
      await dogCollectible.connect(addr1).publicMint(120);
    });

    it("Should merge two common tokens to create a standard token", async function () {
      const tx1 = await dogCollectible.connect(addr1).mergeCommons(0, 1);
      await tx1.wait();
      const level = await dogCollectible.levelOf(120);
      expect(level).to.equal(1); // Standard level
    });

    it("Should merge three standard tokens to create a rare token", async function () {
      // First create three standard tokens
      await dogCollectible.connect(addr1).mergeCommons(2, 3);
      await dogCollectible.connect(addr1).mergeCommons(4, 5);
      await dogCollectible.connect(addr1).mergeCommons(6, 7);


      // Merge the three standard tokens
      const standardIds = [121, 122, 123];
      const tx = await dogCollectible.connect(addr1).mergeStandards(standardIds);
      await tx.wait();
      const level = await dogCollectible.levelOf(124);      
      expect(level).to.equal(2); // Rare level
    });

    it("Should merge five rare tokens to create an epic token", async function () {
      // First create five rare tokens
      // Create standard tokens
      for (let i = 8; i <= 37; i += 2) {
        await dogCollectible.connect(addr1).mergeCommons(i, i + 1);
      }
      
      // Create rare tokens from standard tokens
      for (let i = 0; i < 5; i++) {
        const standardIds = [125 + i * 3, 126 + i * 3, 127 + i * 3];
        await dogCollectible.connect(addr1).mergeStandards(standardIds);
      }


      // Merge the five rare tokens
      const rareIds = [140, 141, 142, 143, 144];
      const tx = await dogCollectible.connect(addr1).mergeRares(rareIds);
      await tx.wait();
      const level = await dogCollectible.levelOf(145);
      expect(level).to.equal(3); // Epic level
    });

    // it("Should merge three epic tokens to create a super rare token", async function () {
    //   // First create 15 rare tokens
    //   // Step 1: Create standard tokens from commons
    //   for (let i = 38; i <= 97; i += 2) {
    //     await dogCollectible.connect(addr1).mergeCommons(i, i + 1);
    //   }
    
    //   // Step 2: Create rare tokens from standard tokens
    //   for (let i = 0; i < 15; i++) {
    //     const standardIds = [146 + i * 3, 147 + i * 3, 148 + i * 3];
    //     await dogCollectible.connect(addr1).mergeStandards(standardIds);
    //   }
    
    //   // Step 3: Create 3 epic tokens from rare tokens
    //   for (let i = 0; i < 3; i++) {
    //     const rareIds = [191 + i * 5, 192 + i * 5, 193 + i * 5, 194 + i * 5, 195 + i * 5];
    //     await dogCollectible.connect(addr1).mergeRares(rareIds);
    //   }
    
    //   // Step 4: Merge 3 epic tokens into a super rare token
    //   const epicIds = [206, 207, 208];
    //   const tx = await dogCollectible.connect(addr1).mergeEpics(epicIds);
    //   await tx.wait();
    
    //   const level = await dogCollectible.levelOf(209);
    //   expect(level).to.equal(4); // Super rare level
    // });
    

  });

});
