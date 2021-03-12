const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');
const { expect } = require('chai');

const AlohaGovernance = artifacts.require("AlohaGovernance");
const AlohaMock = artifacts.require("AlohaMock");
const AlohaNFTMock = artifacts.require("AlohaNFTMock");

contract('AlohaStaking', function (accounts) {

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

    it('first time works', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );

      let userTokensTotal = await this.alohaGovernance.userTokensTotal.call(accounts[1]).valueOf();
      assert.equal(
        userTokensTotal,
        1,
        'usersTokensTotal doesn\'t match'
      );
    });

    it('second time works', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );
      await this.alohaGovernance.deposit(
        2,
        { from: accounts[1] }
      );

      let userTokensTotal = await this.alohaGovernance.userTokensTotal.call(accounts[1]).valueOf();
      assert.equal(
        userTokensTotal,
        2,
        'usersTokensTotal doesn\'t match'
      );
    });

    it('transfers the token', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );

      let tokenOwner = await this.alohaNFTMock.ownerOf.call(1).valueOf();
      assert.equal(
        tokenOwner,
        this.alohaGovernance.address,
        'token owner is not the governance address'
      );
    });

  });

  describe('Withdraw', function () {

    it('with one token works', async function() {
      await this.alohaGovernance.deposit(
        1,
        { from: accounts[1] }
      );

      await this.alohaGovernance.withdraw(
        1,
        { from: accounts[1] }
      );

      let userTokensTotal = await this.alohaGovernance.userTokensTotal.call(accounts[1]).valueOf();
      assert.equal(
        userTokensTotal,
        0,
        'usersTokensTotal doesn\'t match'
      );
    });

    it('with three tokens works', async function() {
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
        3,
        { from: accounts[1] }
      );

      let userTokensTotal = await this.alohaGovernance.userTokensTotal.call(accounts[1]).valueOf();
      assert.equal(
        userTokensTotal,
        2,
        'usersTokensTotal doesn\'t match'
      );
    });

    it('add three tokens and removing two of them', async function() {
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
        3,
        { from: accounts[1] }
      );
      await this.alohaGovernance.withdraw(
        1,
        { from: accounts[1] }
      );

      let userToken = await this.alohaGovernance.usersTokens.call(accounts[1], 0).valueOf();
      assert.equal(
        userToken,
        2,
        'Remains token after withdraw is not the correct'
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

      await this.alohaGovernance.withdraw(
        2,
        { from: accounts[1] }
      );

      let tokenOwner = await this.alohaNFTMock.ownerOf.call(2).valueOf();
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