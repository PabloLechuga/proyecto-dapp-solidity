import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Web3, { Contract } from 'web3';
import TicketNFT from '../../../../build/contracts/TicketNFT.json';
import UserRegistry from '../../../../build/contracts/UserRegistry.json';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false
})
export class Tab1Page {
  walletAddress: string | null = null;
  web3: Web3 | null = null;
  contract: Contract<any> | null = null;
  userRegistryContract: Contract<any> | null = null;
  contractAddress: string = '0xaA4084072238B186Dbd81cdBeD61417354144F2e';
  userRegistryAddress: string = '0x8772D2Aa80f9693B12ed8e32743ED2eE5E36e5dB';
  message: string = '';
  messageColor: string = 'primary';

  constructor(private router: Router) {
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Cuenta cambiada en MetaMask:', accounts[0]);
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.message = `Cuenta cambiada a: ${this.formatAddress(accounts[0])}`;
          console.log('Nueva wallet conectada:', this.walletAddress);
        } else {
          this.walletAddress = null;
          this.message = 'Wallet desconectada';
        }
      });
    }
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  async connectWallet() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
          this.message = 'No se seleccionó ninguna cuenta';
          this.messageColor = 'danger';
          return;
        }
        
        this.walletAddress = accounts[0];
        this.web3 = new Web3((window as any).ethereum);

        this.contract = new this.web3.eth.Contract(TicketNFT.abi as any, this.contractAddress);
        this.userRegistryContract = new this.web3.eth.Contract(UserRegistry.abi as any, this.userRegistryAddress);

        console.log('Wallet conectada:', this.walletAddress);
        this.message = `Conectado: ${this.walletAddress ? this.formatAddress(this.walletAddress) : ''}`;
        this.messageColor = 'success';
      } catch (error: any) {
        console.error('Error al conectar:', error);
        if (error.code === 4001) {
          this.message = 'Conexión rechazada por el usuario';
          this.messageColor = 'danger';
        } else {
          this.message = 'Error al conectar wallet';
          this.messageColor = 'danger';
        }
      }
    } else {
      alert('Por favor instala MetaMask para conectar tu wallet.');
    }
  }

  async changeAccount() {
    if ((window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.web3 = new Web3((window as any).ethereum);
          
          this.contract = new this.web3.eth.Contract(TicketNFT.abi as any, this.contractAddress);
          this.userRegistryContract = new this.web3.eth.Contract(UserRegistry.abi as any, this.userRegistryAddress);
          
          console.log('Cuenta cambiada a:', this.walletAddress);
          this.message = `Cuenta cambiada a: ${this.walletAddress ? this.formatAddress(this.walletAddress) : ''}`;
          this.messageColor = 'success';
        }
      } catch (error: any) {
        console.error('Error al cambiar cuenta:', error);
        if (error.code === 4001) {
          this.message = 'Cambio de cuenta cancelado';
          this.messageColor = 'warning';
        } else {
          this.message = 'Error al cambiar cuenta';
          this.messageColor = 'danger';
        }
      }
    }
  }

  async isArtist(): Promise<boolean> {
    if (!this.userRegistryContract || !this.walletAddress) {
      console.log('isArtist: Contrato o wallet no disponible');
      return false;
    }

    try {
      const result = await this.userRegistryContract.methods['isArtist'](this.walletAddress).call();
      console.log('Resultado de isArtist:', result);
      return Boolean(result);
    } catch (error) {
      console.error('Error al verificar si es artista:', error);
      return false;
    }
  }

  async login() {
    if (!this.walletAddress) {
      this.message = 'Por favor conecta tu wallet primero';
      this.messageColor = 'danger';
      return;
    }
    
    const esArtista = await this.isArtist();
    
    if (esArtista) {
      console.log('Redirigiendo a artist-tabs (Perfil de artista)');
      this.router.navigate(['../../artist-tabs/tabs/tab3']);
    } else {
      console.log('Redirigiendo a user-tabs (Usuario normal)');
      this.router.navigate(['../../user-tabs/tabs/tab1']);
    }
  }
}