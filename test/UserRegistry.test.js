const UserRegistry = artifacts.require("UserRegistry");

contract("UserRegistry", (accounts) => {
  const [owner, user1, user2, artist1, artist2, user3] = accounts;
  
  let registry;

  beforeEach(async () => {
    registry = await UserRegistry.new({ from: owner });
  });

  describe("Deployment", () => {
    it("debería desplegar correctamente", async () => {
      assert.ok(registry.address, "Registry debe tener dirección");
    });
  });

  describe("User Registration", () => {
    it("debería registrar un usuario correctamente", async () => {
      const tx = await registry.registerUser({ from: user1 });
      
      // Verificar evento
      assert.equal(tx.logs[0].event, "UserRegistered");
      assert.equal(tx.logs[0].args.userAddress, user1);
      assert.equal(tx.logs[0].args.role.toString(), "0"); // USER = 0
      
      // Verificar perfil
      const profile = await registry.users(user1);
      assert.equal(profile.role.toString(), "0");
      assert.equal(profile.isRegistered, true);
    });

    it("debería permitir registrar múltiples usuarios", async () => {
      await registry.registerUser({ from: user1 });
      await registry.registerUser({ from: user2 });
      
      const profile1 = await registry.users(user1);
      const profile2 = await registry.users(user2);
      
      assert.equal(profile1.isRegistered, true);
      assert.equal(profile2.isRegistered, true);
    });

    it("NO debería permitir registrar usuario ya registrado", async () => {
      await registry.registerUser({ from: user1 });
      
      try {
        await registry.registerUser({ from: user1 });
        assert.fail("Debería haber revertido");
      } catch (error) {
        assert.include(error.message, "User already registered", "Error debe mencionar usuario ya registrado");
      }
    });

    it("debería verificar correctamente si usuario está registrado", async () => {
      let isRegistered = await registry.isRegistered(user1);
      assert.equal(isRegistered, false, "Usuario no debería estar registrado inicialmente");
      
      await registry.registerUser({ from: user1 });
      
      isRegistered = await registry.isRegistered(user1);
      assert.equal(isRegistered, true, "Usuario debería estar registrado después");
    });

    it("debería verificar que usuario registrado NO es artista", async () => {
      await registry.registerUser({ from: user1 });
      
      const isArtist = await registry.isArtist(user1);
      assert.equal(isArtist, false, "Usuario no debería ser artista");
    });
  });

  describe("Artist Registration", () => {
    it("debería registrar un artista correctamente", async () => {
      const tx = await registry.registerArtist(artist1, { from: owner });
      
      // Verificar evento UserRegistered
      const userRegisteredEvent = tx.logs.find(log => log.event === "UserRegistered");
      assert.ok(userRegisteredEvent, "Debe emitir evento UserRegistered");
      assert.equal(userRegisteredEvent.args.userAddress, artist1);
      assert.equal(userRegisteredEvent.args.role.toString(), "1"); // ARTIST = 1
      
      // Verificar perfil
      const profile = await registry.users(artist1);
      assert.equal(profile.role.toString(), "1");
      assert.equal(profile.isRegistered, true);
    });

    it("debería permitir registrar múltiples artistas", async () => {
      await registry.registerArtist(artist1, { from: owner });
      await registry.registerArtist(artist2, { from: owner });
      
      const profile1 = await registry.users(artist1);
      const profile2 = await registry.users(artist2);
      
      assert.equal(profile1.role.toString(), "1");
      assert.equal(profile2.role.toString(), "1");
    });

    it("NO debería permitir a no-owner registrar artista", async () => {
      try {
        await registry.registerArtist(artist1, { from: user1 });
        assert.fail("Debería haber revertido");
      } catch (error) {
        assert.include(error.message, "Ownable: caller is not the owner", "Error debe mencionar owner");
      }
    });

    it("debería verificar correctamente si usuario es artista", async () => {
      let isArtistBefore = await registry.isArtist(artist1);
      assert.equal(isArtistBefore, false, "No debería ser artista inicialmente");
      
      await registry.registerArtist(artist1, { from: owner });
      
      let isArtistAfter = await registry.isArtist(artist1);
      assert.equal(isArtistAfter, true, "Debería ser artista después del registro");
    });
  });

  describe("Mixed Users and Artists", () => {
    it("debería diferenciar entre usuarios y artistas", async () => {
      await registry.registerUser({ from: user1 });
      await registry.registerArtist(artist1, { from: owner });
      
      const isUserArtist = await registry.isArtist(user1);
      const isArtistArtist = await registry.isArtist(artist1);
      
      assert.equal(isUserArtist, false, "Usuario no debe ser artista");
      assert.equal(isArtistArtist, true, "Artista debe ser artista");
    });

    it("debería tener ambos registrados", async () => {
      await registry.registerUser({ from: user1 });
      await registry.registerArtist(artist1, { from: owner });
      
      const isUserRegistered = await registry.isRegistered(user1);
      const isArtistRegistered = await registry.isRegistered(artist1);
      
      assert.equal(isUserRegistered, true);
      assert.equal(isArtistRegistered, true);
    });

    it("debería poder convertir usuario a artista", async () => {
      // Registrar como usuario
      await registry.registerUser({ from: user1 });
      
      let isArtist = await registry.isArtist(user1);
      assert.equal(isArtist, false, "No debería ser artista al inicio");
      
      // Actualizar a artista (el contrato permite esto)
      await registry.registerArtist(user1, { from: owner });
      
      isArtist = await registry.isArtist(user1);
      assert.equal(isArtist, true, "Debería ser artista después de la actualización");
    });
  });

  describe("Query Functions", () => {
    beforeEach(async () => {
      await registry.registerUser({ from: user1 });
      await registry.registerArtist(artist1, { from: owner });
    });

    it("debería devolver perfil completo de usuario", async () => {
      const profile = await registry.getUserProfile(user1);
      
      assert.equal(profile.role.toString(), "0"); // USER
      assert.equal(profile.registered, true);
    });

    it("debería devolver perfil completo de artista", async () => {
      const profile = await registry.getUserProfile(artist1);
      
      assert.equal(profile.role.toString(), "1"); // ARTIST
      assert.equal(profile.registered, true);
    });

    it("debería devolver valores por defecto para usuario no registrado", async () => {
      const profile = await registry.getUserProfile(user3);
      
      assert.equal(profile.role.toString(), "0");
      assert.equal(profile.registered, false);
    });

    it("debería devolver lista de artistas", async () => {
      await registry.registerArtist(artist2, { from: owner });
      
      const artists = await registry.getAllArtists();
      assert.equal(artists.length, 2, "Debe haber 2 artistas");
      assert.equal(artists[0], artist1);
      assert.equal(artists[1], artist2);
    });

    it("debería contar artistas correctamente", async () => {
      let count = await registry.getArtistCount();
      assert.equal(count.toString(), "1", "Debe haber 1 artista");
      
      await registry.registerArtist(artist2, { from: owner });
      
      count = await registry.getArtistCount();
      assert.equal(count.toString(), "2", "Debe haber 2 artistas");
    });

    it("isRegistered debería ser preciso", async () => {
      const isUser1Registered = await registry.isRegistered(user1);
      const isUser2Registered = await registry.isRegistered(user2);
      const isArtist1Registered = await registry.isRegistered(artist1);
      
      assert.equal(isUser1Registered, true);
      assert.equal(isUser2Registered, false);
      assert.equal(isArtist1Registered, true);
    });

    it("isArtist debería ser preciso para todos los casos", async () => {
      const isUser1Artist = await registry.isArtist(user1);
      const isUser2Artist = await registry.isArtist(user2);
      const isArtist1Artist = await registry.isArtist(artist1);
      
      assert.equal(isUser1Artist, false, "Usuario no debe ser artista");
      assert.equal(isUser2Artist, false, "Usuario no registrado no debe ser artista");
      assert.equal(isArtist1Artist, true, "Artista debe ser artista");
    });
  });

  describe("Edge Cases", () => {
    it("diferentes usuarios pueden registrarse independientemente", async () => {
      await registry.registerUser({ from: user1 });
      await registry.registerUser({ from: user2 });
      
      const profile1 = await registry.users(user1);
      const profile2 = await registry.users(user2);
      
      assert.equal(profile1.isRegistered, true);
      assert.equal(profile2.isRegistered, true);
      assert.notEqual(user1, user2, "Direcciones deben ser diferentes");
    });

    it("debería poder remover artista", async () => {
      await registry.registerArtist(artist1, { from: owner });
      
      let isArtist = await registry.isArtist(artist1);
      assert.equal(isArtist, true);
      
      await registry.removeArtist(artist1, { from: owner });
      
      isArtist = await registry.isArtist(artist1);
      assert.equal(isArtist, false, "No debería ser artista después de remover");
      
      const profile = await registry.users(artist1);
      assert.equal(profile.role.toString(), "0", "Role debe volver a USER");
      assert.equal(profile.isRegistered, true, "Debe seguir registrado");
    });
  });
});
