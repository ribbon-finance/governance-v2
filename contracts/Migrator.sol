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
contract Migrator is Ownable {
    using SafeERC20 for IERC20;

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
    }

    /************************************************
     *  MIGRATION OPERATIONS
     ***********************************************/

    /**
     * @notice migrates RBN tokens to AEVO tokens
     *         migration assumes a 1:1 ratio between RBN and AEVO supply
     * @param _amount amount of RBN tokens to migrate
     */
    function migrateToAEVO(uint256 _amount) external {
        require(_amount > 0, "!_amount");

        // An approve() by the msg.sender is required beforehand
        RBN.safeTransferFrom(msg.sender, address(RBN), _amount);

        AEVO.safeTransfer(msg.sender, _amount);

        emit Migrated(_amount);
    }

    /**
     * @notice sends migrator's contract RBN balance to its owner
     *         to be used in case RBN holders accidentally send RBN
     *         to this contract instead of calling the migration functions
     */
    function rescue() external {
        uint256 amount = RBN.balanceOf(address(this));

        RBN.safeTransfer(owner(), amount);

        emit Rescued(amount);
    }
}
