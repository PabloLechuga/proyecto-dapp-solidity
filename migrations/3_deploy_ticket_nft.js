// Migration para desplegar el contrato TicketNFT
const TicketNFT = artifacts.require("TicketNFT");
const UserRegistry = artifacts.require("UserRegistry");

module.exports = async function (deployer, network, accounts) {
  const name = "EventTickets";
  const symbol = "ETIX";

  // Obtener la instancia de UserRegistry desplegada anteriormente
  const userRegistry = await UserRegistry.deployed();

  // Desplegar TicketNFT con la dirección de UserRegistry
  await deployer.deploy(TicketNFT, name, symbol, userRegistry.address);
};
