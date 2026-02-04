# Smart Contracts - Documentación Técnica

Sistema de contratos inteligentes para TicketChain, implementando venta de entradas como NFTs con mercado secundario y distribución automática de regalías.

## 📋 Tabla de Contenidos

- [Arquitectura de Contratos](#arquitectura-de-contratos)
- [UserRegistry.sol](#userregistrysol)
- [TicketNFT.sol](#ticketnftsol)
- [Marketplace.sol](#marketplacesol)
- [Flujos de Interacción](#flujos-de-interacción)
- [Eventos](#eventos)
- [Seguridad](#seguridad)

## 🏗️ Arquitectura de Contratos

```
┌─────────────────────────────────────────────────────────┐
│                     UserRegistry                         │
│  - Gestión de roles (Usuario/Artista)                   │
│  - Control de acceso                                     │
└─────────────────────────────────────────────────────────┘
                            │
                            │ verifica roles
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      TicketNFT                           │
│  - ERC721: NFTs de entradas                             │
│  - ERC2981: Regalías del 5%                             │
│  - Solo artistas pueden mintear                         │
└─────────────────────────────────────────────────────────┘
                            │
                            │ gestiona NFTs
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Marketplace                          │
│  - Listado de entradas para reventa                     │
│  - Compra con distribución automática de regalías       │
│  - Protección contra reentrancy                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 UserRegistry.sol

Contrato para gestión de usuarios y roles del sistema.

### Descripción
Implementa un sistema de registro con dos roles diferenciados: usuarios normales (pueden comprar entradas) y artistas (pueden crear eventos). Solo el owner del contrato puede registrar artistas.

### Herencia
- `Ownable` (OpenZeppelin): Control de acceso del propietario

### Estructuras de Datos

#### Enum: UserRole
```solidity
enum UserRole { USER, ARTIST }
```
- `USER (0)`: Usuario normal, puede comprar entradas
- `ARTIST (1)`: Artista, puede crear eventos y recibir regalías

#### Struct: UserProfile
```solidity
struct UserProfile {
    UserRole role;
    bool isRegistered;
}
```

### Variables de Estado

```solidity
mapping(address => UserProfile) public users;
address[] public artistAddresses;
```

- `users`: Mapeo de direcciones a perfiles de usuario
- `artistAddresses`: Array de todas las direcciones de artistas registrados

### Funciones Principales

#### registerUser()
```solidity
function registerUser() external
```
- **Descripción**: Registra una nueva cuenta como usuario normal
- **Acceso**: Público (cualquier dirección)
- **Requisitos**: La dirección no debe estar registrada previamente
- **Emite**: `UserRegistered(address, UserRole.USER)`

#### registerArtist()
```solidity
function registerArtist(address _artistAddress) external onlyOwner
```
- **Descripción**: Registra una cuenta como artista
- **Acceso**: Solo owner del contrato
- **Parámetros**: 
  - `_artistAddress`: Dirección a registrar como artista
- **Requisitos**: 
  - Solo llamable por owner
  - Dirección no registrada previamente
- **Emite**: `UserRegistered(address, UserRole.ARTIST)`

#### isArtist()
```solidity
function isArtist(address _address) external view returns (bool)
```
- **Descripción**: Verifica si una dirección es artista
- **Acceso**: Público (view)
- **Retorna**: `true` si es artista, `false` en caso contrario
- **Uso**: Validación en TicketNFT para minteo

#### getArtistAddresses()
```solidity
function getArtistAddresses() external view returns (address[] memory)
```
- **Descripción**: Obtiene lista de todos los artistas registrados
- **Acceso**: Público (view)
- **Retorna**: Array de direcciones de artistas

#### getUserProfile()
```solidity
function getUserProfile(address _address) external view returns (UserProfile memory)
```
- **Descripción**: Obtiene perfil completo de un usuario
- **Acceso**: Público (view)
- **Retorna**: Estructura UserProfile con role e isRegistered

### Eventos

```solidity
event UserRegistered(address indexed userAddress, UserRole role);
```
- Emitido cuando un usuario o artista se registra
- Parámetros indexados permiten filtrado eficiente

---

## 🎫 TicketNFT.sol

Contrato de NFTs (entradas) con soporte de regalías estándar ERC2981.

### Descripción
Implementa entradas para eventos como NFTs únicos. Cada NFT contiene metadata almacenada en IPFS (título, descripción, imagen, precio). Solo artistas registrados pueden mintear NFTs. Implementa el estándar ERC2981 para regalías del 5% en ventas secundarias.

### Herencia
- `ERC721URIStorage` (OpenZeppelin): NFTs con metadata URI
- `Ownable` (OpenZeppelin): Control de acceso
- `IERC2981` (OpenZeppelin): Estándar de regalías

### Estructuras de Datos

#### Struct: RoyaltyInfo
```solidity
struct RoyaltyInfo {
    address receiver;
    uint96 royaltyFraction;
}
```
- `receiver`: Dirección del artista que recibe regalías
- `royaltyFraction`: Porcentaje en basis points (500 = 5%)

### Variables de Estado

```solidity
IUserRegistry private userRegistry;
mapping(uint256 => RoyaltyInfo) private _royalties;
uint256 private _tokenIdCounter;
uint96 private constant ROYALTY_PERCENTAGE = 500;
```

- `userRegistry`: Referencia al contrato UserRegistry
- `_royalties`: Mapeo de tokenId a información de regalías
- `_tokenIdCounter`: Contador global de NFTs
- `ROYALTY_PERCENTAGE`: 500 basis points = 5%

### Modificadores

```solidity
modifier onlyArtist()
```
- Verifica que msg.sender sea artista registrado
- Usa `userRegistry.isArtist(msg.sender)`

### Funciones Principales

#### mint()
```solidity
function mint(
    address _to,
    string memory _tokenURI,
    uint96 _royaltyFraction
) external onlyArtist returns (uint256)
```
- **Descripción**: Mintea un NFT individual
- **Acceso**: Solo artistas
- **Parámetros**:
  - `_to`: Dirección que recibirá el NFT
  - `_tokenURI`: URI de metadata IPFS
  - `_royaltyFraction`: Porcentaje de regalía (500 = 5%)
- **Retorna**: tokenId del NFT creado
- **Emite**: `Transfer` (heredado de ERC721)

#### batchMint()
```solidity
function batchMint(
    address[] memory _recipients,
    string memory _tokenURI,
    uint96 _royaltyFraction
) external onlyArtist
```
- **Descripción**: Mintea múltiples NFTs con la misma metadata
- **Acceso**: Solo artistas
- **Parámetros**:
  - `_recipients`: Array de direcciones receptoras
  - `_tokenURI`: URI compartida para todos los NFTs
  - `_royaltyFraction`: Porcentaje de regalía
- **Uso**: Crear múltiples entradas para un mismo evento

#### royaltyInfo() - ERC2981
```solidity
function royaltyInfo(
    uint256 _tokenId,
    uint256 _salePrice
) external view override returns (address, uint256)
```
- **Descripción**: Calcula regalía según estándar ERC2981
- **Acceso**: Público (view)
- **Parámetros**:
  - `_tokenId`: ID del NFT
  - `_salePrice`: Precio de venta en wei
- **Retorna**: 
  - Dirección del receptor de regalías
  - Monto de regalía calculado (salePrice * 5%)
- **Uso**: Marketplace consulta antes de cada venta

#### supportsInterface() - ERC165
```solidity
function supportsInterface(bytes4 interfaceId) 
    public view override(ERC721URIStorage, IERC165) 
    returns (bool)
```
- Soporta interfaces: ERC721, ERC721Metadata, ERC2981

### Funciones de Consulta

```solidity
function getUserNFTs(address _owner) external view returns (uint256[] memory)
```
- Retorna todos los tokenIds de un propietario

```solidity
function getRoyaltyReceiver(uint256 tokenId) external view returns (address)
```
- Obtiene artista que recibe regalías de un NFT

---

## 🏪 Marketplace.sol

Mercado secundario para reventa de entradas con distribución automática de regalías.

### Descripción
Permite a usuarios listar sus NFTs para reventa. Implementa compra con distribución automática: 95% al vendedor, 5% al artista creador. Protegido contra ataques de reentrancy.

### Herencia
- `ReentrancyGuard` (OpenZeppelin): Protección contra reentrancy

### Estructuras de Datos

#### Struct: Listing
```solidity
struct Listing {
    address seller;
    uint256 price;
}
```
- `seller`: Dirección del vendedor actual
- `price`: Precio de venta en wei

### Variables de Estado

```solidity
IERC721 public nftContract;
IERC2981 public royaltyContract;
mapping(address => mapping(uint256 => Listing)) public listings;
```

- `nftContract`: Referencia al contrato TicketNFT
- `royaltyContract`: Referencia para consultar regalías (mismo que nftContract)
- `listings`: Mapeo doble (dirección → tokenId → Listing)

### Funciones Principales

#### listTicket()
```solidity
function listTicket(
    address _nftAddress,
    uint256 _tokenId,
    uint256 _price
) external
```
- **Descripción**: Lista un NFT para venta
- **Acceso**: Público
- **Parámetros**:
  - `_nftAddress`: Dirección del contrato NFT
  - `_tokenId`: ID del NFT a listar
  - `_price`: Precio de venta en wei
- **Requisitos**:
  - Caller debe ser dueño del NFT
  - NFT debe estar aprobado para el marketplace
  - Precio mayor que 0
- **Emite**: `TicketListed(address, uint256, address, uint256)`

#### buyTicket()
```solidity
function buyTicket(
    address _nftAddress,
    uint256 _tokenId
) external payable nonReentrant
```
- **Descripción**: Compra un NFT listado con distribución de regalías
- **Acceso**: Público (payable)
- **Parámetros**:
  - `_nftAddress`: Dirección del contrato NFT
  - `_tokenId`: ID del NFT a comprar
- **Requisitos**:
  - NFT debe estar listado
  - msg.value debe ser exacto al precio
- **Flujo**:
  1. Consulta royaltyInfo() para obtener artista y monto
  2. Transfiere 5% (o regalía configurada) al artista
  3. Transfiere 95% restante al vendedor
  4. Transfiere NFT al comprador
  5. Elimina listing
- **Emite**: `TicketSold(address, uint256, address, address, uint256)`
- **Protección**: `nonReentrant` previene ataques

#### cancelListing()
```solidity
function cancelListing(
    address _nftAddress,
    uint256 _tokenId
) external
```
- **Descripción**: Cancela un listado activo
- **Acceso**: Público
- **Parámetros**:
  - `_nftAddress`: Dirección del contrato NFT
  - `_tokenId`: ID del NFT listado
- **Requisitos**: Caller debe ser el vendedor
- **Emite**: `ListingCancelled(address, uint256, address)`

### Funciones de Consulta

```solidity
function getListing(address _nftAddress, uint256 _tokenId) 
    external view returns (address, uint256)
```
- Retorna vendedor y precio de un listing

---

## 🔄 Flujos de Interacción

### Flujo 1: Creación de Evento (Artista)

```
1. Frontend → UserRegistry.registerArtist(artistAddress) [por owner]
2. Frontend → TicketNFT.batchMint(recipients[], tokenURI, 500)
   - Mintea N NFTs con mismo IPFS URI
   - Establece regalía del 5% (500 basis points)
   - Cada NFT se asigna a una dirección (o al artista)
3. NFTs creados y listos para venta primaria
```

### Flujo 2: Compra Primaria (Usuario)

```
1. Usuario → TicketNFT.mint(userAddress, tokenURI, 500) [llamado por artista]
   - Artista mintea directamente al comprador
   - O usuario recibe NFT pre-minteado
2. NFT transferido a usuario
3. Usuario es dueño del NFT
```

### Flujo 3: Reventa en Mercado Secundario

```
1. Usuario (dueño) → TicketNFT.approve(marketplaceAddress, tokenId)
   - Autoriza al marketplace a transferir el NFT

2. Usuario → Marketplace.listTicket(nftAddress, tokenId, precio)
   - Crea listing en el marketplace

3. Comprador → Marketplace.buyTicket(nftAddress, tokenId) {value: precio}
   - Marketplace consulta: royaltyInfo(tokenId, precio)
   - Retorna: (artistAddress, royaltyAmount)
   
4. Marketplace distribuye fondos:
   - transfer(artistAddress, royaltyAmount)      // 5%
   - transfer(seller, precio - royaltyAmount)    // 95%
   
5. Marketplace → TicketNFT.transferFrom(seller, buyer, tokenId)
   - Transfiere NFT al comprador
   
6. Listing eliminado
   - delete listings[nftAddress][tokenId]
```

### Flujo 4: Cancelación de Listing

```
1. Vendedor → Marketplace.cancelListing(nftAddress, tokenId)
2. Listing eliminado, NFT permanece con el vendedor
3. Vendedor puede volver a listar en el futuro
```

---

## 📡 Eventos

### UserRegistry

```solidity
event UserRegistered(address indexed userAddress, UserRole role);
```
- **Cuándo**: Usuario o artista se registra
- **Uso**: Frontend escucha para actualizar UI

### Marketplace

```solidity
event TicketListed(
    address indexed nftAddress,
    uint256 indexed tokenId,
    address indexed seller,
    uint256 price
);
```
- **Cuándo**: NFT listado para venta
- **Uso**: Actualizar lista de reventa en frontend

```solidity
event TicketSold(
    address indexed nftAddress,
    uint256 indexed tokenId,
    address indexed seller,
    address buyer,
    uint256 price
);
```
- **Cuándo**: NFT vendido exitosamente
- **Uso**: Notificar comprador y vendedor, actualizar UI

```solidity
event ListingCancelled(
    address indexed nftAddress,
    uint256 indexed tokenId,
    address indexed seller
);
```
- **Cuándo**: Vendedor cancela listing
- **Uso**: Remover de lista de reventa en frontend

---

## 🔒 Seguridad

### Protecciones Implementadas

#### 1. ReentrancyGuard (Marketplace)
```solidity
function buyTicket(...) external payable nonReentrant
```
- Previene ataques de reentrada durante transferencias de ETH
- Crítico en función que maneja fondos

#### 2. Control de Acceso (UserRegistry)
```solidity
function registerArtist(...) external onlyOwner
```
- Solo owner puede crear artistas
- Previene registros maliciosos

#### 3. Validación de Roles (TicketNFT)
```solidity
modifier onlyArtist() {
    require(userRegistry.isArtist(msg.sender), "Only artists can mint");
    _;
}
```
- Solo artistas verificados pueden mintear
- Previene creación no autorizada de NFTs

#### 4. Validaciones de Ownership
```solidity
require(IERC721(_nftAddress).ownerOf(_tokenId) == msg.sender);
```
- Verifica propiedad antes de listar o cancelar
- Previene manipulación de NFTs ajenos

#### 5. Checks-Effects-Interactions Pattern
```solidity
// Marketplace.buyTicket() sigue el patrón CEI:
// 1. Checks
require(listing.price > 0, "Ticket not listed");
require(msg.value == listing.price, "Incorrect price");

// 2. Effects (modificar estado antes de transferencias)
delete listings[_nftAddress][_tokenId];

// 3. Interactions (transferencias externas al final)
payable(royaltyReceiver).transfer(royaltyAmount);
payable(seller).transfer(msg.value - royaltyAmount);
nftContract.transferFrom(seller, msg.sender, _tokenId);
```

### Mejores Prácticas Aplicadas

- ✅ **OpenZeppelin**: Uso de contratos auditados
- ✅ **Immutable**: Variables que no cambian marcadas como `constant` o `immutable`
- ✅ **Explicit Visibility**: Todas las funciones tienen visibilidad explícita
- ✅ **Indexed Events**: Parámetros indexados para filtrado eficiente
- ✅ **No Ether Lock**: Fondos nunca quedan atrapados en contratos
- ✅ **Integer Overflow**: Solidity 0.8+ previene overflow automáticamente

---

## 📊 Gas Optimization

### Técnicas Implementadas

1. **Batch Minting**: `batchMint()` reduce gas al crear múltiples NFTs
2. **uint96 para Royalties**: Usa menos storage que uint256
3. **Delete Listings**: Libera storage y obtiene gas refund
4. **View Functions**: Lecturas gratuitas desde fuera de la blockchain

---

## 🧪 Testing

Ver `test/README.md` para información detallada de testing:
- **39 tests** cubriendo todos los contratos
- Tests de integración entre contratos
- Validación de distribución de regalías
- Casos edge y validaciones de error

---

## 🔧 Configuración de Despliegue

### Truffle Migration

```javascript
// 2_deploy_contracts.js
const UserRegistry = artifacts.require("UserRegistry");
const TicketNFT = artifacts.require("TicketNFT");
const Marketplace = artifacts.require("Marketplace");

module.exports = async function (deployer) {
  // 1. Desplegar UserRegistry
  await deployer.deploy(UserRegistry);
  const userRegistry = await UserRegistry.deployed();
  
  // 2. Desplegar TicketNFT con referencia a UserRegistry
  await deployer.deploy(TicketNFT, userRegistry.address);
  const ticketNFT = await TicketNFT.deployed();
  
  // 3. Desplegar Marketplace con referencia a TicketNFT
  await deployer.deploy(Marketplace, ticketNFT.address);
};
```

### Orden de Despliegue Crítico

1. **UserRegistry** (no tiene dependencias)
2. **TicketNFT** (necesita dirección de UserRegistry)
3. **Marketplace** (necesita dirección de TicketNFT)

---

## 📞 ABIs y Frontend Integration

Los ABIs generados tras compilación se copian a `src/contracts/`:
- `UserRegistry.json`
- `TicketNFT.json`
- `Marketplace.json`

Frontend usa Web3.js para interactuar:

```typescript
import UserRegistryABI from '../contracts/UserRegistry.json';

const contract = new web3.eth.Contract(
  UserRegistryABI.abi,
  contractAddress
);

await contract.methods.registerUser().send({ from: account });
```