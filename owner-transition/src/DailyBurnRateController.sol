// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDailyBurnEngine {
    function owner() external view returns (address);
    function setDailyPoolBps(uint256 newBps) external;
}

/// @notice Permanent owner of a fixed set of burn engines; exposes only daily-rate changes.
/// @dev No ownership transfer, generic calls, upgrades, or registry/manager changes.
contract DailyBurnRateController {
    address public immutable rateManager;
    mapping(address => bool) public isBurnEngine;

    error Unauthorized();
    error InvalidEngine();
    event DailyRateChanged(address indexed engine, uint256 bps);

    constructor(address manager, address[] memory engines) {
        if (manager == address(0) || engines.length == 0) revert Unauthorized();
        rateManager = manager;
        for (uint256 i; i < engines.length; ++i) {
            address engine = engines[i];
            if (engine.code.length == 0 || isBurnEngine[engine] || IDailyBurnEngine(engine).owner() != manager) {
                revert InvalidEngine();
            }
            isBurnEngine[engine] = true;
        }
    }

    function setDailyPoolBps(address engine, uint256 bps) external {
        if (msg.sender != rateManager) revert Unauthorized();
        if (!isBurnEngine[engine]) revert InvalidEngine();
        IDailyBurnEngine(engine).setDailyPoolBps(bps);
        emit DailyRateChanged(engine, bps);
    }
}
