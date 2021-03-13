const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');
const { expect } = require('chai');

const AlohaGovernance = artifacts.require("AlohaGovernance");
const AlohaMock = artifacts.require("AlohaMock");
const AlohaNFTMock = artifacts.require("AlohaNFTMock");

contract('AlohaStaking', function (accounts) {

  const powerByRarity = [1, 5, 50];

  beforeEach(async function () {
    // Deploy
    this.alohaMock = await AlohaMock.new({ from: accounts[0] });
    this.alohaNFTMock = await AlohaNFTMock.new({ from: accounts[0] });

    this.alohaGovernance = await AlohaGovernance.new(
      this.alohaMock.address,
      this.alohaNFTMock.address,
      { from: accounts[0] }
    );
    
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
      await this.alohaGovernance.setWithdrawalDelay(0, { from: accounts[0] });

      const tokenId = 1;
      await this.alohaGovernance.deposit(
        tokenId,
        { from: accounts[1] }
      );

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
      await this.alohaGovernance.setWithdrawalDelay(0, { from: accounts[0] });

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
      await this.alohaGovernance.setWithdrawalDelay(0, { from: accounts[0] });

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

  });

});


function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}