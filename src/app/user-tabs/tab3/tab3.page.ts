import { Component, OnInit } from '@angular/core';
import Web3 from 'web3';
import { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import UserRegistry from '../../../../build/contracts/UserRegistry.json';
import Marketplace from '../../../../build/contracts/Marketplace.json';
import { IpfsService } from '../../services/ipfs.service';

interface UserProfile {
  role: string;
  walletAddress: string;
  totalTicketsPurchased: number;
  balance: string;
}

interface NFTTicket {
  tokenId: number;
  name: string;
  uri: string;
  owner: string;
  artist: string;
  artistName: string;
  eventId?: string;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  web3: Web3 | null = null;
  ticketNFTContract: Contract<any> | null = null;
  userRegistryContract: Contract<any> | null = null;
  marketplaceContract: Contract<any> | null = null;
  
  walletAddress: string | null = null;
  ticketNFTAddress: string = '0x7f539D182992AD3442FceD13c1Ae3089AB0DAd35';
  userRegistryAddress: string = '0xDAF513f52E58bc32946D7b1b0175afE160435705';
  marketplaceAddress: string = '0xAeED9C18BB7CcaE9c2f58a556b73FD149e9768d3';
  
  profile: UserProfile = {
    role: '',
    walletAddress: '',
    totalTicketsPurchased: 0,
    balance: '0'
  };
  
  myTickets: NFTTicket[] = [];
  isLoading: boolean = false;
  message: string = '';
  messageColor: string = 'primary';

  selectedTicketForResale: NFTTicket | null = null;
  resalePrice: number = 0;
  isReselling: boolean = false;

  constructor(private ipfsService: IpfsService) {}

  async ngOnInit() {
    await this.initWeb3();
    await this.loadProfile();
    await this.loadMyTickets();
  }

  async initWeb3() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.web3 = new Web3((window as any).ethereum);
          
          this.ticketNFTContract = new this.web3.eth.Contract(TicketNFT.abi as any, this.ticketNFTAddress);
          this.userRegistryContract = new this.web3.eth.Contract(UserRegistry.abi as any, this.userRegistryAddress);
          this.marketplaceContract = new this.web3.eth.Contract(Marketplace.abi as any, this.marketplaceAddress);
          
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

  async loadProfile() {
    if (!this.web3 || !this.walletAddress || !this.userRegistryContract) {
      return;
    }

    this.isLoading = true;

    try {
      const isArtist: boolean = await this.userRegistryContract.methods['isArtist'](this.walletAddress).call();
      const roleText = isArtist ? 'Artista' : 'Usuario';
      
      const balanceWei = await this.web3.eth.getBalance(this.walletAddress);
      const balanceEth = this.web3.utils.fromWei(balanceWei, 'ether');
      
      const balance: any = await this.ticketNFTContract!.methods['balanceOf'](this.walletAddress).call();
      const totalTickets = Number(balance);

      this.profile = {
        role: roleText,
        walletAddress: this.walletAddress,
        totalTicketsPurchased: totalTickets,
        balance: parseFloat(balanceEth).toFixed(4)
      };

    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.message = 'Error al cargar información del perfil';
      this.messageColor = 'danger';
    } finally {
      this.isLoading = false;
    }
  }

  async loadMyTickets() {
    if (!this.web3 || !this.walletAddress || !this.ticketNFTContract) {
      return;
    }

    this.isLoading = true;

    try {
      const balance: any = await this.ticketNFTContract.methods['balanceOf'](this.walletAddress).call();
      const totalTickets = Number(balance);

      this.myTickets = [];

      if (totalTickets > 0) {
        const totalSupply: any = await this.ticketNFTContract.methods['totalSupply']().call();
        
        for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
          try {
            const owner: any = await this.ticketNFTContract.methods['ownerOf'](tokenId).call();
            
            if (owner.toLowerCase() === this.walletAddress.toLowerCase()) {
              const tokenURI: any = await this.ticketNFTContract.methods['tokenURI'](tokenId).call();
              
              const royaltyInfo: any = await this.ticketNFTContract.methods['royaltyInfo'](tokenId, this.web3.utils.toWei('1', 'ether')).call();
              const artistAddress = royaltyInfo[0];
              
              let artistName = 'Artista';
              try {
                const artistProfile: any = await this.userRegistryContract!.methods['getUserProfile'](artistAddress).call();
                artistName = artistProfile[0] || this.formatAddress(artistAddress);
              } catch (error) {
                artistName = this.formatAddress(artistAddress);
              }
              
              let eventName = 'Evento Sin Nombre';
              
              console.log(`Token #${tokenId} - URI:`, tokenURI);
              
              try {
                if (tokenURI.startsWith('ipfs://')) {
                  console.log(`Token #${tokenId}: Descargando metadata desde IPFS...`);
                  const metadata = await this.ipfsService.getEventMetadata(tokenURI);
                  eventName = metadata.name || eventName;
                  console.log(`Token #${tokenId}: Nombre obtenido: "${eventName}"`);
                } else if (tokenURI.startsWith('data:application/json')) {
                  const base64Data = tokenURI.split(',')[1];
                  const jsonString = atob(base64Data);
                  const metadata = JSON.parse(jsonString);
                  eventName = metadata.name || eventName;
                } else {
                  eventName = this.extractEventName(tokenURI);
                }
              } catch (error) {
                console.error(`Error al obtener metadata del token ${tokenId}:`, error);
                eventName = this.extractEventName(tokenURI);
              }
              
              this.myTickets.push({
                tokenId: tokenId,
                name: eventName,
                uri: tokenURI,
                owner: owner,
                artist: artistAddress,
                artistName: artistName,
                eventId: `${artistAddress}-${eventName}`.toLowerCase().replace(/\s/g, '-')
              });
            }
          } catch (error) {
          }
        }
      }

      console.log('Tickets del usuario:', this.myTickets);

    } catch (error) {
      console.error('Error al cargar tickets:', error);
      this.message = 'Error al cargar tus entradas';
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

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  async copyAddress() {
    if (this.profile.walletAddress) {
      try {
        await navigator.clipboard.writeText(this.profile.walletAddress);
        this.message = '✅ Dirección copiada al portapapeles';
        this.messageColor = 'success';
        setTimeout(() => {
          this.message = '';
        }, 3000);
      } catch (error) {
        console.error('Error al copiar:', error);
      }
    }
  }

  async refreshData() {
    this.message = '';
    await this.loadProfile();
    await this.loadMyTickets();
  }

  openResaleModal(ticket: NFTTicket) {
    this.selectedTicketForResale = ticket;
    this.resalePrice = 0;
  }

  closeResaleModal() {
    this.selectedTicketForResale = null;
    this.resalePrice = 0;
  }

  async confirmResale() {
    if (!this.selectedTicketForResale || !this.web3 || !this.walletAddress || !this.marketplaceContract || !this.ticketNFTContract) {
      return;
    }

    if (this.resalePrice <= 0) {
      this.message = 'Por favor ingresa un precio válido';
      this.messageColor = 'danger';
      return;
    }

    this.isReselling = true;
    this.message = 'Publicando entrada en el marketplace secundario...';
    this.messageColor = 'primary';

    try {
      const priceInWei = this.web3.utils.toWei(this.resalePrice.toString(), 'ether');
      
      const isApproved: any = await this.ticketNFTContract.methods['isApprovedForAll'](
        this.walletAddress,
        this.marketplaceAddress
      ).call();

      if (!isApproved) {
        console.log('Aprobando Marketplace...');
        this.message = 'Paso 1/2: Aprobando Marketplace...';
        
        await this.ticketNFTContract.methods['setApprovalForAll'](
          this.marketplaceAddress,
          true
        ).send({
          from: this.walletAddress,
          gas: '100000'
        });
        
        console.log('Marketplace aprobado');
      }

      this.message = 'Paso 2/2: Listando entrada...';
      
      console.log(`Listando NFT #${this.selectedTicketForResale.tokenId} a ${this.resalePrice} ETH...`);
      
      await this.marketplaceContract.methods['listTicket'](
        this.ticketNFTAddress,
        this.selectedTicketForResale.tokenId,
        priceInWei
      ).send({
        from: this.walletAddress,
        gas: '200000'
      });
      
      console.log(`NFT #${this.selectedTicketForResale.tokenId} listado en el marketplace secundario`);

      this.message = `¡Entrada publicada en el marketplace secundario!`;
      this.messageColor = 'success';

      this.closeResaleModal();
      
      setTimeout(() => {
        this.refreshData();
      }, 3000);

    } catch (error: any) {
      console.error('Error al revender:', error);
      
      if (error.message?.includes('User denied')) {
        this.message = 'Transacción cancelada por el usuario';
      } else {
        this.message = `Error al publicar entrada: ${error.message || 'Error desconocido'}`;
      }
      
      this.messageColor = 'danger';
    } finally {
      this.isReselling = false;
    }
  }

}
