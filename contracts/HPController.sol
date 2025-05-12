// contracts/HPController.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract HPController is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    IERC20 public immutable hpToken;
    uint256 public baseHPCost = 8000;
    uint256 public bulkDiscountRate = 10;

    event HPDeducted(address indexed user, uint256 amount);
    event HPAdded(address indexed user, uint256 amount);
    event HPWithdrawn(address indexed admin, uint256 amount);

    constructor(address _hpToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        hpToken = IERC20(_hpToken);
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
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not authorized");
        if (hpToken.balanceOf(user) >= amount) {
            require(hpToken.allowance(user, msg.sender) >= amount, "Insufficient allowance");
            hpToken.safeTransferFrom(user, address(this), amount);
            emit HPDeducted(user, amount);
            return true;
        }
        return false;
    }

    function addHP(address user, uint256 amount) external onlyRole(ADMIN_ROLE) {
        hpToken.safeTransfer(user, amount);
        emit HPAdded(user, amount);
    }

    function getUserHP(address user) external view returns (uint256) {
        return hpToken.balanceOf(user);
    }

    function withdrawHP(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(hpToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        hpToken.safeTransfer(msg.sender, amount);
        emit HPWithdrawn(msg.sender, amount);
    }

}
