pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IAlohaNFT.sol";

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
    event ProcessedProposal(uint256 proposalId, address proposer, string details, uint256 created);
    event ReviewedProposal(uint256 proposalId, address proposalModerator, ReviewStatus newStatus, uint256 created);
    event VotedProposal();
    event ProcessedProposal();
    event Deposit(address indexed user, uint256 tokenId, uint256 power, uint256 date);
    event Withdrawal(address indexed user, uint256 tokenId, uint256 power, uint256 date);

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
    // tokenOwner[tokenId] = address
    mapping (uint256 => address) public tokenOwner; 
    // usersPower[address] = totalPower
    mapping (address => uint256) public usersPower;
    // proposals[proposalId] = Proposal
    mapping(uint256 => Proposal) public proposals;

    struct User {
        uint256 canVote;        // Timestamp when user deposits delay ends
        uint256 canWithdraw;    // Timestamp when user withdraw delay ends
        uint256 power;          // Total value of the user votes
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

    enum ReviewStatus {
        Waiting,
        OK,
        KO
    }

    struct Proposal {
        address proposer;       // The account that submitted the proposal
        Action action;          // Proposal action to be exeuted
        string details;         // Proposal details URL
        uint256 starting;       // Min timestamp when users can start to vote
        uint256 yesVotes;       // Total YES votes
        uint256 noVotes;        // Total NO votes
        bool approved;          // Approved or not
        ReviewStatus review;
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

    /**
    * @dev Users deposits ALOHA NFT and gain voting power based on the rarity of the token.
    */
    function deposit(uint256 _tokenId) public {
        IERC721(alohaERC721).transferFrom(msg.sender, address(this), _tokenId);

        uint256 rarity = IAlohaNFT(alohaERC721).tokenRarity(_tokenId);

        users[msg.sender].canVote = _getTime() + votingDelay;
        users[msg.sender].canWithdraw = _getTime() + withdrawalDelay;
        users[msg.sender].power += powerByRarity[rarity - 1];

        tokenOwner[_tokenId] = msg.sender;

        emit Deposit(msg.sender, _tokenId, powerByRarity[rarity - 1], _getTime());
    }

    /**
    * @dev Users withdraws ALOHA NFT and lose voting power based on the rarity of the token.
    */
    function withdraw(uint256 _tokenId)
        public
        canWithdraw()
    {
        IERC721(alohaERC721).transferFrom(address(this), tokenOwner[_tokenId], _tokenId);

        uint256 rarity = IAlohaNFT(alohaERC721).tokenRarity(_tokenId);
        users[msg.sender].power -= powerByRarity[rarity - 1];

        tokenOwner[_tokenId] = address(0x0);

        emit Withdrawal(msg.sender, _tokenId, powerByRarity[rarity - 1], _getTime());
    }

    /**
    * @dev Users submits a on-chain proposal
    */
    function submitOnChainProposal(
        address _actionTo,
        uint256 _actionValue,
        bytes memory _actionData,
        string memory _details
    )
        public
        canSubmitProposal()
        returns (uint256 proposalId)
    {
        uint256 timeNow = _getTime();
        uint256 newProposalId = proposalCount;
        proposalCount += 1;

        Action memory onChainAction = Action({
            value: _actionValue,
            to: _actionTo,
            executed: false,
            data: _actionData
        });

        proposals[newProposalId] = Proposal({
            proposer: msg.sender,
            action: onChainAction,
            details: _details,
            starting: 0,
            yesVotes: 0,
            noVotes: 0,
            approved: false,
            review: ReviewStatus.Waiting,
            created: timeNow
        });

        emit ProcessedProposal(newProposalId, msg.sender, _details, timeNow);

        return newProposalId;
    }

    /**
    * @dev Moderator reviews proposal
    */
    function reviewProposal(uint256 _proposalId, ReviewStatus newStatus)
        public
        onlyModerator()
        inWaitingStatus(_proposalId)
    {
        require(newStatus != ReviewStatus.Waiting, 'AlohaGovernance: This proposal is already in Waiting status');

        uint256 timeNow = _getTime();
        
        proposals[_proposalId].review = newStatus;

        if (newStatus == ReviewStatus.OK) {
            proposals[_proposalId].starting = timeNow;
        }

        emit ReviewedProposal(_proposalId, msg.sender, newStatus, timeNow);
    }

    function setVotingDelay(uint256 _votingDelay) public onlyOwner() {
        votingDelay = _votingDelay;
    }

    function setWithdrawalDelay(uint256 _withdrawalDelay) public onlyOwner() {
        withdrawalDelay = _withdrawalDelay;
    }

    function setProposalModerator(address _proposalModerator) public onlyOwner() {
        proposalModerator = _proposalModerator;
    }

    function setSubmitProposalRequiredPower(uint256 _submitProposalRequiredPower) public onlyOwner() {
        submitProposalRequiredPower = _submitProposalRequiredPower;
    }

    /******************
    PRIVATE FUNCTIONS
    *******************/
    function _getTime() internal view returns (uint256) {
        return block.timestamp;
    }

    /******************
    MODIFIERS
    *******************/
    modifier canWithdraw() {
        require(
            _getTime() >= users[msg.sender].canWithdraw,
            "AlohaGovernance: User can't withdraw yet"
        );
        _;
    }

    modifier canSubmitProposal() {
        require(
            users[msg.sender].power >= submitProposalRequiredPower,
            "AlohaGovernance: User needs more power to submit proposal"
        );
        _;
         require(
            _getTime() >= users[msg.sender].canVote,
            "AlohaGovernance: User needs to wait some time in order to submit proposal"
        );
        _;
    }

    modifier onlyModerator() {
        require(
            msg.sender == proposalModerator,
            "AlohaGovernance: Only moderator can call this function"
        );
        _;
    }

    modifier inWaitingStatus(uint256 _proposalId) {
        require(
            proposals[_proposalId].review == ReviewStatus.Waiting,
            'AlohaGovernance: This proposal has already been reviewed'
        );
        _;
    }

}
