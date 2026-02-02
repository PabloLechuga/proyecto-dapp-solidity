const Marketplace = artifacts.require('Marketplace');
const TicketNFT = artifacts.require('TicketNFT');
const UserRegistry = artifacts.require('UserRegistry');

contract('Marketplace', (accounts) => {
  const [deployer, artist, seller, buyer] = accounts;
  
  let marketplace;
  let nft;
  let registry;
  const tokenURI = 'ipfs://QmTest123';
  const royaltyBips = 500;
  let tokenId;

  beforeEach(async () => {
    registry = await UserRegistry.new({ from: deployer });
    await registry.registerArtist(artist, { from: deployer });
    nft = await TicketNFT.new('TicketNFT', 'TNFT', registry.address, { from: deployer });
    marketplace = await Marketplace.new({ from: deployer });
    
    await nft.mint(seller, tokenURI, artist, royaltyBips, { from: artist });
    tokenId = 1;
    
    await nft.setApprovalForAll(marketplace.address, true, { from: seller });
  });

  describe('Deployment', () => {
    it('debería desplegar correctamente', async () => {
      assert.ok(marketplace.address);
    });
  });

  describe('Listing', () => {
    const price = web3.utils.toWei('0.1', 'ether');

    it('debería permitir listar un ticket', async () => {
      const tx = await marketplace.listTicket(nft.address, tokenId, price, { from: seller });
      
      assert.equal(tx.logs[0].event, 'TicketListed');
      assert.equal(tx.logs[0].args.seller, seller);
    });

    it('NO debería permitir listar con precio 0', async () => {
      try {
        await marketplace.listTicket(nft.address, tokenId, 0, { from: seller });
        assert.fail('Debería haber revertido');
      } catch (error) {
        assert.include(error.message, 'Invalid price');
      }
    });
  });

  describe('Buying', () => {
    const price = web3.utils.toWei('0.1', 'ether');

    beforeEach(async () => {
      await marketplace.listTicket(nft.address, tokenId, price, { from: seller });
    });

    it('debería transferir el NFT al comprador', async () => {
      await marketplace.buyTicket(nft.address, tokenId, { from: buyer, value: price });
      
      const owner = await nft.ownerOf(tokenId);
      assert.equal(owner, buyer);
    });

    it('debería distribuir royalties correctamente (5% artista, 95% seller)', async () => {
      const artistBalanceBefore = BigInt(await web3.eth.getBalance(artist));
      const sellerBalanceBefore = BigInt(await web3.eth.getBalance(seller));
      
      await marketplace.buyTicket(nft.address, tokenId, { from: buyer, value: price });
      
      const artistBalanceAfter = BigInt(await web3.eth.getBalance(artist));
      const sellerBalanceAfter = BigInt(await web3.eth.getBalance(seller));
      
      const artistGain = artistBalanceAfter - artistBalanceBefore;
      const sellerGain = sellerBalanceAfter - sellerBalanceBefore;
      
      const expected5Percent = BigInt(price) * BigInt(5) / BigInt(100);
      const expected95Percent = BigInt(price) * BigInt(95) / BigInt(100);
      
      assert.equal(artistGain.toString(), expected5Percent.toString(), 'Artista debe recibir 5%');
      assert.equal(sellerGain.toString(), expected95Percent.toString(), 'Seller debe recibir 95%');
    });

    it('debería emitir evento TicketBought', async () => {
      const tx = await marketplace.buyTicket(nft.address, tokenId, { from: buyer, value: price });
      
      assert.equal(tx.logs[0].event, 'TicketBought');
      assert.equal(tx.logs[0].args.buyer, buyer);
    });
  });

  describe('Delisting', () => {
    const price = web3.utils.toWei('0.1', 'ether');

    beforeEach(async () => {
      await marketplace.listTicket(nft.address, tokenId, price, { from: seller });
    });

    it('debería permitir al seller deslistar su ticket', async () => {
      const tx = await marketplace.cancelListing(nft.address, tokenId, { from: seller });
      
      assert.equal(tx.logs[0].event, 'ListingCancelled');
    });
  });
});
