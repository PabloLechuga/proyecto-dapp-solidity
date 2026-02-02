import { Component, OnInit } from '@angular/core';
import Web3, { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import Marketplace from '../../../../build/contracts/Marketplace.json';
import UserRegistry from '../../../../build/contracts/UserRegistry.json';
import { IpfsService } from '../../services/ipfs.service';

interface ResaleTicket {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  date: string;
  location: string;
  artist: string;
  artistName: string;
  price: string;
  seller: string;
  sellerName: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  resaleTickets: ResaleTicket[] = [];
  isLoading: boolean = false;
  message: string = '';
  messageColor: string = 'primary';
  
  web3: Web3 | null = null;
  walletAddress: string | null = null;
  ticketNFTContract: Contract<any> | null = null;
  marketplaceContract: Contract<any> | null = null;
  userRegistryContract: Contract<any> | null = null;
  
  ticketNFTAddress: string = '0xaA4084072238B186Dbd81cdBeD61417354144F2e';
  marketplaceAddress: string = '0x45Eb12Bb7dBDCAD417B06D44664FfcFE803Ec33f';
  userRegistryAddress: string = '0x8772D2Aa80f9693B12ed8e32743ED2eE5E36e5dB';

  selectedTicket: ResaleTicket | null = null;

  constructor(private ipfsService: IpfsService) {}

  async ngOnInit() {
    await this.initWeb3();
    await this.loadResaleTickets();
  }

  async initWeb3() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.web3 = new Web3((window as any).ethereum);

          this.ticketNFTContract = new this.web3.eth.Contract(TicketNFT.abi as any, this.ticketNFTAddress);
          this.marketplaceContract = new this.web3.eth.Contract(Marketplace.abi as any, this.marketplaceAddress);
          this.userRegistryContract = new this.web3.eth.Contract(UserRegistry.abi as any, this.userRegistryAddress);

          console.log('Web3 inicializado en marketplace secundario');
        }
      } catch (error) {
        console.error('Error al inicializar Web3:', error);
      }
    }
  }

  async loadResaleTickets() {
    console.log('=== INICIANDO CARGA DE MARKETPLACE SECUNDARIO ===');
    console.log('Web3:', !!this.web3);
    console.log('TicketNFT Contract:', !!this.ticketNFTContract);
    console.log('Marketplace Contract:', !!this.marketplaceContract);
    console.log('UserRegistry Contract:', !!this.userRegistryContract);
    
    if (!this.web3 || !this.ticketNFTContract || !this.marketplaceContract || !this.userRegistryContract) {
      this.message = 'Por favor conecta tu wallet';
      this.messageColor = 'warning';
      console.log('Faltan contratos o web3');
      return;
    }

    this.isLoading = true;
    this.message = 'Cargando entradas del marketplace secundario...';
    this.messageColor = 'primary';
    this.resaleTickets = [];

    try {
      console.log('Buscando entradas en reventa...');
      
      const totalSupply: any = await this.ticketNFTContract.methods['totalSupply']().call();
      console.log('Total de NFTs:', totalSupply);

      for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
        try {
          const listing: any = await this.marketplaceContract.methods['listings'](
            this.ticketNFTAddress,
            tokenId
          ).call();

          console.log(`Verificando Token #${tokenId}:`);
          console.log(`Price: ${listing.price} Wei`);
          console.log(`Seller: ${listing.seller}`);

          const isListed = listing.price && listing.price !== '0';

          if (!isListed) {
            console.log(`No listado (precio = 0)`);
            continue;
          }

          const seller = listing.seller;

          const isArtist: any = await this.userRegistryContract.methods['isArtist'](seller).call();
          console.log(`   isArtist: ${isArtist}`);

          if (isArtist) {
            console.log(`Es venta original de ARTISTA, saltando...`);
            continue;
          }

          console.log(`Es REVENTA de usuario, agregando...`);

          // Obtener metadata del token
          const tokenURI: any = await this.ticketNFTContract.methods['tokenURI'](tokenId).call();
          console.log(`TokenURI: ${tokenURI}`);

          let metadata: any = {};
          
          try {
            if (tokenURI.startsWith('ipfs://')) {
              console.log(`Descargando metadata desde IPFS...`);
              metadata = await this.ipfsService.getEventMetadata(tokenURI);
              console.log(`Metadata obtenida:`, metadata);
            } else if (tokenURI.startsWith('data:application/json')) {
              console.log(`Decodificando metadata local...`);
              const base64Data = tokenURI.split(',')[1];
              const jsonString = atob(base64Data);
              metadata = JSON.parse(jsonString);
              console.log(`Metadata decodificada:`, metadata);
            }
          } catch (metadataError) {
            console.error(`Error al obtener metadata:`, metadataError);
          }

          const sellerProfile: any = await this.userRegistryContract.methods['users'](seller).call();
          const sellerName = sellerProfile.username || 'Usuario';
          console.log(`Vendedor: ${sellerName}`);

          const rawDate = metadata.attributes?.date || '';
          let formattedDate = 'Por confirmar';
          if (rawDate) {
            try {
              const dateObj = new Date(rawDate);
              formattedDate = dateObj.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
            } catch (e) {
              console.error('Error al formatear fecha:', e);
            }
          }

          const priceInWei = listing.price;
          const priceInEth = this.web3.utils.fromWei(priceInWei.toString(), 'ether');

          const ticket = {
            tokenId: tokenId,
            name: metadata.name || `Evento #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || 'https://via.placeholder.com/400x200',
            date: formattedDate,
            location: metadata.attributes?.location || 'Por confirmar',
            artist: metadata.attributes?.artist || '',
            artistName: '',
            price: priceInEth,
            seller: seller,
            sellerName: sellerName
          };

          this.resaleTickets.push(ticket);
          console.log(`Ticket #${tokenId} agregado al marketplace secundario`);
          console.log(`Nombre: ${ticket.name}, Precio: ${ticket.price} ETH`);

        } catch (error) {
          console.error(`Error al cargar NFT #${tokenId}:`, error);
        }
      }

      console.log('=== RESUMEN MARKETPLACE SECUNDARIO ===');
      console.log(`Total entradas en reventa encontradas: ${this.resaleTickets.length}`);
      console.log('Lista completa:', this.resaleTickets);

      if (this.resaleTickets.length > 0) {
        this.message = `${this.resaleTickets.length} entrada(s) en reventa disponibles`;
        this.messageColor = 'success';
      } else {
        this.message = 'No hay entradas en reventa actualmente';
        this.messageColor = 'medium';
      }

    } catch (error) {
      console.error('Error general al cargar entradas:', error);
      this.message = 'Error al cargar el marketplace secundario';
      this.messageColor = 'danger';
    } finally {
      this.isLoading = false;
      console.log('Carga finalizada');
    }
  }

  openPurchaseModal(ticket: ResaleTicket) {
    this.selectedTicket = ticket;
  }

  closePurchaseModal() {
    this.selectedTicket = null;
  }

  async confirmPurchase() {
    if (!this.selectedTicket || !this.web3 || !this.walletAddress || !this.marketplaceContract) {
      return;
    }

    this.isLoading = true;
    this.message = 'Procesando compra...';
    this.messageColor = 'primary';

    try {
      const priceInWei = this.web3.utils.toWei(this.selectedTicket.price, 'ether');

      console.log(`Comprando NFT #${this.selectedTicket.tokenId} por ${this.selectedTicket.price} ETH...`);

      await this.marketplaceContract.methods['buyTicket'](
        this.ticketNFTAddress,
        this.selectedTicket.tokenId
      ).send({
        from: this.walletAddress,
        value: priceInWei,
        gas: '300000'
      });

      console.log(`NFT #${this.selectedTicket.tokenId} comprado exitosamente`);
      
      this.message = '¡Compra exitosa! La entrada ahora es tuya';
      this.messageColor = 'success';

      this.closePurchaseModal();

      setTimeout(() => {
        this.loadResaleTickets();
      }, 3000);

    } catch (error: any) {
      console.error('Error al comprar:', error);
      
      if (error.message?.includes('User denied')) {
        this.message = 'Transacción cancelada por el usuario';
      } else {
        this.message = `Error al comprar: ${error.message || 'Error desconocido'}`;
      }
      
      this.messageColor = 'danger';
    } finally {
      this.isLoading = false;
    }
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
