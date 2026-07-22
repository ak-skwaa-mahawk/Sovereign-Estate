// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Gwich’in Tribal Coin — For the People, For the Earth
contract TribalCoinGTC {
    string public name = "Gwich’in Tribal Coin";
    string public symbol = "GTC";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public creator;

    uint256 public constant DORMANCY_PERIOD = 365 days;

    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public verifiedTribal;
    mapping(address => bool) public blessings;
    mapping(address => uint256) public lastActive;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event BlessingSent(address indexed from, address indexed to, string message);
    event TribalVerified(address indexed user);
    event DormantCoinsReclaimed(address indexed user, uint256 amount, address indexed recipient);

    modifier onlyCreator() {
        require(msg.sender == creator, "Not authorized.");
        _;
    }

    modifier onlyVerified() {
        require(verifiedTribal[msg.sender], "Not a verified community member.");
        _;
    }

    constructor(uint256 initialSupply) {
        creator = msg.sender;
        totalSupply = initialSupply * (10 ** uint256(decimals));
        balanceOf[creator] = totalSupply;
        lastActive[creator] = block.timestamp;
    }

    function verifyTribalWallet(address user) public onlyCreator {
        verifiedTribal[user] = true;
        if (lastActive[user] == 0) {
            lastActive[user] = block.timestamp;
        }
        emit TribalVerified(user);
    }

    function transfer(address to, uint256 value) public returns (bool success) {
        require(balanceOf[msg.sender] >= value, "Not enough balance.");
        require(balanceOf[to] + value <= totalSupply / 50, "No wallet can own more than 2%.");
        require(value <= 1000 * (10 ** uint256(decimals)), "Transfer too large — coin is for the people.");
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;

        lastActive[msg.sender] = block.timestamp;
        lastActive[to] = block.timestamp;

        emit Transfer(msg.sender, to, value);
        return true;
    }

    function sendBlessing(address to, string memory message) public returns (bool) {
        blessings[to] = true;
        lastActive[msg.sender] = block.timestamp;
        emit BlessingSent(msg.sender, to, message);
        return true;
    }

    function reclaimDormantCoins(address user) public onlyCreator {
        require(user != creator, "Cannot reclaim creator wallet.");
        require(lastActive[user] != 0, "Wallet has no recorded activity.");
        require(block.timestamp >= lastActive[user] + DORMANCY_PERIOD, "Wallet is not dormant yet.");

        uint256 reclaimed = balanceOf[user];
        require(reclaimed > 0, "No balance to reclaim.");

        balanceOf[user] = 0;
        balanceOf[creator] += reclaimed;

        emit DormantCoinsReclaimed(user, reclaimed, creator);
    }
}
