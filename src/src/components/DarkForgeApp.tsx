import { useCallback, useEffect, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { publicClient } from '../config/clients';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/DarkForgeApp.css';

// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HANDLE = `0x${'0'.repeat(64)}`;

type SoldierEntry = {
  attackHandle?: string;
  defenseHandle?: string;
  decryptedAttack?: string;
  decryptedDefense?: string;
  isDecrypting?: boolean;
};

function formatHandle(handle?: string) {
  if (!handle || handle === ZERO_HANDLE) {
    return 'Uninitialized';
  }
  return `${handle.slice(0, 6)}...${handle.slice(-4)}`;
}

export function DarkForgeApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [soldierIds, setSoldierIds] = useState<bigint[]>([]);
  const [soldierStats, setSoldierStats] = useState<Record<string, SoldierEntry>>({});
  const [pointsHandle, setPointsHandle] = useState<string>(ZERO_HANDLE);
  const [pointsValue, setPointsValue] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [attackingTokenId, setAttackingTokenId] = useState<bigint | null>(null);
  const [isDecryptingPoints, setIsDecryptingPoints] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDeployedAddress = true;
  const isReady = isConnected && address && isDeployedAddress;

  const resetMessages = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const refreshData = useCallback(async () => {
    resetMessages();

    if (!address || !isDeployedAddress) {
      setSoldierIds([]);
      setSoldierStats({});
      setPointsHandle(ZERO_HANDLE);
      setPointsValue(null);
      return;
    }

    setIsRefreshing(true);
    try {
      const ids = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getSoldierIds',
        args: [address],
      })) as bigint[];

      setSoldierIds(ids);

      const statsEntries = await Promise.all(
        ids.map(async (tokenId) => {
          const [attackHandle, defenseHandle] = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getSoldierStats',
            args: [tokenId],
          })) as readonly [`0x${string}`, `0x${string}`];

          return [
            tokenId.toString(),
            {
              attackHandle,
              defenseHandle,
            },
          ] as const;
        }),
      );

      setSoldierStats((prev) => {
        const next: Record<string, SoldierEntry> = { ...prev };
        for (const [tokenId, entry] of statsEntries) {
          next[tokenId] = { ...prev[tokenId], ...entry };
        }
        return next;
      });

      const encryptedPoints = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getPoints',
        args: [address],
      })) as string;

      setPointsHandle(encryptedPoints);
      setPointsValue(null);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setErrorMessage('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isDeployedAddress, resetMessages]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const decryptHandle = useCallback(
    async (handle: string) => {
      if (!instance) {
        throw new Error('Encryption service is not ready.');
      }
      if (!signerPromise) {
        throw new Error('Wallet signer is not available.');
      }

      const signer = await signerPromise;
      const signerAddress = await signer.getAddress();

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        signerAddress,
        startTimeStamp,
        durationDays,
      );

      const decrypted = result[handle];
      if (typeof decrypted === 'bigint') {
        return decrypted.toString();
      }
      return `${decrypted}`;
    },
    [instance, signerPromise],
  );

  const handleMint = async () => {
    resetMessages();
    if (!isReady || !signerPromise) {
      setErrorMessage('Connect your wallet and switch to Sepolia.');
      return;
    }

    setIsMinting(true);
    try {
      const signer = await signerPromise;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintSoldier();
      await tx.wait();
      setStatusMessage('Soldier forged. Encrypted stats sealed.');
      await refreshData();
    } catch (error) {
      console.error('Mint failed:', error);
      setErrorMessage('Failed to mint soldier.');
    } finally {
      setIsMinting(false);
    }
  };

  const handleAttack = async (tokenId: bigint) => {
    resetMessages();
    if (!isReady || !signerPromise) {
      setErrorMessage('Connect your wallet and switch to Sepolia.');
      return;
    }

    setAttackingTokenId(tokenId);
    try {
      const signer = await signerPromise;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.attackMonster(tokenId);
      await tx.wait();
      setStatusMessage(`Monster defeated by Soldier #${tokenId.toString()}.`);
      await refreshData();
    } catch (error) {
      console.error('Attack failed:', error);
      setErrorMessage('Failed to attack the monster.');
    } finally {
      setAttackingTokenId(null);
    }
  };

  const handleDecryptStats = async (tokenId: bigint) => {
    resetMessages();
    const entry = soldierStats[tokenId.toString()];
    if (!entry?.attackHandle || !entry?.defenseHandle) {
      setErrorMessage('Soldier stats are not available yet.');
      return;
    }
    if (entry.attackHandle === ZERO_HANDLE || entry.defenseHandle === ZERO_HANDLE) {
      setErrorMessage('Encrypted stats are not ready yet.');
      return;
    }
    if (!instance || !signerPromise) {
      setErrorMessage('Encryption service is not ready.');
      return;
    }

    setSoldierStats((prev) => ({
      ...prev,
      [tokenId.toString()]: { ...prev[tokenId.toString()], isDecrypting: true },
    }));

    try {
      const [attack, defense] = await Promise.all([
        decryptHandle(entry.attackHandle),
        decryptHandle(entry.defenseHandle),
      ]);
      setSoldierStats((prev) => ({
        ...prev,
        [tokenId.toString()]: {
          ...prev[tokenId.toString()],
          decryptedAttack: attack,
          decryptedDefense: defense,
        },
      }));
    } catch (error) {
      console.error('Decryption failed:', error);
      setErrorMessage('Failed to decrypt soldier stats.');
    } finally {
      setSoldierStats((prev) => ({
        ...prev,
        [tokenId.toString()]: { ...prev[tokenId.toString()], isDecrypting: false },
      }));
    }
  };

  const handleDecryptPoints = async () => {
    resetMessages();
    if (pointsHandle === ZERO_HANDLE) {
      setPointsValue('0');
      return;
    }
    if (!instance || !signerPromise) {
      setErrorMessage('Encryption service is not ready.');
      return;
    }

    setIsDecryptingPoints(true);
    try {
      const decrypted = await decryptHandle(pointsHandle);
      setPointsValue(decrypted);
    } catch (error) {
      console.error('Decrypt points failed:', error);
      setErrorMessage('Failed to decrypt points.');
    } finally {
      setIsDecryptingPoints(false);
    }
  };

  const cards = (() => {
    if (!isConnected) {
      return (
        <div className="empty-state">
          <h3>Connect your wallet</h3>
          <p>Forge your first Soldier on Sepolia and start earning encrypted points.</p>
        </div>
      );
    }

    if (!isDeployedAddress) {
      return (
        <div className="empty-state">
          <h3>Contract not configured</h3>
          <p>Update the deployed address in the frontend config to begin.</p>
        </div>
      );
    }

    if (soldierIds.length === 0) {
      return (
        <div className="empty-state">
          <h3>No Soldiers yet</h3>
          <p>Mint a Soldier to unlock encrypted stats and battle rewards.</p>
        </div>
      );
    }

    return (
      <div className="soldier-grid">
        {soldierIds.map((tokenId) => {
          const entry = soldierStats[tokenId.toString()];
          return (
            <article key={tokenId.toString()} className="soldier-card">
              <div className="soldier-header">
                <div>
                  <p className="soldier-label">Soldier</p>
                  <h3>#{tokenId.toString()}</h3>
                </div>
                <span className="soldier-tag">Encrypted</span>
              </div>
              <div className="soldier-stat">
                <span>Attack</span>
                <strong>{entry?.decryptedAttack ?? formatHandle(entry?.attackHandle)}</strong>
              </div>
              <div className="soldier-stat">
                <span>Defense</span>
                <strong>{entry?.decryptedDefense ?? formatHandle(entry?.defenseHandle)}</strong>
              </div>
              <div className="soldier-actions">
                <button
                  className="primary-button"
                  onClick={() => handleAttack(tokenId)}
                  disabled={attackingTokenId === tokenId || !isReady}
                >
                  {attackingTokenId === tokenId ? 'Attacking...' : 'Attack Monster'}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => handleDecryptStats(tokenId)}
                  disabled={entry?.isDecrypting || !isReady}
                >
                  {entry?.isDecrypting ? 'Decrypting...' : 'Decrypt Stats'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  })();

  return (
    <div className="forge-app">
      <Header />
      <main className="forge-main">
        <section className="hero">
          <div>
            <p className="hero-eyebrow">FHE-enabled arena</p>
            <h2>Forge soldiers, hide power, strike monsters.</h2>
            <p>
              DarkForge mints Soldier NFTs with encrypted stats. Only you can decrypt your attack, defense, and point
              totals using the Zama relayer.
            </p>
          </div>
          <div className="hero-card">
            <h3>Forge a Soldier</h3>
            <p>Mint a Soldier NFT with randomized encrypted stats between 10 and 100.</p>
            <button className="primary-button" onClick={handleMint} disabled={!isReady || isMinting}>
              {isMinting ? 'Forging...' : 'Mint Soldier'}
            </button>
            <button className="ghost-button" onClick={refreshData} disabled={!isReady || isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh Arena'}
            </button>
          </div>
        </section>

        <section className="status-strip">
          <div>
            <span>Status</span>
            <strong>{statusMessage ?? 'Awaiting action.'}</strong>
          </div>
          <div>
            <span>Encryption</span>
            <strong>{zamaLoading ? 'Initializing relayer...' : zamaError ? 'Relayer error' : 'Ready'}</strong>
          </div>
        </section>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        <section className="arena-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">Your squad</p>
                <h3>Encrypted soldiers</h3>
              </div>
              <span>{soldierIds.length} active</span>
            </div>
            {cards}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">Rewards</p>
                <h3>Encrypted points</h3>
              </div>
              <span>Sepolia</span>
            </div>
            <div className="points-card">
              <div>
                <p className="points-label">Ciphertext handle</p>
                <strong>{formatHandle(pointsHandle)}</strong>
              </div>
              <div>
                <p className="points-label">Decrypted total</p>
                <strong>{pointsValue ?? '•••'}</strong>
              </div>
              <button
                className="primary-button"
                onClick={handleDecryptPoints}
                disabled={!isReady || isDecryptingPoints}
              >
                {isDecryptingPoints ? 'Decrypting...' : 'Decrypt Points'}
              </button>
            </div>
            <div className="info-card">
              <h4>How it works</h4>
              <ul>
                <li>Minting uses on-chain FHE randomness for stats.</li>
                <li>Attacks reward encrypted points only you can decrypt.</li>
                <li>View handles on-chain, decrypt locally via the relayer.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
