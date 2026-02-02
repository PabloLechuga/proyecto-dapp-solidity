import { Component, OnInit } from '@angular/core';
import Web3 from 'web3';
import { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import UserRegistry from '../../../../build/contracts/UserRegistry.json';
import Marketplace from '../../../../build/contracts/Marketplace.json';
import { IpfsService } from '../../services/ipfs.service';

interface ArtistProfile {
  role: string;
  walletAddress: string;
  totalNFTsCreated: number;
  balance: string;
}

interface NFTEvent {
  tokenId: number;
  name: string;
  uri: string;
  owner: string;
  isListed: boolean;
  price?: string;
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
  ticketNFTAddress: string = '0xaA4084072238B186Dbd81cdBeD61417354144F2e';
  userRegistryAddress: string = '0x8772D2Aa80f9693B12ed8e32743ED2eE5E36e5dB';
  marketplaceAddress: string = '0x45Eb12Bb7dBDCAD417B06D44664FfcFE803Ec33f';
  
  profile: ArtistProfile = {
    role: '',
    walletAddress: '',
    totalNFTsCreated: 0,
    balance: '0'
  };
  
  myNFTs: NFTEvent[] = [];
  isLoading: boolean = false;
  message: string = '';
  messageColor: string = 'primary';

  constructor(private ipfsService: IpfsService) {}

  async ngOnInit() {
    await this.initWeb3();
    await this.loadProfile();
    await this.loadMyNFTs();
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
      
      const totalSupply: any = await this.ticketNFTContract!.methods['totalSupply']().call();
      let nftsCreatedByArtist = 0;
      
      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const royaltyInfo: any = await this.ticketNFTContract!.methods['royaltyInfo'](i, this.web3.utils.toWei('1', 'ether')).call();
          if (royaltyInfo[0].toLowerCase() === this.walletAddress.toLowerCase()) {
            nftsCreatedByArtist++;
          }
        } catch (error) {
        }
      }

      this.profile = {
        role: roleText,
        walletAddress: this.walletAddress,
        totalNFTsCreated: nftsCreatedByArtist,
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

  async loadMyNFTs() {
    if (!this.web3 || !this.walletAddress || !this.ticketNFTContract) {
      return;
    }

    this.isLoading = true;

    try {
      const balance: any = await this.ticketNFTContract.methods['balanceOf'](this.walletAddress).call();
      const totalNFTs = Number(balance);

      this.myNFTs = [];

      if (totalNFTs > 0) {
        const totalSupply: any = await this.ticketNFTContract.methods['totalSupply']().call();
        
        for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
          try {
            const owner: any = await this.ticketNFTContract.methods['ownerOf'](tokenId).call();
            
            if (owner.toLowerCase() === this.walletAddress.toLowerCase()) {
              const tokenURI: any = await this.ticketNFTContract.methods['tokenURI'](tokenId).call();
              
              let eventName = 'Evento Sin Nombre';
              
              console.log(`📄 Token #${tokenId} - URI:`, tokenURI);
              
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
              
              this.myNFTs.push({
                tokenId: tokenId,
                name: eventName,
                uri: tokenURI,
                owner: owner,
                isListed: false,
                price: '0'
              });
            }
          } catch (error) {
          }
        }
      }

      console.log('NFTs del artista:', this.myNFTs);

    } catch (error) {
      console.error('Error al cargar NFTs:', error);
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

  copyAddress() {
    if (this.walletAddress) {
      navigator.clipboard.writeText(this.walletAddress);
      this.message = '✅ Dirección copiada al portapapeles';
      this.messageColor = 'success';
      
      setTimeout(() => {
        this.message = '';
      }, 2000);
    }
  }

  async refreshData() {
    this.message = 'Actualizando datos...';
    this.messageColor = 'primary';
    
    await this.loadProfile();
    await this.loadMyNFTs();
    
    this.message = 'Datos actualizados';
    this.messageColor = 'success';
    
    setTimeout(() => {
      this.message = '';
    }, 2000);
  }
}
