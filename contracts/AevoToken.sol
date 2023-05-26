// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * AEVO: STRUCTURED PRODUCTS FOR THE PEOPLE
 */
contract Aevo is AccessControl, ERC20Permit {
    /// @dev The identifier of the role which maintains other roles.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    /// @dev The identifier of the role which allows accounts to mint tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    constructor(
        string memory name,
        string memory symbol,
        address beneficiary
    ) ERC20Permit(name) ERC20(name, symbol) {
        // Add beneficiary as minter
        _setupRole(MINTER_ROLE, beneficiary);
        // Add beneficiary as admin
        _setupRole(ADMIN_ROLE, beneficiary);
        // Set ADMIN role as admin of minter role
        //_setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
    }

    /// @dev A modifier which checks that the caller has the minter role.
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "AevoToken: only minter");
        _;
    }

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    function mint(address _recipient, uint256 _amount) external onlyMinter {
        _mint(_recipient, _amount);
    }
}
