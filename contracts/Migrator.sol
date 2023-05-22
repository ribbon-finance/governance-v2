// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RbnToAevoMigrator
 * @notice This contract implements the migration from RBN to AEVO token
 * @author Aevo team
 */
contract RbnToAevoMigrator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /************************************************
     * CONSTANTS
     ***********************************************/

    ///@notice multiplier for ratio calculations
    uint256 internal constant RATIO_MULTIPLIER = 10**2;

    /************************************************
     * INTERFACES
     ***********************************************/

    ///@notice RBN token interface
    IERC20 public immutable RBN;

    ///@notice AEVO token interface
    IERC20 public immutable AEVO;

    /************************************************
     *  EVENTS
     ***********************************************/

    /// @notice emits an event when there is a migration
    event Migrated(uint256 amount);

    /// @notice emits an event when there is a rescue
    event Rescued(uint256 amount);

    /************************************************
     *  STORAGE
     ***********************************************/

    ///@notice ratio of RBN supply divided by AEVO supply (with 2 decimals - eg. 10.55 = 1055)
    uint256 public immutable RBN_AEVO_RATIO;

    /************************************************
     *  CONSTRUCTOR
     ***********************************************/

    /**
     * @notice constructor
     * @param _rbn RBN token address
     * @param _aevo AEVO token address
     */
    constructor(IERC20 _rbn, IERC20 _aevo) {
        require(address(_rbn) != address(0), "!_rbn");
        require(address(_aevo) != address(0), "!_aevo");

        RBN = _rbn;
        AEVO = _aevo;
        RBN_AEVO_RATIO = 1000; // 10.00 - selected ratio
    }

    /************************************************
     *  MIGRATION OPERATIONS
     ***********************************************/

    /**
     * @notice migrates RBN tokens to AEVO tokens
     * @param _amount amount of RBN tokens to migrate
     */
    function migrateToAEVO(uint256 _amount) external nonReentrant {
        require(_amount * RATIO_MULTIPLIER >= RBN_AEVO_RATIO, "!_amount");

        // An approve() by the msg.sender is required beforehand
        RBN.safeTransferFrom(msg.sender, address(RBN), _amount);

        AEVO.safeTransfer(
            msg.sender,
            (_amount * RATIO_MULTIPLIER) / RBN_AEVO_RATIO
        );

        emit Migrated(_amount);
    }

    /**
     * @notice sends migrator's contract RBN balance to its owner
     *         to be used in case RBN holders accidentally send RBN
     *         to this contract instead of calling migrateToAEVO function
     */
    function rescue() external nonReentrant {
        uint256 amount = RBN.balanceOf(address(this));

        RBN.safeTransfer(owner(), amount);

        emit Rescued(amount);
    }
}
