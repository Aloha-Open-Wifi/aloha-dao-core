pragma solidity 0.6.5;

import "../../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

// This contract is for demo purposes only
contract AlohaMock is ERC20 {
    constructor () public ERC20("Aloha", "ALOHA") {
        _mint(msg.sender, 10000000000000000000000000);
    }
}
