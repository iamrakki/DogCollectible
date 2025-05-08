// contracts/DogCollectible.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./HPController.sol";

contract DogCollectible is
    ERC721,
    ERC721Enumerable,
    ERC721Burnable,
    AccessControl
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    uint256 public initialSupply = 120;
    uint256 public initialMinted;
    uint256 public monthlyMintAmount = 10;
    uint256 public nextMintTimestamp;

    enum Level {
        Common,
        Standard,
        Rare,
        Epic,
        SuperRare
    }
    mapping(uint256 => Level) public levelOf;

    struct Stats {
        uint8 smell;
        uint8 hearing;
        uint8 sight;
        uint8 taste;
        uint8 touch;
    }
    Stats private baseStats;

    mapping(uint256 => mapping(string => uint256)) public giftCounts;

    // HP related mappings
    mapping(uint256 => uint256) private lastHpUpdate;
    mapping(uint256 => uint256) private currentHp;

    // HP multipliers (scaled by 100 for precision)
    uint256 private constant COMMON_HP_RATE = 180; // 1.8 per minute
    uint256 private constant STANDARD_HP_RATE = 450; // 4.5 per minute
    uint256 private constant RARE_HP_RATE = 1800; // 18 per minute
    uint256 private constant EPIC_HP_RATE = 7200; // 72 per minute
    uint256 private constant SUPER_RARE_HP_RATE = 28800; // 288 per minute

    string private baseTokenURI;
    uint256 private _tokenIdCounter;

    HPController public hpController;

    constructor(
        string memory name,
        string memory symbol,
        string memory uri,
        uint8 smell_,
        uint8 hearing_,
        uint8 sight_,
        uint8 taste_,
        uint8 touch_
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        baseTokenURI = uri;
        baseStats = Stats(smell_, hearing_, sight_, taste_, touch_);
        nextMintTimestamp = block.timestamp + 30 days;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory uri) external onlyRole(ADMIN_ROLE) {
        baseTokenURI = uri;
    }

    function setHPController(address _controller) external onlyRole(ADMIN_ROLE) {
        hpController = HPController(_controller);
    }

    function publicMint(uint256 quantity) external {


        require(
            initialMinted + quantity <= initialSupply,
            "Exceeds initial supply"
        );

                uint256 hpCost = hpController.calculateHP(quantity);
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tid = _tokenIdCounter++;
            initialMinted++;
            _mint(msg.sender, tid);
            levelOf[tid] = Level.Common;
        }
    }

    function mintToAddress(address to ,uint256 quantity) external {
        require(
            initialMinted + quantity <= initialSupply,
            "Exceeds initial supply"
        );
        uint256 hpCost = hpController.calculateDiscountedHP(quantity);
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tid = _tokenIdCounter++;
            initialMinted++;
            _mint(to, tid);
            levelOf[tid] = Level.Common;
        }
    }

    function mintMonthly(uint256 quantity) external onlyRole(ADMIN_ROLE) {
        require(block.timestamp >= nextMintTimestamp, "Too early");
        require(quantity <= monthlyMintAmount, "Exceeds monthly limit");
                uint256 hpCost = hpController.calculateHP(quantity);
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tid = _tokenIdCounter++;
            _mint(msg.sender, tid);
            levelOf[tid] = Level.Common;
        }
        nextMintTimestamp += 30 days;
    }

    // Merge functions
    function mergeCommons(uint256 a, uint256 b) external {
        require(
            ownerOf(a) == msg.sender && ownerOf(b) == msg.sender,
            "Not owner"
        );
        require(
            levelOf[a] == Level.Common && levelOf[b] == Level.Common,
            "Not common"
        );
        
        uint256 hpCost = hpController.calculateHP(2); 
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");

        _burn(a);
        _burn(b);
        uint256 tid = _tokenIdCounter++;
        _mint(msg.sender, tid);
        levelOf[tid] = Level.Standard;
    }

    function mergeStandards(uint256[] calldata ids) external {
        require(ids.length == 3, "Need 3");
        for (uint i; i < 3; i++) {
            require(ownerOf(ids[i]) == msg.sender, "Not owner");
            require(levelOf[ids[i]] == Level.Standard, "Not standard");
        }
        
        uint256 hpCost = hpController.calculateHP(3); 
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");

        for (uint i; i < 3; i++) {
            _burn(ids[i]);
        }
        uint256 tid = _tokenIdCounter++;
        _mint(msg.sender, tid);
        levelOf[tid] = Level.Rare;
    }

    function mergeRares(uint256[] calldata ids) external {
        require(ids.length == 5, "Need 5");
        for (uint i; i < 5; i++) {
            require(ownerOf(ids[i]) == msg.sender, "Not owner");
            require(levelOf[ids[i]] == Level.Rare, "Not rare");
        }

        uint256 hpCost = hpController.calculateHP(5); 
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");

        for (uint i; i < 5; i++) {
            _burn(ids[i]);
        }
        uint256 tid = _tokenIdCounter++;
        _mint(msg.sender, tid);
        levelOf[tid] = Level.Epic;
    }

    function mergeEpics(uint256[] calldata ids) external {
        require(ids.length == 3, "Need 3");
        for (uint i; i < 3; i++) {
            require(ownerOf(ids[i]) == msg.sender, "Not owner");
            require(levelOf[ids[i]] == Level.Epic, "Not epic");
        }

        uint256 hpCost = hpController.calculateHP(3);
        require(hpController.deductHP(msg.sender, hpCost), "Insufficient HP");

        for (uint i; i < 3; i++) {
            _burn(ids[i]);
        }
        uint256 tid = _tokenIdCounter++;
        _mint(msg.sender, tid);
        levelOf[tid] = Level.SuperRare;
    }

    function gift(uint256 tokenId, string calldata item) external {
        require(ownerOf(tokenId) != address(0), "Not exist");
        giftCounts[tokenId][item]++;
    }

    function getStats(uint256 tokenId) external view returns (Stats memory) {
        Stats memory b = baseStats;
        uint256 mult;
        if (levelOf[tokenId] == Level.Common) mult = 100;
        else if (levelOf[tokenId] == Level.Standard) mult = 115;
        else if (levelOf[tokenId] == Level.Rare) mult = 150;
        else if (levelOf[tokenId] == Level.Epic) mult = 200;
        else mult = 300;
        return
            Stats({
                smell: uint8((b.smell * mult) / 100),
                hearing: uint8((b.hearing * mult) / 100),
                sight: uint8((b.sight * mult) / 100),
                taste: uint8((b.taste * mult) / 100),
                touch: uint8((b.touch * mult) / 100)
            });
    }

    function updateHP(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 minutesPassed = (block.timestamp - lastHpUpdate[tokenId]) / 1 minutes;
        if (minutesPassed > 0) {
            uint256 hpRate;
            if (levelOf[tokenId] == Level.Common) {
                hpRate = COMMON_HP_RATE;
            } else if (levelOf[tokenId] == Level.Standard) {
                hpRate = STANDARD_HP_RATE;
            } else if (levelOf[tokenId] == Level.Rare) {
                hpRate = RARE_HP_RATE;
            } else if (levelOf[tokenId] == Level.Epic) {
                hpRate = EPIC_HP_RATE;
            } else if (levelOf[tokenId] == Level.SuperRare) {
                hpRate = SUPER_RARE_HP_RATE;
            }

            currentHp[tokenId] += (minutesPassed * hpRate) / 100;
            lastHpUpdate[tokenId] = block.timestamp;
        }
    }

    function getHP(uint256 tokenId) public view returns (uint256) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 minutesPassed = (block.timestamp - lastHpUpdate[tokenId]) / 1 minutes;
        if (minutesPassed == 0) return currentHp[tokenId];

        uint256 hpRate;
        if (levelOf[tokenId] == Level.Common) {
            hpRate = COMMON_HP_RATE;
        } else if (levelOf[tokenId] == Level.Standard) {
            hpRate = STANDARD_HP_RATE;
        } else if (levelOf[tokenId] == Level.Rare) {
            hpRate = RARE_HP_RATE;
        } else if (levelOf[tokenId] == Level.Epic) {
            hpRate = EPIC_HP_RATE;
        } else if (levelOf[tokenId] == Level.SuperRare) {
            hpRate = SUPER_RARE_HP_RATE;
        }

        return currentHp[tokenId] + ((minutesPassed * hpRate) / 100);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _mint(address to, uint256 tokenId) internal virtual override {
        super._mint(to, tokenId);
        lastHpUpdate[tokenId] = block.timestamp;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
