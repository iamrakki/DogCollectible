// contracts/DogCollectibleFactory.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./DogCollectible.sol";

contract DogCollectibleFactory {
    address public owner;
    address[] public collections;
    event CollectionCreated(address indexed collection, address indexed owner);

    constructor() {
        owner = msg.sender;
    }

    function createCollection(
        string memory name,
        string memory symbol,
        string memory uri,
        uint8 smell,
        uint8 hearing,
        uint8 sight,
        uint8 taste,
        uint8 touch
    ) external {
        require(msg.sender == owner, "Only owner");
        DogCollectible c = new DogCollectible(
            name,
            symbol,
            uri,
            smell,
            hearing,
            sight,
            taste,
            touch
        );
        collections.push(address(c));
        emit CollectionCreated(address(c), msg.sender);
    }

    function getCollections() external view returns (address[] memory) {
        return collections;
    }
}
