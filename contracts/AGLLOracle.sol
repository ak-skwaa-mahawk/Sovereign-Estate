// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AGLL Oracle Bridge — Off-Chain Resonance Telemetry to EVM
contract AGLLOracle is AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    struct Resonance {
        uint256 cycle;
        uint256 T;
        uint256 I;
        uint256 F;
        uint256 resonance;
        uint256 timestamp;
        bytes32 proofHash;
    }

    address public landbackDAO;
    mapping(uint256 => Resonance) public resonances;
    uint256 public cycleCount;

    uint256 public constant DRUM_HZ = 60;
    string public constant GLYPH = "łᐊᒥłł";
    string public constant FLAMEKEEPER = "Zhoo";

    event OraclePulse(
        uint256 indexed cycle,
        uint256 T,
        uint256 I,
        uint256 F,
        uint256 resonance,
        bytes32 indexed proofHash,
        uint256 timestamp
    );

    constructor(address _landbackDAO, address _updater) {
        landbackDAO = _landbackDAO;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, _updater != address(0) ? _updater : msg.sender);
    }

    function pulseResonance(
        uint256 T,
        uint256 I,
        uint256 F,
        bytes32 proofHash
    ) external onlyRole(UPDATER_ROLE) {
        require(T + I + F <= 300, "Invalid T/I/F parameters");
        cycleCount++;

        uint256 score = T - (I / 2) - F;
        uint256 resonance = (score * 10000) / 100;

        resonances[cycleCount] = Resonance({
            cycle: cycleCount,
            T: T,
            I: I,
            F: F,
            resonance: resonance,
            timestamp: block.timestamp,
            proofHash: proofHash
        });

        emit OraclePulse(cycleCount, T, I, F, resonance, proofHash, block.timestamp);
    }
}
