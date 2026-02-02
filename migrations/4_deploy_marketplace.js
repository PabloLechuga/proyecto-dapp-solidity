// Migration para desplegar el contrato Marketplace
const Marketplace = artifacts.require("Marketplace");

module.exports = function (deployer) {
  deployer.deploy(Marketplace);
};
