import { Component, OnInit } from '@angular/core';
import Web3 from 'web3';
import { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import Marketplace from '../../../../build/contracts/Marketplace.json';
import { IpfsService, EventMetadata } from '../../services/ipfs.service';

interface EventData {
  name: string;
  date: string;
  location: string;
  description: string;
  imageUrl: string;
  ticketQuantity: number;
  ticketPrice: number;
  royaltyPercentage: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  web3: Web3 | null = null;
  contract: Contract<any> | null = null;
  marketplaceContract: Contract<any> | null = null;
  walletAddress: string | null = null;
  contractAddress: string = '0xaA4084072238B186Dbd81cdBeD61417354144F2e';
  marketplaceAddress: string = '0x45Eb12Bb7dBDCAD417B06D44664FfcFE803Ec33f';
  
  event: EventData = {
    name: '',
    date: '',
    location: '',
    description: '',
    imageUrl: '',
    ticketQuantity: 0,
    ticketPrice: 0,
    royaltyPercentage: 5
  };

  minDate: string = new Date().toISOString();
  message: string = '';
  messageColor: string = 'primary';
  isCreating: boolean = false;

  constructor(private ipfsService: IpfsService) {}

  async ngOnInit() {
    await this.initWeb3();
  }

  async initWeb3() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.web3 = new Web3((window as any).ethereum);
          this.contract = new this.web3.eth.Contract(TicketNFT.abi as any, this.contractAddress);
          this.marketplaceContract = new this.web3.eth.Contract(Marketplace.abi as any, this.marketplaceAddress);
          console.log('Web3 inicializado. Wallet:', this.walletAddress);
        } else {
          this.message = 'Por favor conecta tu wallet desde la página de login';
          this.messageColor = 'warning';
        }
      } catch (error) {
        console.error('Error al inicializar Web3:', error);
        this.message = 'Error al conectar con MetaMask';
        this.messageColor = 'danger';
      }
    } else {
      this.message = 'MetaMask no detectado';
      this.messageColor = 'danger';
    }
  }

  pinFormatter(value: number) {
    return `${value}%`;
  }

  async createEvent() {
    if (!this.contract || !this.marketplaceContract || !this.walletAddress || !this.web3) {
      this.message = 'Por favor conecta tu wallet primero';
      this.messageColor = 'danger';
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    this.isCreating = true;

    try {
      if (!this.ipfsService.isConfigured()) {
        this.message = 'IPFS no configurado. Usando metadata local. Ve al archivo ipfs.service.ts y añade tus API Keys de Pinata.';
        this.messageColor = 'warning';
        console.warn('IPFS no configurado. Usando metadata local.');
      }

      const eventMetadata: EventMetadata = {
        name: this.event.name,
        description: this.event.description,
        image: this.event.imageUrl || 'https://via.placeholder.com/400x200/667eea/ffffff?text=' + encodeURIComponent(this.event.name),
        attributes: {
          date: this.event.date,
          location: this.event.location,
          artist: this.walletAddress,
          price: `${this.event.ticketPrice} ETH`
        }
      };

      let tokenURI: string;
      
      if (this.ipfsService.isConfigured()) {
        this.message = 'Subiendo a IPFS...';
        tokenURI = await this.ipfsService.uploadEventMetadata(eventMetadata);
        console.log('Metadata subida a IPFS:', tokenURI);
      } else {
        const metadataJson = JSON.stringify(eventMetadata);
        const base64Metadata = btoa(metadataJson);
        tokenURI = `data:application/json;base64,${base64Metadata}`;
        console.log('Usando metadata local (sin IPFS)');
      }
      
      this.message = 'Paso 1/3: Minteando entradas...';
      
      const royaltyBips = Math.floor(this.event.royaltyPercentage * 100);

      const currentSupply: any = await this.contract.methods['totalSupply']().call();
      const firstTokenId = Number(currentSupply) + 1;

      const txMint = await this.contract.methods['batchMint'](
        this.walletAddress,
        this.event.ticketQuantity,
        tokenURI,
        this.walletAddress,
        royaltyBips
      ).send({ 
        from: this.walletAddress,
        gas: '3000000'
      });

      console.log('Mint exitoso:', txMint.transactionHash);

      this.message = 'Paso 2/3: Aprobando Marketplace...';
      
      const isApproved: any = await this.contract.methods['isApprovedForAll'](
        this.walletAddress,
        this.marketplaceAddress
      ).call();

      if (!isApproved) {
        const txApprove = await this.contract.methods['setApprovalForAll'](
          this.marketplaceAddress,
          true
        ).send({
          from: this.walletAddress,
          gas: '100000'
        });
        console.log('Aprobación exitosa:', txApprove.transactionHash);
      }

      this.message = 'Paso 3/3: Listando entradas en el Marketplace...';
      
      const priceInWei = this.web3.utils.toWei(this.event.ticketPrice.toString(), 'ether');
      let listedCount = 0;
      
      for (let i = 0; i < this.event.ticketQuantity; i++) {
        const tokenId = firstTokenId + i;
        
        try {
          const txList = await this.marketplaceContract.methods['listTicket'](
            this.contractAddress,
            tokenId,
            priceInWei
          ).send({
            from: this.walletAddress,
            gas: '200000'
          });
          
          console.log(`NFT #${tokenId} listado. TX: ${txList.transactionHash}`);
          listedCount++;
          
        } catch (error) {
          console.error(`Error al listar NFT #${tokenId}:`, error);
        }
      }

      this.message = `Evento publicado! ${listedCount} de ${this.event.ticketQuantity} entradas disponibles en el Marketplace`;
      this.messageColor = 'success';

      setTimeout(() => {
        this.message = `"${this.event.name}" publicado
        ${listedCount} entradas disponibles
        Precio: ${this.event.ticketPrice} ETH c/u
        Comisión reventa: ${this.event.royaltyPercentage}%`;
      }, 2000);

      setTimeout(() => {
        this.resetForm();
      }, 5000);

    } catch (error: any) {
      console.error('Error completo:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error.message?.includes('User denied')) {
        errorMessage = 'Transacción cancelada por el usuario';
      } else if (error.message?.includes('Caller is not an artist')) {
        errorMessage = 'Solo los artistas registrados pueden crear eventos';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para pagar el gas';
      } else if (error.data?.message) {
        errorMessage = `${error.data.message}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      this.message = errorMessage;
      this.messageColor = 'danger';
    } finally {
      this.isCreating = false;
    }
  }

  validateForm(): boolean {
    if (!this.event.name || !this.event.date || !this.event.location) {
      this.message = 'Por favor completa todos los campos obligatorios';
      this.messageColor = 'danger';
      return false;
    }

    if (this.event.ticketQuantity < 1) {
      this.message = 'Debes crear al menos 1 entrada';
      this.messageColor = 'danger';
      return false;
    }

    if (this.event.ticketPrice < 0) {
      this.message = 'El precio debe ser mayor o igual a 0';
      this.messageColor = 'danger';
      return false;
    }

    if (this.event.royaltyPercentage < 0 || this.event.royaltyPercentage > 10) {
      this.message = 'El royalty debe estar entre 0% y 10%';
      this.messageColor = 'danger';
      return false;
    }

    return true;
  }

  resetForm() {
    this.event = {
      name: '',
      date: '',
      location: '',
      description: '',
      imageUrl: '',
      ticketQuantity: 0,
      ticketPrice: 0,
      royaltyPercentage: 5
    };
    this.message = '';
  }
}
