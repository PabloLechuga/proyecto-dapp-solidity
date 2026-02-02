import { Component, OnInit } from '@angular/core';
import Web3 from 'web3';
import { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import Marketplace from '../../../../build/contracts/Marketplace.json';
import UserRegistry from '../../../../build/contracts/UserRegistry.json';
import { ModalController } from '@ionic/angular';
import { IpfsService } from '../../services/ipfs.service';

interface Event {
  eventId: string;
  name: string;
  date: string;
  location: string;
  description: string;
  imageUrl: string;
  artistAddress: string;
  artistName: string;
  availableTickets: number;
  price: string; 
  priceInWei: string; 
  tokenIds: number[];
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  web3: Web3 | null = null;
  ticketNFTContract: Contract<any> | null = null;
  marketplaceContract: Contract<any> | null = null;
  userRegistryContract: Contract<any> | null = null;
  
  walletAddress: string | null = null;
  ticketNFTAddress: string = '0xaA4084072238B186Dbd81cdBeD61417354144F2e';
  marketplaceAddress: string = '0x45Eb12Bb7dBDCAD417B06D44664FfcFE803Ec33f';
  userRegistryAddress: string = '0x8772D2Aa80f9693B12ed8e32743ED2eE5E36e5dB';
  
  events: Event[] = [];
  isLoading: boolean = false;
  message: string = '';
  messageColor: string = 'primary';
  
  selectedEvent: Event | null = null;
  quantityToBuy: number = 1;
  isPurchasing: boolean = false;

  constructor(
    private modalController: ModalController,
    private ipfsService: IpfsService
  ) {}

  async ngOnInit() {
    await this.initWeb3();
    await this.loadEvents();
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
          
          console.log('Web3 inicializado. Wallet:', this.walletAddress);
        } else {
          this.message = 'Por favor conecta tu wallet';
          this.messageColor = 'warning';
        }
      } catch (error) {
        console.error('Error al inicializar Web3:', error);
        this.message = 'Error al conectar con MetaMask';
        this.messageColor = 'danger';
      }
    }
  }

  async loadEvents() {
    if (!this.web3 || !this.ticketNFTContract || !this.marketplaceContract || !this.userRegistryContract) {
      return;
    }

    this.isLoading = true;

    try {
      const totalSupply: any = await this.ticketNFTContract.methods['totalSupply']().call();
      const eventsMap = new Map<string, Event>();

      for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
        try {
          const listing: any = await this.marketplaceContract.methods['listings'](
            this.ticketNFTAddress,
            tokenId
          ).call();

          if (listing && listing.price && listing.price !== '0') {
            const seller = listing.seller;

            const isArtist: any = await this.userRegistryContract.methods['isArtist'](seller).call();

            if (!isArtist) {
              console.log(`NFT #${tokenId} es reventa de usuario, saltando...`);
              continue;
            }

            console.log(`NFT #${tokenId} es venta original del artista ${seller}`);

            const tokenURI: any = await this.ticketNFTContract.methods['tokenURI'](tokenId).call();
            const royaltyInfo: any = await this.ticketNFTContract.methods['royaltyInfo'](
              tokenId, 
              this.web3.utils.toWei('1', 'ether')
            ).call();

            const artistAddress = royaltyInfo[0];
            const priceInEth = this.web3.utils.fromWei(listing.price, 'ether');

            let metadata: any = null;
            let eventName = 'Evento Sin Nombre';
            let eventDate = 'Próximamente';
            let eventLocation = 'Por confirmar';
            let eventDescription = 'Sin descripción';
            let eventImage = 'https://via.placeholder.com/400x200/667eea/ffffff?text=Evento';

            try {
              if (tokenURI.startsWith('ipfs://')) {
                metadata = await this.ipfsService.getEventMetadata(tokenURI);
              } else if (tokenURI.startsWith('data:application/json')) {
                const base64Data = tokenURI.split(',')[1];
                const jsonString = atob(base64Data);
                metadata = JSON.parse(jsonString);
              } else {
                eventName = this.extractEventName(tokenURI);
              }

              if (metadata) {
                eventName = metadata.name || eventName;
                eventDescription = metadata.description || eventDescription;
                eventImage = metadata.image || eventImage;
                
                if (eventImage.startsWith('ipfs://')) {
                  eventImage = this.ipfsService.ipfsToHttp(eventImage);
                }
                
                if (metadata.attributes) {
                  eventDate = metadata.attributes.date || eventDate;
                  eventLocation = metadata.attributes.location || eventLocation;
                  
                  if (eventDate && eventDate !== 'Próximamente') {
                    try {
                      const date = new Date(eventDate);
                      if (!isNaN(date.getTime())) {
                        eventDate = date.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        });
                      }
                    } catch (e) {
                      console.warn(`Token #${tokenId}: No se pudo formatear la fecha`);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Token #${tokenId}: Error al obtener metadata:`, error);
              eventName = this.extractEventName(tokenURI);
            }

            const eventId = `${artistAddress}-${eventName}-${eventDate}`.toLowerCase().replace(/\s/g, '-');

            if (eventsMap.has(eventId)) {
              const event = eventsMap.get(eventId)!;
              event.tokenIds.push(tokenId);
              event.availableTickets = event.tokenIds.length;
            } else {
              eventsMap.set(eventId, {
                eventId: eventId,
                name: eventName,
                date: eventDate,
                location: eventLocation,
                description: eventDescription,
                imageUrl: eventImage,
                artistAddress: artistAddress,
                artistName: this.formatAddress(artistAddress),
                availableTickets: 1,
                price: priceInEth,
                priceInWei: listing.price,
                tokenIds: [tokenId]
              });
            }

            console.log(`NFT #${tokenId} listado:`, eventName, '@', priceInEth, 'ETH');
          }
        } catch (error) {
          console.error(`Error al procesar token ${tokenId}:`, error);
        }
      }

      this.events = Array.from(eventsMap.values());
      
      if (this.events.length === 0) {
        this.message = 'No hay eventos disponibles en el Marketplace';
        this.messageColor = 'warning';
      } else {
        this.message = '';
      }

      console.log('Eventos disponibles en el Marketplace:', this.events);

    } catch (error) {
      console.error('Error al cargar eventos:', error);
      this.message = 'Error al cargar los eventos';
      this.messageColor = 'danger';
    } finally {
      this.isLoading = false;
    }
  }

  extractEventName(uri: string): string {
    const parts = uri.split('/');
    const eventNameWithDashes = parts[parts.length - 1];
    return eventNameWithDashes.replace(/-/g, ' ');
  }

  generateEventId(uri: string): string {
    return uri.split('/').slice(-2).join('/');
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  openPurchaseModal(event: Event) {
    this.selectedEvent = event;
    this.quantityToBuy = 1;
  }

  closePurchaseModal() {
    this.selectedEvent = null;
    this.quantityToBuy = 1;
  }

  getTotalPrice(): string {
    if (!this.selectedEvent) return '0';
    return (parseFloat(this.selectedEvent.price) * this.quantityToBuy).toFixed(4);
  }

  incrementQuantity() {
    if (this.selectedEvent && this.quantityToBuy < this.selectedEvent.availableTickets) {
      this.quantityToBuy++;
    }
  }

  decrementQuantity() {
    if (this.quantityToBuy > 1) {
      this.quantityToBuy--;
    }
  }

  async confirmPurchase() {
    if (!this.selectedEvent || !this.web3 || !this.marketplaceContract || !this.walletAddress) {
      return;
    }

    this.isPurchasing = true;
    this.message = 'Comprando entrada(s)...';
    this.messageColor = 'primary';

    try {
      const tokenIdsToTransfer = this.selectedEvent.tokenIds.slice(0, this.quantityToBuy);
      
      let successfulPurchases = 0;

      for (const tokenId of tokenIdsToTransfer) {
        try {
          console.log(`Comprando NFT #${tokenId}...`);
          
          const listing: any = await this.marketplaceContract.methods['listings'](
            this.ticketNFTAddress,
            tokenId
          ).call();
          
          if (!listing || listing.price === '0') {
            console.log(`NFT #${tokenId} ya no está disponible`);
            continue;
          }

          const tx = await this.marketplaceContract.methods['buyTicket'](
            this.ticketNFTAddress,
            tokenId
          ).send({
            from: this.walletAddress,
            value: listing.price,
            gas: '300000'
          });
          
          console.log(`NFT #${tokenId} comprado! TX: ${tx.transactionHash}`);
          successfulPurchases++;
          
        } catch (error: any) {
          console.error(`Error al comprar NFT #${tokenId}:`, error);
          
          if (error.message?.includes('User denied')) {
            throw error; 
          }
        }
      }

      if (successfulPurchases === this.quantityToBuy) {
        this.message = `¡Compra exitosa! Has adquirido ${successfulPurchases} entrada(s). Los NFTs ya están en tu wallet.`;
        this.messageColor = 'success';
      } else if (successfulPurchases > 0) {
        this.message = `Se completaron ${successfulPurchases} de ${this.quantityToBuy} compras`;
        this.messageColor = 'warning';
      } else {
        this.message = `No se pudo completar ninguna compra`;
        this.messageColor = 'danger';
      }
      
      this.closePurchaseModal();
      
      setTimeout(() => {
        this.loadEvents();
      }, 3000);

    } catch (error: any) {
      console.error('Error al comprar:', error);
      
      if (error.message?.includes('User denied')) {
        this.message = 'Transacción cancelada por el usuario';
      } else if (error.message?.includes('insufficient funds')) {
        this.message = 'Fondos insuficientes para completar la compra';
      } else if (error.message?.includes('Ticket not for sale')) {
        this.message = 'La entrada ya no está disponible';
      } else {
        this.message = `Error en la compra: ${error.message || 'Error desconocido'}`;
      }
      
      this.messageColor = 'danger';
    } finally {
      this.isPurchasing = false;
    }
  }

  async refreshEvents() {
    this.message = 'Actualizando eventos...';
    this.messageColor = 'primary';
    await this.loadEvents();
  }
}
