# TicketChain - Sistema de Venta de Entradas con Blockchain

Plataforma descentralizada de venta de entradas basada en tecnología blockchain que permite a artistas crear y vender NFTs como tickets para eventos, con un mercado secundario que incluye distribución automática de regalías.

## 📋 Descripción del Proyecto

TicketChain es una aplicación híbrida que combina smart contracts en Ethereum con una interfaz web desarrollada en Angular/Ionic. El sistema implementa NFTs (ERC721) como entradas para eventos, permitiendo:

- Registro de usuarios y artistas con roles diferenciados
- Creación y venta de entradas como NFTs con metadata IPFS
- Mercado secundario con distribución automática de regalías del 5%
- Gestión completa del ciclo de vida de las entradas

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Angular/Ionic)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Login Tabs  │  │  User Tabs   │  │  Artist Tabs │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Web3.js     │
                    │   MetaMask    │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Blockchain (Ethereum/Ganache)            │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ UserRegistry   │  │ TicketNFT  │  │ Marketplace  │  │
│  │  (Roles)       │  │ (ERC721)   │  │ (Trading)    │  │
│  └────────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │     IPFS      │
                    │  (Metadata)   │
                    └───────────────┘
```

## 🛠️ Stack Tecnológico

### Smart Contracts
- **Solidity**: 0.8.9
- **OpenZeppelin**: Contratos seguros (ERC721, ERC2981, Ownable, ReentrancyGuard)
- **Truffle**: Framework de desarrollo y testing
- **Ganache**: Blockchain local para desarrollo
- **Web3.js**: Interacción con la blockchain

### Frontend
- **Angular**: 15.0.0
- **Ionic**: 7.0.0 (Framework híbrido para web y móvil)
- **TypeScript**: 4.8.4
- **RxJS**: 7.5.0 (Programación reactiva)

### Almacenamiento
- **IPFS**: Almacenamiento descentralizado de metadata de NFTs

### Testing
- **Mocha**: Framework de testing
- **Chai**: Librería de aserciones
- **39 tests**: Cobertura completa de smart contracts

## 📦 Requisitos Previos

- **Node.js**: >= 14.x
- **npm**: >= 6.x
- **Truffle**: `npm install -g truffle`
- **Ganache**: Blockchain local (GUI o CLI)
- **MetaMask**: Extensión de navegador para Web3

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd tfmPractica
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Ganache
Iniciar Ganache en el puerto 7545 con las siguientes configuraciones:
- Network ID: 5777
- Port: 7545
- Accounts: 10 cuentas con 100 ETH cada una

### 4. Compilar y desplegar smart contracts
```bash
cd contracts
truffle compile
truffle migrate --reset
```

### 5. Configurar MetaMask
- Añadir red personalizada:
  - RPC URL: http://127.0.0.1:7545
  - Chain ID: 5777
- Importar cuentas desde Ganache usando las claves privadas

## 🎮 Ejecución

### Ejecutar tests de smart contracts
```bash
cd contracts
truffle test
```

Resultado esperado: 39 tests pasando

### Iniciar aplicación frontend
```bash
ionic serve
```

La aplicación estará disponible en `http://localhost:8100`

## 📁 Estructura del Proyecto

```
tfmPractica/
├── contracts/                    # Smart contracts Solidity
│   ├── UserRegistry.sol         # Gestión de roles (Usuario/Artista)
│   ├── TicketNFT.sol           # NFTs de entradas (ERC721 + ERC2981)
│   ├── Marketplace.sol         # Mercado secundario con regalías
│   ├── Migrations.sol          # Control de despliegues
│   ├── test/                   # 39 tests de smart contracts
│   └── README.md               # Documentación técnica de contratos
├── src/
│   ├── app/
│   │   ├── login-tabs/         # Módulo de login
│   │   │   ├── tab1/          # Página de login
│   │   │   └── tabs/          # Contenedor
│   │   ├── user-tabs/         # Módulo de usuario
│   │   │   ├── tab1/          # Mercado secundario (reventa)
│   │   │   ├── tab2/          # Mercado primario (eventos)
│   │   │   ├── tab3/          # Perfil de usuario
│   │   │   └── tabs/          # Contenedor
│   │   ├── artist-tabs/       # Módulo de artista
│   │   │   ├── tab2/          # Crear evento
│   │   │   ├── tab3/          # Perfil de artista
│   │   │   └── tabs/          # Contenedor
│   │   └── services/          # Servicios compartidos
│   ├── assets/                # Recursos estáticos
│   ├── contracts/             # ABIs de smart contracts
│   ├── environments/          # Configuración de entornos
│   └── theme/                 # Estilos globales
├── resources/                 # Iconos y splash screens
├── angular.json              # Configuración Angular
├── ionic.config.json         # Configuración Ionic
├── package.json              # Dependencias del proyecto
├── truffle-config.js         # Configuración Truffle
└── README.md                 # Este archivo
```

## 🔑 Funcionalidades Principales

### Para Usuarios
1. **Conectar Wallet**: Autenticación mediante MetaMask
2. **Registro**: Crear perfil de usuario en blockchain
3. **Comprar Entradas**: Adquirir NFTs de eventos disponibles
4. **Mercado Secundario**: Comprar entradas de reventa con regalías automáticas
5. **Ver Perfil**: Visualizar entradas adquiridas y datos de cuenta

### Para Artistas
1. **Registro de Artista**: Activación de permisos por el owner del contrato
2. **Crear Eventos**: Mintear NFTs con metadata IPFS (título, descripción, precio, cantidad)
3. **Recibir Regalías**: 5% automático en ventas del mercado secundario
4. **Gestionar Eventos**: Ver eventos creados y estadísticas

### Sistema de Regalías
- **5% de cada venta secundaria** va automáticamente al artista creador
- Implementado mediante ERC2981 (estándar de regalías)
- Distribución automática en cada transacción del marketplace

## 🧪 Testing

### Cobertura de Tests
- **UserRegistry**: 22 tests (registro, roles, validaciones)
- **TicketNFT**: 10 tests (minting, royalties, ownership)
- **Marketplace**: 7 tests (listing, compra, regalías)
- **Total**: 39 tests pasando

Ver detalles completos en `contracts/test/README.md`

## 🔒 Seguridad

- **OpenZeppelin**: Contratos auditados y seguros
- **ReentrancyGuard**: Protección contra ataques de reentrada
- **Ownable**: Control de acceso para funciones críticas
- **Role-based Access**: Sistema de roles (Usuario/Artista)

## 📝 Flujos de Usuario

### Flujo de Compra (Mercado Primario)
1. Usuario conecta wallet → Login
2. Navega a "Eventos" → Ve lista de eventos disponibles
3. Selecciona evento → Click en "Comprar"
4. Confirma transacción en MetaMask → NFT minteado
5. NFT aparece en su perfil

### Flujo de Reventa (Mercado Secundario)
1. Usuario con NFT → Navega a "Reventa"
2. Lista su NFT con precio → Transacción en blockchain
3. Otro usuario compra → Pago se divide: 95% vendedor + 5% artista
4. NFT transferido automáticamente

### Flujo de Creación de Evento (Artista)
1. Artista registrado → Navega a "Crear Evento"
2. Completa formulario → Sube imagen a IPFS
3. Mintea NFTs con metadata → Transacción en blockchain
4. Evento disponible para usuarios

## 🤝 Contribuir

Este proyecto es parte de un Trabajo de Fin de Máster (TFM). Para consultas o contribuciones, contactar con el autor.

## 📄 Licencia

Este proyecto está desarrollado como parte de un TFM académico.

## 👤 Autor

Proyecto desarrollado como Trabajo de Fin de Máster.

## 📚 Documentación Adicional

- **Smart Contracts**: Ver `contracts/README.md` para documentación técnica detallada
- **Tests**: Ver `contracts/test/README.md` para información de testing
- **API Reference**: Los contratos implementan estándares ERC721, ERC2981

## 🐛 Troubleshooting

### Error de conexión a Ganache
- Verificar que Ganache esté corriendo en `http://127.0.0.1:7545`
- Confirmar Network ID 5777

### MetaMask no detecta red
- Añadir red personalizada manualmente
- Verificar Chain ID 5777

### Transacciones fallidas
- Verificar saldo suficiente de ETH en cuenta
- Confirmar que los contratos estén desplegados correctamente
- Revisar logs de Ganache para errores

## 📞 Contacto

Para preguntas sobre el proyecto, consultar con el equipo de desarrollo.
