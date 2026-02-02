const UserRegistry = artifacts.require("UserRegistry");

module.exports = async function(callback) {
  try {
    console.log("Registrando artistas...");
    
    const registry = await UserRegistry.deployed();
    const accounts = await web3.eth.getAccounts();
    
    // Registrar artistas
    await registry.registerArtist(accounts[1], "Bad Bunny");
    console.log("Bad Bunny registrado:", accounts[1]);
    
    await registry.registerArtist(accounts[2], "Rosalía");
    console.log("Rosalía registrada:", accounts[2]);
    
    // Verificar
    const artistCount = await registry.getArtistCount();
    console.log("Total artistas registrados:", artistCount.toString());
    
    const allArtists = await registry.getAllArtists();
    console.log("Artistas:", allArtists);
    
    callback();
  } catch (error) {
    console.error("Error:", error);
    callback(error);
  }
};
