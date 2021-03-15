const { expectRevert, expectEvent, BN, time } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');
const { expect } = require('chai');

const AlohaGovernance = artifacts.require("AlohaGovernance");
const AlohaMock = artifacts.require("AlohaMock");
const AlohaNFTMock = artifacts.require("AlohaNFTMock");
const DummyMock = artifacts.require("DummyMock");

contract('AlohaGovernance', function (accounts) {

  const powerByRarity = [1, 5, 50];

  beforeEach(async function () {
    // Deploy
    this.alohaMock = await AlohaMock.new({ from: accounts[0] });
    this.alohaNFTMock = await AlohaNFTMock.new({ from: accounts[0] });
    this.dummyMock = await DummyMock.new({ from: accounts[0] });

    this.alohaGovernance = await AlohaGovernance.new(
      this.alohaMock.address,
      this.alohaNFTMock.address,
      { from: accounts[0] }
    );

    this.alohaGovernance.setPowerLimit(10001, { from: accounts[0] });
    
    // Transfer
    const alohaAmount= '5000000000000000000';
    this.alohaMock.transfer(
      accounts[1],
      alohaAmount,
      { from: accounts[0] }
    );

    this.alohaNFTMock.awardItem(
      accounts[1],
      1,
      1,
      1,
      { from: accounts[0] }
    );

    this.alohaNFTMock.awardItem(
      accounts[1],
      2,
      2,
      2,
      { from: accounts[0] }
    );

    this.alohaNFTMock.awardItem(
      accounts[1],
      3,
      3,
      3,
      { from: accounts[0] }
    );

    // Permissions
    await this.alohaMock.approve(
      this.alohaGovernance.address,
      alohaAmount,
      { from: accounts[1] }
    );

    await this.alohaNFTMock.setApprovalForAll(
      this.alohaGovernance.address,
      true,
      { from: accounts[1] }
    );

  }); 

  describe('alohaERC20', function () {

    it('has correct value', async function() {
      assert.equal(
        await this.alohaGovernance.alohaERC20.call().valueOf(),
        this.alohaMock.address,
        'AlohaGovernance instance has not correct alohaERC20 value'
      );
    });

  });

  describe('alohaERC721', function () {

    it('has correct value', async function() {
      assert.equal(
        await this.alohaGovernance.alohaERC721.call().valueOf(),
        this.alohaNFTMock.address,
        'AlohaGovernance instance has not correct alohaERC721 value'
      );
    });

  });

  describe('setters', function () {

    it('setVotingDelay', async function() {
      await this.alohaGovernance.setVotingDelay(time.duration.days(4))
      assert.equal(
        Number((await this.alohaGovernance.votingDelay.call().valueOf())),
        Number(time.duration.days(4)),
        'votingDelay has not correct value'
      );
    });

    it('setWithdrawalDelay', async function() {
      await this.alohaGovernance.setWithdrawalDelay(time.duration.days(4))
      assert.equal(
        Number(await this.alohaGovernance.withdrawalDelay.call().valueOf()),
        Number(time.duration.days(4)),
        'withdrawalDelay has not correct value'
      );
    });

    it('setProposalModerator', async function() {
      await this.alohaGovernance.setProposalModerator(accounts[2])
      assert.equal(
        await this.alohaGovernance.proposalModerator.call().valueOf(),
        accounts[2],
        'proposalModerator has not correct value'
      );
    });

    it('setSubmitProposalRequiredPower', async function() {
      await this.alohaGovernance.setSubmitProposalRequiredPower(100)
      assert.equal(
        await this.alohaGovernance.submitProposalRequiredPower.call().valueOf(),
        100,
        'submitProposalRequiredPower has not correct value'
      );
    });

    it('setVotingDuration', async function() {
      await this.alohaGovernance.setVotingDuration(time.duration.days(4))
      assert.equal(
        Number(await this.alohaGovernance.votingDuration.call().valueOf()),
        Number(time.duration.days(4)),
        'votingDuration has not correct value'
      );
    });

    it('setPowerLimit', async function() {
      await this.alohaGovernance.setPowerLimit(5000)
      assert.equal(
        Number(await this.alohaGovernance.powerLimit.call().valueOf()),
        Number(5000),
        'powerLimit has not correct value'
      );
    });

  });

  describe('Deposit', function () {

    it('add fisrt token', async function() {
      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      const userOwner = await this.alohaGovernance.tokenOwner.call(1).valueOf();
      assert.equal(
        userOwner,
        accounts[1],
        'userOwner does not match'
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const rarity = await this.alohaNFTMock.tokenRarity.call(tokenId).valueOf();
      assert.equal(
        user.power,
        powerByRarity[rarity - 1],
        'user power is not correct'
      );
    });

    it('add second token', async function() {
      const tokenIdOne = 1;
      const tokenIdTwo = 2;
      await this.alohaGovernance.deposit(
        tokenIdOne,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenIdTwo,
        { from: accounts[1] }
      );

      const userOwner = await this.alohaGovernance.tokenOwner.call(tokenIdTwo).valueOf();
      assert.equal(
        userOwner,
        accounts[1],
        'userOwner doesn\'t match'
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const rarityOne = await this.alohaNFTMock.tokenRarity.call(tokenIdOne).valueOf();
      const rarityTwo = await this.alohaNFTMock.tokenRarity.call(tokenIdTwo).valueOf();
      assert.equal(
        user.power,
        powerByRarity[rarityOne - 1] + powerByRarity[rarityTwo - 1],
        'user power is not correct'
      );
    });

    it('totalPower', async function() {
      const tokenIdOne = 1;
      const tokenIdTwo = 2;

      await this.alohaGovernance.deposit(
        tokenIdOne,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenIdTwo,
        { from: accounts[1] }
      );

      const totalPower = await this.alohaGovernance.totalPower.call().valueOf();
      const rarityOne = await this.alohaNFTMock.tokenRarity.call(tokenIdOne).valueOf();
      const rarityTwo = await this.alohaNFTMock.tokenRarity.call(tokenIdTwo).valueOf();

      assert.equal(
        powerByRarity[rarityOne - 1] + powerByRarity[rarityTwo - 1],
        totalPower,
        'totalPower wrong value'
      );
    });

    it('transfers the token', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );

      const tokenOwner = await this.alohaNFTMock.ownerOf.call(1).valueOf();
      assert.equal(
        tokenOwner,
        this.alohaGovernance.address,
        'token owner is not the governance address'
      );
    });

  });

  describe('Withdraw', function () {
    
    it('delay in progress', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.withdraw(1, { from: accounts[1] }),
        'AlohaGovernance: User can\'t withdraw yet'
      );
    });

    it('with one token', async function() {
      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenId,
        { from: accounts[1] }
      );

      const userOwner = await this.alohaGovernance.tokenOwner.call(1).valueOf();
      assert.equal(
        userOwner,
        0,
        'userOwner does not match'
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      assert.equal(
        user.power,
        0,
        'user power is not correct'
      );
    });

    it('with two tokens', async function() {
      const tokenIdOne = 1;
      const tokenIdTwo = 2;
      await this.alohaGovernance.deposit(
        tokenIdOne,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenIdTwo,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenIdOne,
        { from: accounts[1] }
      );

      const userOwner = await this.alohaGovernance.tokenOwner.call(1).valueOf();
      assert.equal(
        userOwner,
        0,
        'userOwner does not match'
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const rarityTwo = await this.alohaNFTMock.tokenRarity.call(tokenIdTwo).valueOf();
      assert.equal(
        user.power,
        powerByRarity[rarityTwo - 1],
        'user power is not correct'
      );
    });

    it('transfers the token back', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        2,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        3,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        2,
        { from: accounts[1] }
      );

      const tokenOwner = await this.alohaNFTMock.ownerOf.call(2).valueOf();
      assert.equal(
        tokenOwner,
        accounts[1],
        'token owner is not the user address'
      );
    });

    it('totalPower', async function() {
      const tokenIdOne = 1;
      const tokenIdTwo = 2;
      const tokenIdThree = 3;

      await this.alohaGovernance.deposit(
        tokenIdOne,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenIdTwo,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenIdThree,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenIdTwo,
        { from: accounts[1] }
      );

      const totalPower = await this.alohaGovernance.totalPower.call().valueOf();
      const rarityOne = await this.alohaNFTMock.tokenRarity.call(tokenIdOne).valueOf();
      const rarityThree = await this.alohaNFTMock.tokenRarity.call(tokenIdThree).valueOf();

      assert.equal(
        powerByRarity[rarityOne - 1] + powerByRarity[rarityThree - 1],
        totalPower,
        'totalPower wrong value'
      );
    });

  });

  describe('Submit on-chain proposal', function () {

    it('with no power', async function() {
      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      await expectRevert(
        this.alohaGovernance.submitOnChainProposal(
          actionTo,
          actionValue,
          actionData,
          details,
          { from: accounts[1] }
        ),
        'AlohaGovernance: User needs more power to submit proposal'
      );
    });

    it('with power but must wait more time', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      await expectRevert(
        this.alohaGovernance.submitOnChainProposal(
          actionTo,
          actionValue,
          actionData,
          details,
          { from: accounts[1] }
        ),
        'AlohaGovernance: User needs to wait some time in order to submit proposal'
      );
    });

    it('with power active', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      proposal = await this.alohaGovernance.proposals.call(0).valueOf();
      assert.equal(
        proposal.proposer,
        accounts[1],
        'Created proposal has not right "proposer" value'
      );
      assert.equal(
        proposal.action.value,
        actionValue,
        'Created proposal has not right "action" value'
      );
      assert.equal(
        proposal.action.to,
        actionTo,
        'Created proposal has not right "action to" value'
      );
      assert.equal(
        proposal.action.data,
        actionData,
        'Created proposal has not right "action data" value'
      );
      assert.equal(
        proposal.details,
        details,
        'Created proposal has not right "details" value'
      );
      assert.equal(
        proposal.review,
        0,
        'Created proposal has not right "review" value'
      );

    });

  });

  describe('Submit off-chain proposal', function () {

    it('with power active', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const details = 'https://www.meme.com';

      await this.alohaGovernance.submitOffChainProposal(
        details,
        { from: accounts[1] }
      );

      proposal = await this.alohaGovernance.proposals.call(0).valueOf();
      assert.equal(
        proposal.proposer,
        accounts[1],
        'Created proposal has not right "proposer" value'
      );
      assert.equal(
        proposal.action.value,
        0,
        'Created proposal has not right "action" value'
      );
      assert.equal(
        proposal.action.to,
        '0x0000000000000000000000000000000000000000',
        'Created proposal has not right "action to" value'
      );
      assert.equal(
        proposal.action.data,
        '0x',
        'Created proposal has not right "action data" value'
      );
      assert.equal(
        proposal.details,
        details,
        'Created proposal has not right "details" value'
      );
      assert.equal(
        proposal.review,
        0,
        'Created proposal has not right "review" value'
      );

    });

  });

  describe('Review on-chain proposal', function () {

    it('by non moderator user', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.reviewProposal(
          proposalId,
          2,
          { from: accounts[1] }
        ),
        'AlohaGovernance: Only moderator can call this function'
      );
      
    });

    it('and reject', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        2,
        { from: accounts[0] }
      );

      proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        proposal.review,
        2,
        'Rejected proposal has not right "review" value'
      );
      assert.equal(
        proposal.starting,
        0,
        'Rejected proposal has not right "starting" value'
      );
      
    });

    it('and approve', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        proposal.review,
        1,
        'Approved proposal has not right "review" value'
      );
      assert.notEqual(
        proposal.starting,
        0,
        'Approved proposal has not right "starting" value'
      );
      
    });

    it('and review again', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await expectRevert(
        this.alohaGovernance.reviewProposal(
          proposalId,
          2,
          { from: accounts[0] }
        ),
        'AlohaGovernance: This proposal has already been reviewed'
      );

      proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        proposal.review,
        1,
        'Approved proposal has not right "review" value'
      );
      assert.notEqual(
        proposal.starting,
        0,
        'Approved proposal has not right "starting" value'
      );
      
    });

  });

  describe('Vote on-chain proposal', function () {

    it('like a whale', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      this.alohaGovernance.setPowerLimit(3000, { from: accounts[0] });

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          1, // Yes
          { from: accounts[1] }
        ),
        'AlohaGovernance: User has too much power'
      );
      
    });

    it('(yes) with power', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1, // Yes
        { from: accounts[1] }
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        Number(proposal.yesVotes),
        Number(user.power),
        'User votes has not been recorded'
      );
      assert.equal(
        proposal.noVotes,
        0,
        'Voting count is not correct'
      );
    });

    it('(no) with power', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        2, // No
        { from: accounts[1] }
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        Number(proposal.noVotes),
        Number(user.power),
        'User votes has not been recorded'
      );
      assert.equal(
        proposal.yesVotes,
        0,
        'Voting count is not correct'
      );
    });

    it('(another) with power', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await expectRevert.unspecified(
        this.alohaGovernance.voteProposal(
          proposalId,
          3, // ???
          { from: accounts[1] }
        )
      );
    });

    it('with power but must wait more time', async function() {
      const tokenIdOne = 1;
      const tokenIdThree = 3;
      
      await this.alohaGovernance.deposit(
        tokenIdOne,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.deposit(
        tokenIdThree,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          2, // No
          { from: accounts[1] }
        ),
        'AlohaGovernance: User needs to wait some time in order to vote proposal'
      );

      const proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        proposal.yesVotes,
        0,
        'Voting count is not correct'
      );
      assert.equal(
        proposal.yesVotes,
        0,
        'Voting count is not correct'
      );
    });

    it('not reviewed', async function() {
      const tokenIdThree = 3;
      
      await this.alohaGovernance.deposit(
        tokenIdThree,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          2, // No
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal has not been accepted to vote'
      );
    });

    it('reviewed KO', async function() {
      const tokenIdThree = 3;
      
      await this.alohaGovernance.deposit(
        tokenIdThree,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        2,
        { from: accounts[0] }
      );

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          2, // No
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal has not been accepted to vote'
      );
    });

    it('two times voting', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1, // Yes
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          2, // No
          { from: accounts[1] }
        ),
        'AlohaGovernance: User has already voted'
      );

      const user = await this.alohaGovernance.users.call(accounts[1]).valueOf();
      const proposal = await this.alohaGovernance.proposals.call(proposalId).valueOf();
      assert.equal(
        Number(proposal.yesVotes),
        Number(user.power),
        'User votes has not been recorded'
      );
      assert.equal(
        proposal.noVotes,
        0,
        'Voting count is not correct'
      );
    });

    it('out of time voting', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = 1;
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await time.increase(time.duration.days(8));

      await expectRevert(
        this.alohaGovernance.voteProposal(
          proposalId,
          2, // No
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal voting timing has ended'
      );
    });

  });

  describe('Execute on-chain proposal', function () {

    it('runs', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = '0x552410770000000000000000000000000000000000000000000000000000000000000001';
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));
      await time.increase(time.duration.days(2));

      const result = await this.alohaGovernance.executeProposal.call(
        proposalId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.executeProposal(
        proposalId,
        { from: accounts[1] }
      );
      assert.equal(
        result,
        1,
        'Returned executeProposal value is wrong'
      );

      const mockStatus = await this.dummyMock.status.call().valueOf();
      assert.equal(
        mockStatus,
        1,
        'Contract new value after execute wrong'
      );
    });

    it('when not didPass', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = '0x552410770000000000000000000000000000000000000000000000000000000000000001';
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        2,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));
      await time.increase(time.duration.days(2));

      await expectRevert(
        this.alohaGovernance.executeProposal(
          proposalId,
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal was denied'
    );

      const mockStatus = await this.dummyMock.status.call().valueOf();
      assert.equal(
        mockStatus,
        0,
        'Contract value has changed'
      );
    });

    it('when not ended', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = '0x552410770000000000000000000000000000000000000000000000000000000000000001';
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.executeProposal(
          proposalId,
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal voting timing has not ended'
    );

      const mockStatus = await this.dummyMock.status.call().valueOf();
      assert.equal(
        mockStatus,
        0,
        'Contract value has changed'
      );
    });

    it('when already execuded', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = '0x552410770000000000000000000000000000000000000000000000000000000000000001';
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));
      await time.increase(time.duration.days(2));

      await this.alohaGovernance.executeProposal(
        proposalId,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohaGovernance.executeProposal(
          proposalId,
          { from: accounts[1] }
        ),
        'AlohaGovernance: Already executed proposal'
      );
    });

    it('when not on-chain proposal', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = '0x0000000000000000000000000000000000000000';
      const actionValue = 0;
      const actionData = 0;
      const details = '';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));
      await time.increase(time.duration.days(2));

      await expectRevert(
        this.alohaGovernance.executeProposal(
          proposalId,
          { from: accounts[1] }
        ),
        'AlohaGovernance: Not on-chain proposal'
      );
    });

    it('when delay not ended', async function() {
      const tokenId = 3;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(3));

      const actionTo = this.dummyMock.address;
      const actionValue = 0;
      const actionData = '0x552410770000000000000000000000000000000000000000000000000000000000000001';
      const details = 'https://www.meme.com';

      const proposalId = await this.alohaGovernance.submitOnChainProposal.call(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );
      await this.alohaGovernance.submitOnChainProposal(
        actionTo,
        actionValue,
        actionData,
        details,
        { from: accounts[1] }
      );

      await this.alohaGovernance.reviewProposal(
        proposalId,
        1,
        { from: accounts[0] }
      );

      await this.alohaGovernance.voteProposal(
        proposalId,
        1,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await expectRevert(
        this.alohaGovernance.executeProposal(
          proposalId,
          { from: accounts[1] }
        ),
        'AlohaGovernance: This proposal executing timing delay has not ended'
      );
    });

  });

});

function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}