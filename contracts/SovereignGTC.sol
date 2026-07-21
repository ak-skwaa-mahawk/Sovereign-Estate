// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SovereignGTC
 * @dev Implements an ERC-20 Token Substrate for the Sovereign-Manifold Namespace.
 */
contract SovereignGTC {
    string public constant name = "Sovereign GTC";
    string public constant symbol = "GTC";
    uint8 public constant decimals = 18;
    
    uint256 public immutable totalSupply;
    address public immutable owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event NoisePurged(address indexed burnedFrom, uint256 amount);

    constructor() {
        owner = msg.sender;
        totalSupply = 1_000_000_000 * 10**uint256(decimals);
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        require(_balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address tokenOwner, address spender) public view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(_balances[from] >= amount, "ERC20: transfer amount exceeds balance");
        require(_allowances[from][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");

        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function purgeNoise(uint256 amount) public returns (bool) {
        require(_balances[msg.sender] >= amount, "Sovereign: insufficient balance to purge");

        _balances[msg.sender] -= amount;
        emit Transfer(msg.sender, address(0), amount);
        emit NoisePurged(msg.sender, amount);
        return true;
    }
}
