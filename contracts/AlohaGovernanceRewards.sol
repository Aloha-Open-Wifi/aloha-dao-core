pragma solidity 0.6.5;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IAlohaNFT.sol";

contract AlohaGovernanceRewards is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeMath for uint;

    event Claimed(address indexed wallet, address indexed rewardToken, uint amount);
    event Rewarded(address indexed rewardToken, uint amount, uint totalStaked, uint date);
    event Log3(string data0, uint256 data1, uint256 data2);

    uint BIGNUMBER = 10**18;

    mapping (address => uint) public stakeMap;
    mapping (address => uint) public userClaimableRewardPerStake;

    uint256 public totalRewards;
    uint256 public tokenTotalStaked;
    uint256 public tokenCummulativeRewardPerStake;
    address public rewardToken;

    constructor(address _rewardToken) public {
        rewardToken = _rewardToken;
    }

    function staked(address _staker) external view returns (uint) {
        return stakeMap[_staker];
    }

    function _stake(uint _amount) internal returns (bool){
        require(_amount != 0, "Amount can't be 0");

        if (stakeMap[msg.sender] == 0) {
            stakeMap[msg.sender] = _amount;
            userClaimableRewardPerStake[msg.sender] = tokenCummulativeRewardPerStake;
        }else{
            _claim();
            stakeMap[msg.sender] = stakeMap[msg.sender].add(_amount);
        }
        tokenTotalStaked = tokenTotalStaked.add(_amount);

        return true;
    }

    /**
    * @dev pay out dividends to stakers, update how much per token each staker can claim
    */
    function distribute() public returns (bool) {
        require(tokenTotalStaked != 0, "AlohaGovernanceRewards: Total staked must be more than 0");

        uint256 currentBalance = IERC20(rewardToken).balanceOf(address(this));
        
        if (currentBalance == 0) {
            return false;
        }
        
        uint256 reward = currentBalance.sub(totalRewards);
        totalRewards = totalRewards.add(reward);

        if (totalRewards == 0) {
            return false;
        }

        tokenCummulativeRewardPerStake += reward.mul(BIGNUMBER) / tokenTotalStaked;
        emit Rewarded(rewardToken, reward, tokenTotalStaked, _getTime());
        return true;
    }

    function calculateReward(address _staker) public returns (uint) {
        distribute();

        uint stakedAmount = stakeMap[_staker];
        //the amount per token for this user for this claim
        uint amountOwedPerToken = tokenCummulativeRewardPerStake.sub(userClaimableRewardPerStake[_staker]);
        uint claimableAmount = stakedAmount.mul(amountOwedPerToken); //total amount that can be claimed by this user
        claimableAmount = claimableAmount.div(BIGNUMBER); //simulate floating point operations
        return claimableAmount;
    }

    function _unstake(uint256 _amount) internal returns (bool){
        require(_amount > 0, "AlohaGovernanceRewards: Amount can't be 0");
        _claim();

        stakeMap[msg.sender] = stakeMap[msg.sender] - _amount; // .sub doesn't works here
        tokenTotalStaked = tokenTotalStaked.sub(_amount);

        return true;
    }

    /**
    * @dev claim dividends for a particular token that user has stake in.
    */
    function _claim() internal returns (uint) {
        uint claimableAmount = calculateReward(msg.sender);
        if (claimableAmount == 0) {
            return claimableAmount;
        }
        userClaimableRewardPerStake[msg.sender] = tokenCummulativeRewardPerStake;
        require(IERC20(rewardToken).transfer(msg.sender, claimableAmount), "AlohaGovernanceRewards: Transfer failed");

        totalRewards = totalRewards.sub(claimableAmount);

        emit Claimed(msg.sender, rewardToken, claimableAmount);
        return claimableAmount;
    }

    function _getTime() internal view returns (uint256) {
        // solhint-disable-next-line not-rely-on-time
        return now;
    }
}