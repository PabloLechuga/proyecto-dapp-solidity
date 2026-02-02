const TicketNFT = artifacts.require('TicketNFT');
const UserRegistry = artifacts.require('UserRegistry');

contract('TicketNFT', (accounts) => {
  const [deployer, artist, user1, user2, user3] = accounts;
  
  let nftContract;
  let registryContract;

  beforeEach(async () => {
    registryContract = await UserRegistry.new({ from: deployer });
    await registryContract.registerArtist(artist, { from: deployer });
    nftContract = await TicketNFT.new('TicketNFT', 'TNFT', registryContract.address, { from: deployer });
  });

  describe('Deployment', () => {
    it('debería desplegar correctamente', async () => {
      assert.ok(nftContract.address, 'Contrato debe tener una dirección');
    });

    it('debería asignar deployer como owner', async () => {
      const owner = await nftContract.owner();
      assert.equal(owner, deployer, 'El deployer debe ser el owner del contrato');
    });

    it('debería tener supply inicial de 0', async () => {
      const supply = await nftContract.totalSupply();
      assert.equal(supply.toString(), '0', 'Supply inicial debe ser 0');
    });
  });

  describe('Minting', () => {
    const tokenURI = 'ipfs://QmTest123';
    const royaltyBips = 500;

    it('debería permitir al artista mintear NFTs', async () => {
      const tx = await nftContract.mint(user1, tokenURI, artist, royaltyBips, { from: artist });
      
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.to, user1);
      
      const owner = await nftContract.ownerOf(1);
      assert.equal(owner, user1);
    });

    it('NO debería permitir a usuarios regulares mintear', async () => {
      try {
        await nftContract.mint(user1, tokenURI, artist, royaltyBips, { from: user1 });
        assert.fail('Debería haber revertido');
      } catch (error) {
        assert.include(error.message, 'Caller is not an artist');
      }
    });

    it('debería permitir batch minting', async () => {
      await nftContract.batchMint(user1, 3, tokenURI, artist, royaltyBips, { from: artist });
      const supply = await nftContract.totalSupply();
      assert.equal(supply.toString(), '3');
    });
  });

  describe('Royalties ERC2981', () => {
    const tokenURI = 'ipfs://QmTest123';
    const royaltyBips = 500;

    beforeEach(async () => {
      await nftContract.mint(user1, tokenURI, artist, royaltyBips, { from: artist });
    });

    it('debería calcular correctamente royalty del 5% para 1 ETH', async () => {
      const salePrice = web3.utils.toWei('1', 'ether');
      const royaltyInfo = await nftContract.royaltyInfo(1, salePrice);
      
      const expectedRoyalty = web3.utils.toWei('0.05', 'ether');
      
      assert.equal(royaltyInfo[0], artist);
      assert.equal(royaltyInfo[1].toString(), expectedRoyalty.toString());
    });

    it('debería calcular correctamente royalty del 5% para 0.1 ETH', async () => {
      const salePrice = web3.utils.toWei('0.1', 'ether');
      const royaltyInfo = await nftContract.royaltyInfo(1, salePrice);
      
      const expectedRoyalty = web3.utils.toWei('0.005', 'ether');
      
      assert.equal(royaltyInfo[0], artist);
      assert.equal(royaltyInfo[1].toString(), expectedRoyalty.toString());
    });
  });

  describe('Transfers', () => {
    const tokenURI = 'ipfs://QmTest123';
    const royaltyBips = 500;

    beforeEach(async () => {
      await nftContract.mint(user1, tokenURI, artist, royaltyBips, { from: artist });
    });

    it('debería permitir transferir NFTs entre usuarios', async () => {
      await nftContract.transferFrom(user1, user2, 1, { from: user1 });
      
      const owner = await nftContract.ownerOf(1);
      assert.equal(owner, user2);
    });

    it('NO debería permitir transferir NFTs de otros usuarios', async () => {
      try {
        await nftContract.transferFrom(user1, user3, 1, { from: user2 });
        assert.fail('Debería haber revertido');
      } catch (error) {
        assert.include(error.message, 'revert');
      }
    });
  });
});
