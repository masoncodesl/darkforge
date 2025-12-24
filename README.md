# DarkForge

DarkForge is a privacy-first on-chain arena where players mint Soldier NFTs with encrypted stats and earn encrypted
points by battling monsters. It is built on Zama FHEVM, so attack, defense, and rewards are never revealed on-chain
unless the owner explicitly decrypts them.

## Overview

DarkForge blends game-like progression with fully homomorphic encryption. Players mint Soldiers, view encrypted stat
handles, and choose when to decrypt those values using the Zama relayer. Every battle outcome updates encrypted points,
keeping competitive advantages private while still preserving transparent, verifiable state transitions.

## Problem Statement

Traditional on-chain games leak all attributes and rewards on-chain, enabling:
- Immediate stat scraping and copycat strategies.
- Targeted attacks against high-value players.
- Unfair meta optimization driven by public data rather than player skill.

DarkForge addresses this by encrypting all sensitive state while retaining on-chain composability.

## Solution Summary

DarkForge uses FHEVM encrypted types to store Soldier attack/defense values and player points. Encryption permissions are
granted to the contract and the owner only. Users decrypt locally via the relayer after signing an EIP-712 request.

## Core Features

- Mint Soldier NFTs with randomized encrypted attack and defense values between 10 and 100.
- Retrieve encrypted Soldier stats on-chain as ciphertext handles.
- Decrypt stats on demand using the Zama relayer and wallet signature.
- Attack monsters to earn encrypted points that only the player can decrypt.
- Query encrypted points for any player address without exposing actual totals.

## Advantages

- Strong privacy for player attributes and rewards.
- Fully on-chain state transitions with encrypted values.
- Simple user flow: mint, view handles, decrypt when needed, attack, earn points.
- No local storage for sensitive data; state lives on-chain and remains encrypted.
- Frontend avoids localhost networks and targets Sepolia for a consistent public testnet experience.

## Technology Stack

### On-chain
- Solidity with FHE encrypted types (`@fhevm/solidity`)
- Hardhat + hardhat-deploy
- Zama FHEVM configuration and tooling

### Frontend
- React + Vite
- viem for read operations
- ethers for write operations
- RainbowKit + wagmi for wallet connectivity
- Zama relayer SDK for decryption workflow

### Tooling
- TypeScript, ESLint, Prettier
- Mocha + Chai for tests

## Architecture

- `contracts/` holds the DarkForge smart contract.
- `deploy/` contains deployment scripts.
- `tasks/` contains custom Hardhat tasks.
- `test/` contains contract tests.
- `deployments/` stores deployment artifacts and ABI files.
- `src/` is the Vite-based frontend application (separate workspace).

## Smart Contract Details

### DarkForge.sol

Data model:
- `Soldier` stores `attack` and `defense` as encrypted `euint32`.
- Ownership is tracked via `_owners` and `_ownedTokens`.
- Player points are tracked in `_points` as encrypted `euint32`.

Key functions:
- `mintSoldier()`: Mints a Soldier with encrypted randomized stats.
- `getSoldierIds(address)`: Returns all token IDs owned by an address.
- `getSoldierStats(uint256)`: Returns encrypted attack/defense handles.
- `getPoints(address)`: Returns encrypted points for a player.
- `attackMonster(uint256)`: Updates encrypted points based on Soldier power.

Encryption permissions:
- Stats and points call `FHE.allowThis` for contract access.
- `FHE.allow` grants the owner access to decrypt their own data.

Randomness:
- Uses FHEVM randomness (`FHE.randEuint32`) to generate encrypted stat and reward components.

## Frontend Details

Frontend responsibilities:
- Read encrypted handles with viem.
- Submit write transactions with ethers.
- Request decryption through the Zama relayer using EIP-712 signatures.
- Render both handles and decrypted values when available.

Frontend configuration:
- Uses Sepolia only (no localhost networks).
- No environment variables are required in the frontend.
- No JSON imports in frontend code. ABI is copied from `deployments/sepolia` into a TypeScript module.
- Frontend does not import from root-level files.

## User Flow

1. Connect a wallet on Sepolia.
2. Mint a Soldier NFT; encrypted stats are generated on-chain.
3. View encrypted stat handles in the UI.
4. Decrypt stats locally through the relayer when desired.
5. Attack a monster and earn encrypted points.
6. Decrypt points to see totals.

## Development Workflow

### Prerequisites

- Node.js 20 or newer
- npm 7 or newer

### Install Dependencies

Root contracts workspace:
```bash
npm install
```

Frontend workspace:
```bash
cd src
npm install
```

### Compile and Test

```bash
npm run compile
npm run test
```

Optional utilities:
```bash
npm run lint
npm run coverage
```

### Local Contract Testing (backend only)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

Note: The frontend does not target localhost.

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Run tests on Sepolia:
```bash
npm run test:sepolia
```

### Run the Frontend

```bash
cd src
npm run dev
```

## Environment Configuration

Create a `.env` in the repository root:
```bash
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

Deployment uses `PRIVATE_KEY` only. Do not use a mnemonic.

## ABI and Address Updates

1. Deploy to Sepolia.
2. Copy the contract ABI from `deployments/sepolia` into the frontend TypeScript ABI module.
3. Update the deployed address in the frontend config.

## Documentation

- `docs/zama_llm.md` for FHEVM contract guidance.
- `docs/zama_doc_relayer.md` for relayer and decryption flow.
- Zama FHEVM docs: https://docs.zama.ai/fhevm

## Future Roadmap

- Expand combat system with multiple monster types and difficulty tiers.
- Add seasonal ladders and encrypted leaderboards.
- Introduce crafting and upgrade mechanics with encrypted ingredients.
- Improve randomness sourcing and battle balancing.
- Add richer NFT metadata and visuals while keeping stats private.
- Explore interoperability with other FHE-enabled contracts.

## License

BSD-3-Clause-Clear. See `LICENSE` for details.
