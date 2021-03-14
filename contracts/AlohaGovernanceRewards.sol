pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IAlohaNFT.sol";

contract AlohaGovernanceRewards is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeMath for uint8;

    /******************
    CONFIG
    ******************/
    address public alohaERC20;


    /******************
    EVENTS
    ******************/
    event Claimed(address indexed user, uint amount);
    event Rewarded(uint256 amount, uint256 totalStaked, uint date);


    /******************
    INTERNAL ACCOUNTING
    *******************/
    uint256 public totalStaked;
    uint256 public cummulativeRewardsPerStake;

    // stakesMap[address] = amount 
    mapping (address => uint256) public stakesMap;
    // usersClaimableRewardsPerStake[address] = amount
    mapping (address => uint256) public usersClaimableRewardsPerStake;


    /******************
    CONSTRUCTOR
    *******************/
    constructor (address _alohaERC20) internal {
        alohaERC20 = _alohaERC20;
    }

    /******************
    PUBLIC FUNCTIONS
    *******************/
    function distribute() public {
        require(totalStaked != 0, "AlohaGovernanceRewards: Total staked must be more than 0");
        
        uint256 reward = IERC20(alohaERC20).balanceOf(address(this));
        cummulativeRewardsPerStake = cummulativeRewardsPerStake.sum(reward.div(totalStaked));
        
        emit Rewarded(_reward, totalStaked, _getTime());
    }

    function calculateReward(address _user) public view returns (uint256 amount) {
        distribute();

        uint256 stakedAmount = stakesMap[_user];
        uint256 amountOwedPerToken = cummulativeRewardsPerStake.sub(usersClaimableRewardsPerStake[_user]);
        uint256 claimableAmount = stakedAmount.mul(amountOwedPerToken); 
        
        claimableAmount = claimableAmount.div(BIGNUMBER);
        
        return claimableAmount;
    }

    function claim() public {
        uint256 claimableAmount = calculateReward(msg.sender);
        if (claimableAmount == 0) {
            return claimableAmount;
        }

        usersClaimableRewardsPerStake[msg.sender] = cummulativeRewardsPerStake;
        
        require(IERC20(alohaERC20).transfer(msg.sender, claimableAmount), "AlohaGovernanceRewards: Transfer failed");
        
        emit Claimed(msg.sender, claimableAmount);
    }


    /******************
    PRIVATE FUNCTIONS
    *******************/
    function _stake(uint256 _amount) internal {
        require(_amount != 0, "AlohaGovernanceRewards: Amount can't be 0");

        if (stakesMap[msg.sender] == 0) {
            stakesMap[msg.sender] = _amount;
            usersClaimableRewardsPerStake[msg.sender] = cummulativeRewardsPerStake;
        }else{
            claim();
            stakesMap[msg.sender] = stakesMap[msg.sender].add(_amount);
        }

        totalStaked = totalStaked.add(_amount);
    }

    function _withdraw(uint256 _amount) internal {
        require(_amount != 0, "AlohaGovernanceRewards: Amount can't be 0");
        
        claim();
        stakesMap[msg.sender] = stakesMap[msg.sender].sub(_amount);
        totalStaked = totalStaked.sub(_amount);
    }

    function _getTime() internal view returns (uint256) {
        return block.timestamp;
    }

}