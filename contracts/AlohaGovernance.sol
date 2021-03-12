pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AlohaGovernance is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeMath for uint8;

    /****************
    Governance config
    *****************/
    uint256 public powerLimit = 4000;                   // User max vote power: 40%
    uint256 public votingDelay = 3 days;                // Time to wait before deposit power counts
    uint256 public withdrawalDelay = 7 days;            // Time to wait before can withdraw deposit
    uint256 public submitProposalRequiredPower = 10;    // Minimal power to create a proposal
    uint256 public votingDuration = 7 days;             // Proposal voting duration
    uint256 public proprosalMinimunPower = 100;         // Minimal required total participating power to apply result
    address public proposalModerator;                   // Address who must review each proposal before voting starts
    uint256[] public powerByRarity = [1, 5, 50];        // Token power by rarity (1, 2 and 3)

    /*****
    EVENTS
    ******/
    event SubmitedProposal();
    event VotedProposal();
    event ProcessedProposal();
    event Deposit();
    event Withdrawal();

    /******************
    INTERNAL ACCOUNTING
    *******************/
    address public alohaERC20;
    address public alohaERC721;

    uint256 public proposalCount = 0;   // Total proposals submitted
    uint256 public totalPower = 0;      // Total users power
    uint256[] public proposalQueue;

    // users[address] = User
    mapping (address => User) public users; 
    // users[address] = tokens[]
    mapping (address => uint256[]) public usersTokens; 
    // usersPower[address] = totalPower
    mapping (address => uint256) public usersPower;
    // proposals[index] = Proposal
    mapping(uint256 => Proposal) public proposals;

    struct User {
        uint256 canVote;        // Timestamp when user deposits delay ends
        uint256 canWithdraw;    // Timestamp when user withdraw delay ends
    }

    struct Action {
        address to;         // Address to call
        uint256 value;      // Call ETH transfer
        bytes data;         // Call data
        bool executed;      // Already executed or not
    }

    enum Vote {
        Null,   // default value
        Yes,
        No
    }

    struct Proposal {
        address proposer;       // The account that submitted the proposal
        Action action;          // Proposal action to be exeuted
        string details;         // Proposal details URL
        uint256 starting;       // Min timestamp when users can start to vote
        uint256 yesVotes;       // Total YES votes
        uint256 noVotes;        // Total NO votes
        bool approved;          // Approved or not
        uint256 status;         // 0 = Waiting review, 1 = Review OK, 9 = Review KO
        uint256 created;        // Created timestamp
        mapping(address => Vote) votesByMember; // Votes by user
    }

    /******************
    PUBLIC FUNCTIONS
    *******************/
    constructor(
        address _alohaERC20,
        address _alohaERC721
    ) public {
        require(address(_alohaERC20) != address(0)); 
        require(address(_alohaERC721) != address(0));

        alohaERC20 = _alohaERC20;
        alohaERC721 = _alohaERC721;
        proposalModerator = msg.sender;
    }

    function deposit(uint256 _tokenId) public {
        IERC721(alohaERC721).transferFrom(msg.sender, address(this), _tokenId);

        users[msg.sender].canVote = _getTime() + votingDelay;
        users[msg.sender].canWithdraw = _getTime() + withdrawalDelay;
        usersTokens[msg.sender].push(_tokenId);
    }

    function userTokens(address user) public view returns(uint256[] memory) {
        return usersTokens[user];
    }

    function userTokensTotal(address user) public view returns(uint256) {
        return usersTokens[user].length;
    }

    /******************
    PRIVATE FUNCTIONS
    *******************/
    function _getTime() internal view returns (uint256) {
        return block.timestamp;
    }
}
