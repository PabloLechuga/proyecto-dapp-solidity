import { Injectable } from '@angular/core';

export interface EventMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    date: string;
    location: string;
    artist: string;
    price: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IpfsService {
  // IMPORTANTE: Reemplaza estas con tus propias API Keys de Pinata
  private PINATA_API_KEY = '754d58b6677462c7ff0e';
  private PINATA_SECRET_KEY = '2b1f3e1b6a952460fa9f0b268aac16b3d0ee3150566ec16439feb388288c53f7';
  private PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

  constructor() {}

  async uploadEventMetadata(metadata: EventMetadata): Promise<string> {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.PINATA_API_KEY,
          'pinata_secret_api_key': this.PINATA_SECRET_KEY
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.name}-metadata.json`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error al subir a IPFS: ${response.statusText}`);
      }

      const data = await response.json();
      const ipfsHash = data.IpfsHash;
      
      console.log('Metadata subida a IPFS:', ipfsHash);
      return `ipfs://${ipfsHash}`;
      
    } catch (error) {
      console.error('Error al subir a IPFS:', error);
      throw error;
    }
  }

  async getEventMetadata(ipfsUri: string): Promise<EventMetadata> {
    const ipfsHash = ipfsUri.replace('ipfs://', '');
    
    const gateways = [
      `${this.PINATA_GATEWAY}${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://gateway.ipfs.io/ipfs/${ipfsHash}`
    ];

    console.log(`Intentando descargar metadata desde IPFS: ${ipfsHash}`);

    for (let i = 0; i < gateways.length; i++) {
      const url = gateways[i];
      try {
        console.log(`Intento ${i + 1}/${gateways.length}: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn(`Gateway ${i + 1} falló: ${response.status} ${response.statusText}`);
          continue;
        }

        const metadata: EventMetadata = await response.json();
        console.log(`Metadata descargada exitosamente desde gateway ${i + 1}:`, metadata);
        return metadata;
        
      } catch (error) {
        console.warn(`Error con gateway ${i + 1}:`, error);
        if (i === gateways.length - 1) {
          throw new Error(`No se pudo descargar metadata desde ningún gateway IPFS. Hash: ${ipfsHash}`);
        }
      }
    }

    throw new Error(`No se pudo descargar metadata desde IPFS: ${ipfsHash}`);
  }

  ipfsToHttp(ipfsUri: string): string {
    if (!ipfsUri) return '';
    if (ipfsUri.startsWith('http')) return ipfsUri;
    
    const ipfsHash = ipfsUri.replace('ipfs://', '');
    return `${this.PINATA_GATEWAY}${ipfsHash}`;
  }

  isConfigured(): boolean {
    return this.PINATA_API_KEY !== 'TU_PINATA_API_KEY' 
        && this.PINATA_SECRET_KEY !== 'TU_PINATA_SECRET_KEY';
  }
}
