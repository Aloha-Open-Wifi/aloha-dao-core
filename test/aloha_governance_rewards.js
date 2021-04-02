const { expectRevert, expectEvent, BN, time } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');

const AlohaGovernance = artifacts.require("AlohaGovernance");
const AlohaMock = artifacts.require("AlohaMock");
const AlohaNFTMock = artifacts.require("AlohaNFTMock");
const DummyMock = artifacts.require("DummyMock");

contract('AlohaGovernanceRewards', function (accounts) {

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
    const alohaAmount = '1';
    this.alohaMock.transfer(
      accounts[1],
      alohaAmount,
      { from: accounts[0] }
    );

    this.rewardsAmount = '10000';
    this.alohaMock.transfer(
      this.alohaGovernance.address,
      this.rewardsAmount.toString(),
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
      accounts[2],
      2,
      2,
      2,
      { from: accounts[0] }
    );
    this.alohaNFTMock.awardItem(
      accounts[3],
      3,
      3,
      3,
      { from: accounts[0] }
    );
    this.alohaNFTMock.awardItem(
      accounts[1],
      1,
      1,
      1,
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
    await this.alohaNFTMock.setApprovalForAll(
      this.alohaGovernance.address,
      true,
      { from: accounts[2] }
    );
    await this.alohaNFTMock.setApprovalForAll(
      this.alohaGovernance.address,
      true,
      { from: accounts[3] }
    );

  });

  describe('Stake', function () {
    
    it('on deposit', async function() {
      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      const stake = await this.alohaGovernance.stakeMap.call(accounts[1]).valueOf();
      const rarity = await this.alohaNFTMock.tokenRarity.call(tokenId).valueOf();
      assert.equal(
        stake,
        powerByRarity[rarity - 1],
        'stake value is not correct'
      );
    });
  
  });

  describe('Unstake', function () {
    
    it('on withdraw', async function() {
      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenId,
        { from: accounts[1] }
      );

      const stake = await this.alohaGovernance.stakeMap.call(accounts[1]).valueOf();
      assert.equal(
        stake,
        0,
        'stake value is not correct'
      );
    });

    it('gets rewards', async function() {
      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      const balanceBeforeWithdraw = await this.alohaMock.balanceOf(accounts[1]);

      await this.alohaGovernance.withdraw(
        tokenId,
        { from: accounts[1] }
      );

      const balanceAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      assert.equal(
        balanceAfterWithdraw,
        sumStrings(balanceBeforeWithdraw, this.rewardsAmount),
        'Rewards not received'
      );
    });

    it('gets rewards when two equal deposits', async function() {
      const tokenOneId = 1;
      const tokenTwoId = 2;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenTwoId,
        { from: accounts[2] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      const balanceOneBeforeWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceTwoBeforeWithdraw = await this.alohaMock.balanceOf(accounts[2]);

      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenTwoId,
        { from: accounts[2] }
      );

      const balanceOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceTwoAfterWithdraw = await this.alohaMock.balanceOf(accounts[2]);
      
      assert.equal(
        balanceOneAfterWithdraw,
        sumStrings(balanceOneBeforeWithdraw, this.rewardsAmount / 2),
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceTwoAfterWithdraw,
        sumStrings(balanceTwoBeforeWithdraw, this.rewardsAmount / 2),
        'Rewards for Account 2 not correct'
      );
    });

    it('gets rewards when not equal deposits', async function() {
      const tokenOneId = 1;
      const tokenThreeId = 3;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenThreeId,
        { from: accounts[3] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenThreeId,
        { from: accounts[3] }
      );

      const balanceOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceThreeAfterWithdraw = await this.alohaMock.balanceOf(accounts[3]);

      assert.equal(
        balanceOneAfterWithdraw.toString(),
        '910',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw.toString(),
        '9090',
        'Rewards for Account 2 not correct'
      );
    });

    it('gets rewards when two deposits for the same user', async function() {
      const tokenOneId = 1;
      const tokenFourId = 4;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenFourId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenFourId,
        { from: accounts[1] }
      );

      const balanceAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);

      assert.equal(
        balanceAfterWithdraw.toString(),
        '10001',
        'Rewards for Account 1 not correct'
      );
    });

    it('gets rewards when two deposits with more users', async function() {
      const tokenOneId = 1;
      const tokenTwoId = 2;
      const tokenFourId = 4;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenTwoId,
        { from: accounts[2] }
      );
      await this.alohaGovernance.deposit(
        tokenFourId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenTwoId,
        { from: accounts[2] }
      );
      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenFourId,
        { from: accounts[1] }
      );

      const balanceAccountOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceAccountTwoAfterWithdraw = await this.alohaMock.balanceOf(accounts[2]);

      assert.equal(
        balanceAccountOneAfterWithdraw.toString(),
        '5001',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceAccountTwoAfterWithdraw.toString(),
        '5000',
        'Rewards for Account 2 not correct'
      );
    });

    it('gets rewards when two deposits with more users, and add more rewards', async function() {
      const tokenOneId = 1;
      const tokenTwoId = 2;
      const tokenFourId = 4;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenTwoId,
        { from: accounts[2] }
      );
      await this.alohaGovernance.deposit(
        tokenFourId,
        { from: accounts[1] }
      );

      await time.increase(time.duration.days(7));

      const newRewardsAmount = '10000';
      await this.alohaMock.transfer(this.alohaGovernance.address, newRewardsAmount, { from: accounts[0] })

      await this.alohaGovernance.withdraw(
        tokenTwoId,
        { from: accounts[2] }
      );
      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenFourId,
        { from: accounts[1] }
      );

      const balanceAccountOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceAccountTwoAfterWithdraw = await this.alohaMock.balanceOf(accounts[2]);

      assert.equal(
        balanceAccountOneAfterWithdraw.toString(),
        '10455',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceAccountTwoAfterWithdraw.toString(),
        '9545',
        'Rewards for Account 2 not correct'
      );
    });

    it('add more rewards and claim', async function() {
      const tokenOneId = 1;
      const tokenThreeId = 3;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenThreeId,
        { from: accounts[3] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      const newRewardsAmount = '10000';
      await this.alohaMock.transfer(this.alohaGovernance.address, newRewardsAmount, { from: accounts[0] })

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenThreeId,
        { from: accounts[3] }
      );

      const balanceOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceThreeAfterWithdraw = await this.alohaMock.balanceOf(accounts[3]);

      assert.equal(
        balanceOneAfterWithdraw.toString(),
        '1819',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw.toString(),
        '18181',
        'Rewards for Account 2 not correct'
      );
    });

    it('add more rewards, more NFTs, and claim', async function() {
      const tokenOneId = 1;
      const tokenTwoId = 2;
      const tokenThreeId = 3;
      await this.alohaGovernance.deposit(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        tokenThreeId,
        { from: accounts[3] }
      );

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await this.alohaGovernance.deposit(
        tokenTwoId,
        { from: accounts[2] }
      );

      const newRewardsAmount = 10000;

      await this.alohaMock.transfer(this.alohaGovernance.address, newRewardsAmount, { from: accounts[0] })

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      await this.alohaGovernance.withdraw(
        tokenOneId,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        tokenTwoId,
        { from: accounts[2] }
      );
      await this.alohaGovernance.withdraw(
        tokenThreeId,
        { from: accounts[3] }
      );

      const balanceOneAfterWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceTwoAfterWithdraw = await this.alohaMock.balanceOf(accounts[2]);
      const balanceThreeAfterWithdraw = await this.alohaMock.balanceOf(accounts[3]);

      assert.equal(
        balanceOneAfterWithdraw.toString(),
        '1743',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceTwoAfterWithdraw.toString(),
        '833',
        'Rewards for Account 2 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw.toString(),
        '17424',
        'Rewards for Account 3 not correct'
      );
    });

  });

});

function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}