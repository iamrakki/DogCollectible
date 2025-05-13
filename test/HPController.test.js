const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HPController", function () {
    let HPController;
    let dogContract;
    let hpToken;
    let owner;
    let user;
    let controller;

    beforeEach(async function () {
        // Deploy mock HP token
        const MockToken = await ethers.getContractFactory("MockHPToken");
        hpToken = await MockToken.deploy();
        await hpToken.waitForDeployment();

        // Deploy HPController
        HPController = await ethers.getContractFactory("HPController");
        controller = await HPController.deploy(hpToken.target);
        await controller.waitForDeployment();

        // Deploy DogCollectible
        const DogCollectible = await ethers.getContractFactory("DogCollectible");
        dogContract = await DogCollectible.deploy(
            "DogCollectible",
            "DOG",
            "ipfs://baseuri/",
            90, 80, 80, 90, 70
        );
        await dogContract.waitForDeployment();
        await dogContract.setHPController(controller.target);


        [owner, user] = await ethers.getSigners();
    });

    describe("Batch Minting Scenarios", function () {
        it("B01 - Should batch mint with 10% discount", async function () {
            // Setup: Controller has 100,000 HP, user has 80,000 HP
            await hpToken.mint(controller.target, ethers.parseUnits("100000"));
            await hpToken.mint(user.address, ethers.parseUnits("80000"));
            await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("72000"));
            
            await controller.setBulkDiscountRate(10);

            // Perform the batch mint
            const userBalanceBefore = await hpToken.balanceOf(user.address);
            await dogContract.connect(user).publicMint(10);
            const userBalanceAfter = await hpToken.balanceOf(user.address);

            // Verify HP deduction
            expect(userBalanceBefore - userBalanceAfter).to.equal(ethers.parseUnits("72000"));
        });

        it("B02 - Should batch mint with zero discount", async function () {
            await hpToken.mint(user.address, ethers.parseUnits("40000"));
            await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("40000"));
            
            await controller.setBulkDiscountRate(0);

            const cost = await controller.calculateDiscountedHP(5);
            expect(cost).to.equal(ethers.parseUnits("40000"));

            // Perform the batch mint
            const userBalanceBefore = await hpToken.balanceOf(user.address);
            await dogContract.connect(user).publicMint(5);
            const userBalanceAfter = await hpToken.balanceOf(user.address);
            // Verify HP deduction
            expect(userBalanceBefore - userBalanceAfter).to.equal(ethers.parseUnits("40000"));

        });

        it("B03 - Should handle controller partial payment with 25% discount", async function () {
            await hpToken.mint(user.address, ethers.parseUnits("16000"));
            await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("48000"));
            
            await controller.setBulkDiscountRate(25);
            
            const cost = await controller.calculateDiscountedHP(2);
            expect(cost).to.equal(ethers.parseUnits("12000"));

            // Perform the batch mint
            const userBalanceBefore = await hpToken.balanceOf(user.address);
            await dogContract.connect(user).publicMint(2);
            const userBalanceAfter = await hpToken.balanceOf(user.address);

            // Verify HP deduction
            expect(userBalanceBefore - userBalanceAfter).to.equal(ethers.parseUnits("12000"));
        });

        describe("Negative Tests", function () {
            it("N01 - Should revert on insufficient approval", async function () {
                await hpToken.mint(user.address, ethers.parseUnits("80000"));
                await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("60000"));
                await controller.setBulkDiscountRate(10);
    
                await expect(
                    dogContract.connect(user).publicMint(10)
                ).to.be.revertedWithCustomError(hpToken, "ERC20InsufficientAllowance");
            });
    
            it("N02 - Should revert when controller lacks HP balance", async function () {
                await hpToken.mint(user.address, ethers.parseUnits("80000"));            
                await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("72000"));
                await controller.setBulkDiscountRate(10);
                await controller.setBulkDiscountRate(0);
    
                await expect(
                    dogContract.connect(user).publicMint(10)
                ).to.be.revertedWithCustomError(hpToken, "ERC20InsufficientAllowance");
            });
    
            it("N03 - Should revert when non-owner calls restricted functions", async function () {
                await expect(
                    controller.connect(user).setBulkDiscountRate(10)
                ).to.be.revertedWithCustomError(dogContract,"AccessControlUnauthorizedAccount");
            });
    
            it("N04 - Should revert on zero quantity mint", async function () {
                await expect(
                    dogContract.connect(user).publicMint(0)
                ).to.be.revertedWith("Quantity must be > 0");
            });
    
            it("N05 - Should revert when exceeding supply limits", async function () {
                const maxMint = 120; 
                await hpToken.mint(user.address, ethers.parseUnits("1000000"));
                await hpToken.connect(user).approve(dogContract.target, ethers.parseUnits("1000000"));
    
                await expect(
                    dogContract.connect(user).publicMint(maxMint + 1)
                ).to.be.revertedWith("Exceeds initial supply");
            });
    
        });
     });
});
