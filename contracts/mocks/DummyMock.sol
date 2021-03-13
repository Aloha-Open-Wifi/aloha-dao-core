pragma solidity 0.6.5;

// This contract is for demo purposes only
contract DummyMock {

    uint256 value;

    constructor () public {
    }

    function setValue (uint256 _value) public {
        value = _value;
    }

}
