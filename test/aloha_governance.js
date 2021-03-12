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

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      await timeout(500);

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

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      await timeout(500);

      let userTokensTotal = await this.alohaGovernance.userTokensTotal.call(accounts[1]).valueOf();
      assert.equal(
        userTokensTotal,
        2,
        'usersTokensTotal doesn\'t match'
      );
    });

  });

});


function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}