// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockHPToken is ERC20 {
    constructor() ERC20("Happiness Token", "HP") {
        _mint(msg.sender, 1000000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
