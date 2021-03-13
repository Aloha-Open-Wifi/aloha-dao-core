pragma solidity 0.6.5;

// This contract is for demo purposes only
contract DummyMock {

    uint256 public status;

    constructor () public {
        status = 0;
    }

    function setValue(uint256 _status) public returns (uint256 newStatus) {
        status = _status;
        return status;
    }

}
