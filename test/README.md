# Tests de Smart Contracts - TicketChain

Este directorio contiene los tests unitarios para los smart contracts del proyecto TicketChain.

## 📋 Estructura de Tests

```
test/
├── TicketNFT.test.js       # Tests para el contrato de NFTs (ERC721 + ERC2981)
├── Marketplace.test.js     # Tests para el marketplace (compra/venta + royalties)
└── UserRegistry.test.js    # Tests para el registro de usuarios y artistas
```

## 🔧 Requisitos Previos

1. **Ganache** debe estar ejecutándose:
   - Abrir Ganache Desktop
   - O ejecutar: `ganache-cli`

2. **Contratos compilados**:
   ```bash
   truffle compile
   ```

3. **Contratos desplegados** (opcional para algunos tests):
   ```bash
   truffle migrate --reset
   ```

## ▶️ Ejecutar Tests

### Ejecutar TODOS los tests:
```bash
truffle test
```

### Ejecutar un archivo específico:
```bash
# Solo tests de TicketNFT
truffle test test/TicketNFT.test.js

# Solo tests de Marketplace
truffle test test/Marketplace.test.js

# Solo tests de UserRegistry
truffle test test/UserRegistry.test.js
```

### Ejecutar con detalles (mostrar eventos):
```bash
truffle test --show-events
```

### Ejecutar en red específica:
```bash
truffle test --network development
```

## 📊 Cobertura de Tests

### **TicketNFT.test.js** (10 tests)
- ✅ Minting (4 tests)
- ✅ Royalties ERC2981 (3 tests)
- ✅ Batch Minting (3 tests)

### **Marketplace.test.js** (7 tests)
- ✅ Listing (2 tests)
- ✅ Buying (3 tests)
- ✅ Royalty Distribution (2 tests)

### **UserRegistry.test.js** (22 tests)
- ✅ Deployment (1 test)
- ✅ User Registration (5 tests)
- ✅ Artist Registration (4 tests)
- ✅ Mixed Users and Artists (2 tests)
- ✅ Query Functions (7 tests)
- ✅ Edge Cases (3 tests)

**Total: 39 tests**

## 📝 Resultado Esperado

```bash
$ truffle test

  Contract: TicketNFT
    Minting
      ✓ debería permitir al artista mintear NFTs
      ✓ NO debería permitir a usuarios normales mintear
      ✓ debería incrementar totalSupply correctamente
      ✓ debería asignar tokenIds secuenciales
    Royalties ERC2981
      ✓ debería devolver info de royalty correcta al 5%
      ✓ debería calcular royalty correctamente para 10 ETH
      ✓ debería devolver royalty 0 para precio 0
    Batch Minting
      ✓ debería mintear múltiples NFTs correctamente
      ✓ debería asignar tokenIds secuenciales en batch
      ✓ NO debería permitir batch mint a usuarios no artistas

  Contract: Marketplace
    Listing
      ✓ debería listar un ticket correctamente
      ✓ NO debería permitir listar sin ser owner
    Buying
      ✓ debería comprar ticket y transferir NFT
      ✓ debería distribuir royalties correctamente (5% artista, 95% seller)
      ✓ NO debería comprar con precio incorrecto
    Royalty Distribution
      ✓ debería distribuir royalties en ventas secundarias
      ✓ debería verificar que el artista recibe el 5%

  Contract: UserRegistry
    Deployment
      ✓ debería desplegar correctamente
    User Registration
      ✓ debería registrar un usuario correctamente
      ✓ debería permitir registrar múltiples usuarios
      ✓ NO debería permitir registrar usuario ya registrado
      ✓ debería verificar correctamente si usuario está registrado
      ✓ debería verificar que usuario registrado NO es artista
    Artist Registration
      ✓ debería registrar un artista correctamente
      ✓ debería permitir registrar múltiples artistas
      ✓ NO debería permitir registrar artista ya registrado
      ✓ debería verificar correctamente si usuario es artista
    Mixed Users and Artists
      ✓ debería diferenciar entre usuarios y artistas
      ✓ debería tener ambos registrados
    Query Functions
      ✓ debería devolver perfil completo de usuario
      ✓ debería devolver perfil completo de artista
      ✓ debería devolver valores por defecto para usuario no registrado
      ✓ isUserRegistered debe devolver false para dirección no registrada
      ✓ isArtist debe devolver false para dirección no registrada
      ✓ isArtist debe devolver false para usuario normal
      ✓ isArtist debe devolver true para artista registrado
    Edge Cases
      ✓ diferentes usuarios pueden tener el mismo rol
      ✓ debería manejar correctamente registros consecutivos
      ✓ debería mantener consistencia entre isArtist e isRegistered

  39 passing (7s)
```

## 🎯 Tests Clave

### Tests de Royalties (Importante para TFM):
- `Marketplace.test.js`: "debería distribuir royalties correctamente"
  - Verifica que el 5% va al artista
  - Verifica que el 95% va al vendedor
  - Usa cálculos exactos de balance

### Tests de Seguridad:
- NO permitir mintear sin permisos
- NO permitir listar sin ownership
- NO permitir comprar con precio incorrecto
- NO permitir delist por usuarios no autorizados

### Tests de Integración:
- Mintear → Listar → Comprar → Transferir (flujo completo)
- Múltiples listings simultáneos
- Re-listing después de delist

## 🐛 Debugging

Si un test falla:

1. **Ver detalles del error:**
   ```bash
   truffle test --show-events --stacktrace
   ```

2. **Verificar estado de Ganache:**
   - Ganache debe estar en puerto 7545
   - Debe tener al menos 5 cuentas con ETH

3. **Resetear estado:**
   ```bash
   truffle migrate --reset
   truffle test
   ```

## 📈 Coverage (Opcional)

Para medir cobertura de código:

```bash
npm install --save-dev solidity-coverage
truffle run coverage
```

## 🚀 Para el TFM

**Puntos importantes:**
1. Ejecutar: `truffle test` y capturar screenshot mostrando "39 passing"
2. Destacar tests de royalties (5%)
3. Mostrar tests de seguridad (casos negativos)
4. Mencionar que se prueba en entorno local (Ganache)
5. Total: 39 tests cubriendo 3 contratos

## 📚 Referencias

- [Truffle Testing](https://trufflesuite.com/docs/truffle/testing/testing-your-contracts/)
- [Mocha Testing Framework](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)

---

**Nota:** Estos tests están diseñados para ejecutarse en Ganache local. No requieren testnet pública ni costos de gas.
