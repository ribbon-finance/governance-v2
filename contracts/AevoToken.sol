/* SPDX-License-Identifier: GPL-3.0 

888       888 888               888    d8b                                                                                 d8b 888    d8b                  .d8888b.  
888   o   888 888               888    88P                                                                                 Y8P 888    Y8P                 d88P  Y88b 
888  d8b  888 888               888    8P                                                                                      888                             .d88P 
888 d888b 888 88888b.   8888b.  888888 "  .d8888b       888  888  .d88b.  888  888 888d888      88888b.   .d88b.  .d8888b  888 888888 888  .d88b.  88888b.   .d88P"  
888d88888b888 888 "88b     "88b 888       88K           888  888 d88""88b 888  888 888P"        888 "88b d88""88b 88K      888 888    888 d88""88b 888 "88b  888"    
88888P Y88888 888  888 .d888888 888       "Y8888b.      888  888 888  888 888  888 888          888  888 888  888 "Y8888b. 888 888    888 888  888 888  888  888     
8888P   Y8888 888  888 888  888 Y88b.          X88      Y88b 888 Y88..88P Y88b 888 888          888 d88P Y88..88P      X88 888 Y88b.  888 Y88..88P 888  888          
888P     Y888 888  888 "Y888888  "Y888     88888P'       "Y88888  "Y88P"   "Y88888 888          88888P"   "Y88P"   88888P' 888  "Y888 888  "Y88P"  888  888  888     
                                                             888                                888                                                                  
                                                        Y8b d88P                                888                                                                  
                                                         "Y88P"                                 888 
*/ 

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Aevo Token
 * @notice Governance token of the Aevo exchange and rollup
 * @dev ERC20 in addition to:
 *        - EIP-2612 signed approval implementation
 *        - `mint` functionality by Aevo DAO  
 */
contract Aevo is AccessControl, ERC20Permit, Ownable {
    using SafeERC20 for IERC20;

    /************************************************
     * INTERFACES
     ***********************************************/

    ///@notice RBN token interface
    IERC20 public immutable RBN;

    /************************************************
     *  EVENTS
     ***********************************************/

    /// @notice emits an event when there is a rescue
    event Rescued(uint256 amount);

    /************************************************
     *  STORAGE
     ***********************************************/

    /// @dev The identifier of the role which maintains other roles.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    /// @dev The identifier of the role which allows accounts to mint tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    /************************************************
     *  CONSTRUCTOR
     ***********************************************/

    constructor(
        string memory name,
        string memory symbol,
        address beneficiary,
        IERC20 _rbn
    ) ERC20Permit(name) ERC20(name, symbol) {
        require(address(_rbn) != address(0), "Aevo: RBN address cannot be 0");

        // Add beneficiary as minter
        _grantRole(MINTER_ROLE, beneficiary);
        // Add beneficiary as admin
        _grantRole(ADMIN_ROLE, beneficiary);
        // Set ADMIN role as admin of minter role
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);

        RBN = _rbn;
    }

    /************************************************
     *  TOKEN OPERATIONS
     ***********************************************/

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    function mint(address _recipient, uint256 _amount) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Aevo: only minter");

        _mint(_recipient, _amount);
    }

    /// @notice sends Aevo token contract's RBN balance to its owner
    ///         to be used in case RBN holders accidentally send RBN
    ///         to this contract
    function rescue() external {
        uint256 amount = RBN.balanceOf(address(this));
        require(amount > 0, "Aevo: amount cannot be 0");

        RBN.safeTransfer(owner(), amount);

        emit Rescued(amount);
    }
}
