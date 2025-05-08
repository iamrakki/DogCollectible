// contracts/HPController.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract HPController is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    mapping(address => uint256) public userHP;
    uint256 public baseHPCost = 8000;
    uint256 public bulkDiscountRate = 10;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function setBaseHPCost(uint256 _cost) external onlyRole(ADMIN_ROLE) {
        baseHPCost = _cost;
    }

    function setBulkDiscountRate(uint256 _rate) external onlyRole(ADMIN_ROLE) {
        require(_rate <= 50, "Max 50% discount");
        bulkDiscountRate = _rate;
    }

    function calculateHP(uint256 quantity) public view returns (uint256) {
    return baseHPCost * quantity;
}

function calculateDiscountedHP(uint256 quantity) public view returns (uint256) {
    uint256 discount = bulkDiscountRate;
    require(discount <= 100, "Invalid discount rate");
    uint256 totalCost = baseHPCost * quantity * (100 - discount) / 100;
    return totalCost;
}

    function deductHP(address user, uint256 amount) external returns (bool) {
        if (userHP[user] >= amount) {
            userHP[user] -= amount;
            return true;
        }
        return false;
    }

    function addHP(address user, uint256 amount) external onlyRole(ADMIN_ROLE) {
        userHP[user] += amount;
    }

    function removeHP(address user, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(userHP[user] >= amount, "Insufficient HP");
        userHP[user] -= amount;
    }
}
