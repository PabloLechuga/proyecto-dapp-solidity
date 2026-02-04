const UserRegistry = artifacts.require("UserRegistry");

module.exports = async function(callback) {
  try {
    console.log("Registrando artistas...");
    
    const registry = await UserRegistry.deployed();
    const accounts = await web3.eth.getAccounts();
    
    // Registrar artistas
    await registry.registerArtist(accounts[1]);
    console.log("Artista 1 registrado:", accounts[1]);
    
    await registry.registerArtist(accounts[2]);
    console.log("Artista 2 registrado:", accounts[2]);
    
    // Verificar
    const isArtist1 = await registry.isArtist(accounts[1]);
    const isArtist2 = await registry.isArtist(accounts[2]);
    
    console.log("\nVerificación:");
    console.log("Cuenta 1 es artista:", isArtist1);
    console.log("Cuenta 2 es artista:", isArtist2);
    
    console.log("\n✓ Artistas registrados correctamente!");
    
    callback();
  } catch (error) {
    console.error("Error:", error);
    callback(error);
  }
};
