const AlohaGovernance = artifacts.require("AlohaGovernance");
const AlohaMock = artifacts.require("AlohaMock");
const AlogaNFTMock = artifacts.require("AlohaNFTMock");

async function deployTestnet(deployer, accounts) {
  const userAddress = accounts[0];

  await deployer.deploy(AlohaMock);
  await deployer.deploy(AlogaNFTMock);

  await deployer.deploy(AlohaGovernance, AlohaMock.address, AlogaNFTMock.address);
 
  const alohaGovernance = await AlohaGovernance.at(AlogaNFTMock.address);

  //console.log(alohaGovernance);
}

module.exports = async (deployer, network, accounts) => {
  await deployTestnet(deployer, accounts);
};
