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

    this.rewardsAmount = 10000;
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

      const stake = await this.alohaGovernance.stakesMap.call(accounts[1]).valueOf();
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

      const stake = await this.alohaGovernance.stakesMap.call(accounts[1]).valueOf();
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

      const balanceOneBeforeWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceThreeBeforeWithdraw = await this.alohaMock.balanceOf(accounts[3]);

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

      const rarityOne = await this.alohaNFTMock.tokenRarity.call(tokenOneId).valueOf();
      const rarityThree = await this.alohaNFTMock.tokenRarity.call(tokenThreeId).valueOf();
      
      const powerOne = powerByRarity[rarityOne - 1];
      const powerThree = powerByRarity[rarityThree - 1];
      const totalPower = (powerOne + powerThree);

      const rewardPerUnit = Math.trunc(this.rewardsAmount / totalPower);

      assert.equal(
        balanceOneAfterWithdraw,
        sumStrings(balanceOneBeforeWithdraw, (rewardPerUnit * powerOne)),
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw,
        sumStrings(balanceThreeBeforeWithdraw, (rewardPerUnit * powerThree)),
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

      const newRewardsAmount = 10000;

      await this.alohaMock.transfer(this.alohaGovernance.address, newRewardsAmount, { from: accounts[0] })

      await this.alohaGovernance.distribute({ from: accounts[1] });

      await time.increase(time.duration.days(7));

      const balanceOneBeforeWithdraw = await this.alohaMock.balanceOf(accounts[1]);
      const balanceThreeBeforeWithdraw = await this.alohaMock.balanceOf(accounts[3]);

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

      const rarityOne = await this.alohaNFTMock.tokenRarity.call(tokenOneId).valueOf();
      const rarityThree = await this.alohaNFTMock.tokenRarity.call(tokenThreeId).valueOf();
      
      const powerOne = powerByRarity[rarityOne - 1];
      const powerThree = powerByRarity[rarityThree - 1];
      const totalPower = (powerOne + powerThree);
      const totalRewards = (this.rewardsAmount + newRewardsAmount);

      const rewardPerUnit = Math.trunc(totalRewards / totalPower);

      assert.equal(
        balanceOneAfterWithdraw,
        sumStrings(balanceOneBeforeWithdraw, (rewardPerUnit * powerOne)),
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw,
        sumStrings(balanceThreeBeforeWithdraw, (rewardPerUnit * powerThree)),
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
        balanceOneAfterWithdraw,
        '1666',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceTwoAfterWithdraw,
        '760',
        'Rewards for Account 1 not correct'
      );

      assert.equal(
        balanceThreeAfterWithdraw,
        '17550',
        'Rewards for Account 1 not correct'
      );
    });

  });

});

function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}