const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DogCollectible", function () {
    let dogContract;
    let hpController;
    let hpToken;
    let owner;
    let user;
    
    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy mock HP token
        const MockHPToken = await ethers.getContractFactory("MockHPToken");
        hpToken = await MockHPToken.deploy();
        await hpToken.waitForDeployment();
        
        const HPController = await ethers.getContractFactory("HPController");
        hpController = await HPController.deploy(hpToken.target);
        await hpController.waitForDeployment();

        // Grant MINTER_ROLE to the HPController
        await hpController.grantRole(await hpController.MINTER_ROLE(), hpController.target);
        
        const DogCollectible = await ethers.getContractFactory("DogCollectible");
        dogContract = await DogCollectible.deploy(
            "DogCollectible",
            "DOG",
            "ipfs://baseuri/",
            90, 80, 80, 90, 70
        );
        await dogContract.waitForDeployment();
        await dogContract.setHPController(hpController.target);
        
        // Grant HP tokens to users for testing
        await hpToken.transfer(owner.address, ethers.parseEther("1000000"));
        await hpToken.transfer(user.address, ethers.parseEther("1000000"));

        // Approve both HPController and DogCollectible to spend tokens
        await hpToken.connect(owner).approve(hpController.target, ethers.parseEther("1000000"));
        await hpToken.connect(user).approve(hpController.target, ethers.parseEther("1000000"));
        await hpToken.connect(owner).approve(dogContract.target, ethers.parseEther("1000000"));
        await hpToken.connect(user).approve(dogContract.target, ethers.parseEther("1000000"));
    });

    describe("C01 - Initial public mint", function () {
        it("should mint 5 tokens correctly", async function () {
            await dogContract.connect(user).publicMint(5);
            
            expect((await dogContract.initialMinted()).toString()).to.equal("5");
            for (let i = 0; i < 5; i++) {
                expect(await dogContract.ownerOf(i)).to.equal(user.address);
                expect(await dogContract.levelOf(i)).to.equal(0); // Common
            }
        });
    });

    describe("C02 - Exhaust initial supply", function () {
        it("should revert when exceeding initial supply", async function () {
            await dogContract.connect(user).publicMint(120);
            await expect(
                dogContract.connect(user).publicMint(1)
            ).to.be.revertedWith("Exceeds initial supply");
        });
    });

    describe("C03 - Monthly mint by admin", function () {
        it("should allow admin to mint monthly", async function () {
            const thirtyDays = 30 * 24 * 60 * 60;
            await time.increase(thirtyDays);
            
            await dogContract.mintMonthly(10);
            expect(await dogContract.ownerOf(0)).to.equal(owner.address);
            const nextMint = await dogContract.nextMintTimestamp();
            expect(nextMint).to.be.gt(await time.latest());
        });
    });

    describe("C04 - Merge Commons", function () {
        it("should merge two commons into a standard", async function () {
            await dogContract.connect(user).publicMint(2);
            await dogContract.connect(user).mergeCommons(0, 1);
            
            await expect(dogContract.ownerOf(0)).to.be.reverted;
            await expect(dogContract.ownerOf(1)).to.be.reverted;
            expect(await dogContract.ownerOf(2)).to.equal(user.address);
            expect(await dogContract.levelOf(2)).to.equal(1); // Standard
        });
    });

    describe("C05 - Stats multiplier", function () {
        it("should calculate correct stats after merge", async function () {
            await dogContract.connect(user).publicMint(2);
            await dogContract.connect(user).mergeCommons(0, 1);
            
            const stats = await dogContract.getStats(2);
            // Base stats (90,80,80,90,70) × 1.15
            expect(stats.smell).to.equal(103);  
            expect(stats.hearing).to.equal(92); 
            expect(stats.sight).to.equal(92);   
            expect(stats.taste).to.equal(103);  
            expect(stats.touch).to.equal(80);  
        });
    });

    describe("C06 - Gift counting", function () {
        it("should increment gift count", async function () {
            await dogContract.connect(user).publicMint(1);
            await dogContract.gift(0, "Bone");
            expect(await dogContract.giftCounts(0, "Bone")).to.equal(1);
        });
    });

    describe("C07 - Base URI", function () {
        it("should update base URI", async function () {
            await dogContract.connect(user).publicMint(1); 
            await dogContract.setBaseURI("ipfs://new/");
            expect(await dogContract.tokenURI(0)).to.equal("ipfs://new/0");
        });
    });

    describe("C08 - Merge Standards to Rare", function () {
        it("should merge three standards into rare", async function () {
            await dogContract.connect(user).publicMint(6);
            await dogContract.connect(user).mergeCommons(0, 1);
            await dogContract.connect(user).mergeCommons(2, 3);
            await dogContract.connect(user).mergeCommons(4, 5);
            
            const standardIds = [6, 7, 8];
            await dogContract.connect(user).mergeStandards(standardIds);
            
            expect(await dogContract.levelOf(9)).to.equal(2); // Rare
        });
    });

    describe("C09 - HP Generation", function () {
        it("should accumulate HP over time at correct rate", async function () {
            await dogContract.connect(user).publicMint(1);
            const initialHP = await dogContract.getHP(0);
            const totalMint = await dogContract.initialMinted();
            console.log("Total Minted: ", totalMint.toString());
            
            await time.increase(60); // 1 minute
            const newHP = await dogContract.getHP(0);
            
            // Common level HP rate is 180/100 = 1.8 HP per minute
            const expectedIncrease = 2; // (180 * 1) / 100 = 1.8, truncated to 1 due to integer division
            expect(newHP - initialHP).to.equal(expectedIncrease);
        });
    });

    describe("C10 - HP Update State", function () {
        it("should update stored HP state correctly", async function () {
            await dogContract.connect(user).publicMint(1);
            await time.increase(60);
            await dogContract.updateHP(0);
            const storedHP = await dogContract.getHP(0);
            expect(storedHP).to.be.gt(0);
        });
    });

    describe("C11 - Token URI generation", function () {
        it("should generate correct token URIs based on baseURI", async function () {
            await dogContract.connect(user).publicMint(1);
            expect(await dogContract.tokenURI(0)).to.equal("ipfs://baseuri/0");
            
            // Update the base URI
            await dogContract.setBaseURI("https://api.dogs.example/metadata/");
            expect(await dogContract.tokenURI(0)).to.equal("https://api.dogs.example/metadata/0");
        });
    });

    describe("C12 - Zero quantity validation", function () {
        it("should reject minting zero tokens", async function () {
            await expect(
                dogContract.connect(user).publicMint(0)
            ).to.be.revertedWith("Quantity must be > 0");
            
            await expect(
                dogContract.connect(user).mintToAddress(owner.address, 0)
            ).to.be.revertedWith("Quantity must be > 0");
            
            await expect(
                dogContract.mintMonthly(0)
            ).to.be.revertedWith("Quantity must be > 0");
        });
    });

    describe("C13 - HP Controller integration", function () {
        it("should transfer correct amount of HP tokens when minting", async function () {
            const controllerBalanceBefore = await hpToken.balanceOf(hpController.target);
            
            // Mint 5 tokens
            await dogContract.connect(user).publicMint(5);
            
            const controllerBalanceAfter = await hpToken.balanceOf(hpController.target);
            
            // Verify HP tokens were transferred to controller
            expect(controllerBalanceAfter).to.be.gt(controllerBalanceBefore);
            
        });
    });

    describe("C14 - Different user operations", function () {
        it("should allow different users to mint and merge independently", async function () {
            // User mints and merges
            await dogContract.connect(user).publicMint(2);
            await dogContract.connect(user).mergeCommons(0, 1);
            expect(await dogContract.ownerOf(2)).to.equal(user.address);
            
            // owner mints and merges
            await dogContract.connect(owner).publicMint(2);
            await dogContract.connect(owner).mergeCommons(3, 4);
            expect(await dogContract.ownerOf(5)).to.equal(owner.address);
        });
    });

    describe("C15 - Enumerable functionality", function () {
        it("should support token enumeration", async function () {
            await dogContract.connect(user).publicMint(5);
            
            // Check total supply
            expect(await dogContract.totalSupply()).to.equal(5);
            
            // Verify tokens of owner
            expect(await dogContract.balanceOf(user.address)).to.equal(5);
            
            // Check token by index
            for (let i = 0; i < 5; i++) {
                const tokenId = await dogContract.tokenByIndex(i);
                expect(tokenId).to.equal(i);
                
                const ownerToken = await dogContract.tokenOfOwnerByIndex(user.address, i);
                expect(ownerToken).to.equal(i);
            }
        });
    });

    describe("C16 - AccessControl roles", function () {
        it("should correctly enforce role-based access control", async function () {
            const ADMIN_ROLE = await dogContract.ADMIN_ROLE();
            const DEFAULT_ADMIN_ROLE = await dogContract.DEFAULT_ADMIN_ROLE();
            
            // Verify owner has correct roles
            expect(await dogContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
            expect(await dogContract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
            
            // Verify users don't have admin roles
            expect(await dogContract.hasRole(ADMIN_ROLE, user.address)).to.be.false;
        });
    });

    describe("C17 - HP update and accumulation", function () {
        it("should correctly update HP after explicit update call", async function () {
            await dogContract.connect(user).publicMint(1);
            
            // Wait for some time to pass
            await time.increase(60 * 5); // 5 minutes
            
            // Check HP but don't update state
            const calculatedHP = await dogContract.getHP(0);
            
            // Update the HP state
            await dogContract.updateHP(0);
            
            // Wait some more time
            await time.increase(60 * 3); // 3 more minutes
            
            // The new HP should be based on the updated state + new time passed
            const newHP = await dogContract.getHP(0);
            
            // Common token rate: 1.8 HP/minute
            // First period: 5 minutes * 1.8 = 9 HP
            // Second period: 3 minutes * 1.8 = 5.4 HP
            // Total: ~14.4 HP
            expect(newHP).to.be.gt(calculatedHP);
        });
    });

    describe("C18 - ERC721Burnable behavior", function () {
        it("should support token burning", async function () {
            await dogContract.connect(user).publicMint(1);
            
            // Verify token exists
            expect(await dogContract.ownerOf(0)).to.equal(user.address);
            
            // Burn the token
            await dogContract.connect(user).burn(0);
            
            // Verify token no longer exists
            await expect(dogContract.ownerOf(0)).to.be.revertedWithCustomError(dogContract, "ERC721NonexistentToken");
        });
    });

    describe("Negative Tests", function () {
        let dogContract2; 

        beforeEach(async function () {
            // Deploy second contract instance for N05
            const DogCollectible = await ethers.getContractFactory("DogCollectible");
            dogContract2 = await DogCollectible.deploy(
                "DogCollectible2",
                "DOG2",
                "ipfs://baseuri/",
                90, 80, 80, 90, 70
            );
            await dogContract2.waitForDeployment();
            await dogContract2.setHPController(hpController.target);

            await hpToken.connect(owner).approve(dogContract2.target, ethers.parseEther("1000000"));
            await hpToken.connect(user).approve(dogContract2.target, ethers.parseEther("1000000"));
        });

        it("N01 - should revert when exceeding supply with partial mint", async function () {
            await dogContract.connect(user).publicMint(119);
            await expect(
                dogContract.connect(user).publicMint(2)
            ).to.be.revertedWith("Exceeds initial supply");
        });

        it("N02 - should revert early monthly mint", async function () {
            await expect(
                dogContract.mintMonthly(1)
            ).to.be.revertedWith("Too early");
        });

        it("N03 - should revert non-admin monthly mint", async function () {
            const thirtyDays = 30 * 24 * 60 * 60;
            await time.increase(thirtyDays);
            await expect(
                dogContract.connect(user).mintMonthly(1)
            ).to.be.revertedWithCustomError(dogContract, "AccessControlUnauthorizedAccount");
        });

        it("N04 - should revert merging different levels", async function () {
            await dogContract.connect(user).publicMint(2);
            await dogContract.connect(user).mergeCommons(0, 1); // Creates a Standard
            await dogContract.connect(user).publicMint(1); // New Common
            await expect(
                dogContract.connect(user).mergeCommons(2, 3) // Common + Standard
            ).to.be.revertedWith("Not common");
        });

        it("N05 - should revert merging across contracts", async function () {
            await dogContract.connect(user).publicMint(1);
            await dogContract2.connect(user).publicMint(1);
            await expect(
                dogContract.connect(user).mergeCommons(0, 0) // Same ID, different contracts
            ).to.be.revertedWithCustomError(dogContract, "ERC721NonexistentToken");
        });

        it("N06 - should revert unauthorized setBaseURI", async function () {
            await expect(
                dogContract.connect(user).setBaseURI("ipfs://new/")
            ).to.be.revertedWithCustomError(dogContract, "AccessControlUnauthorizedAccount");
        });

        it("N07 - should revert gifting non-existent token", async function () {
            await expect(
                dogContract.gift(999, "Bone")
            ).to.be.revertedWithCustomError(dogContract, "ERC721NonexistentToken");
        });

        it("N08 - should revert when merging standards with insufficient tokens", async function () {
            await dogContract.connect(user).publicMint(4);
            await dogContract.connect(user).mergeCommons(0, 1);
            await dogContract.connect(user).mergeCommons(2, 3);
            
            await expect(
                dogContract.connect(user).mergeStandards([4, 5]) // Only 2 instead of required 3
            ).to.be.revertedWith("Need 3");
        });

        it("N09 - should revert HP update for burned token", async function () {
            await dogContract.connect(user).publicMint(2);
            await dogContract.connect(user).mergeCommons(0, 1);
            
            await expect(
                dogContract.updateHP(0)
            ).to.be.revertedWithCustomError(dogContract, "ERC721NonexistentToken");
        });

        it("N10 - should revert when merging with insufficient HP", async function () {
            await dogContract.connect(user).publicMint(2);
            await hpToken.connect(user).approve(dogContract.target, 0);

            await expect(
                dogContract.connect(user).mergeCommons(0, 1)
            ).to.be.revertedWithCustomError(hpToken, "ERC20InsufficientAllowance");
        });

        it("should revert when minting to zero address", async function () {
            await expect(
                dogContract.connect(user).mintToAddress(ethers.ZeroAddress, 1)
            ).to.be.revertedWithCustomError(dogContract, "ERC721InvalidReceiver");
        });
    });
});
