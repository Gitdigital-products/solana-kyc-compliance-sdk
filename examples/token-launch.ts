// Complete token launch with tiered KYC access
import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { KycVerifier, TieredAccess, AccessTier } from '@solana-kyc-sdk/consumer';
 
interface TokenLaunchProps {
  tokenMint: PublicKey;
  launchPhases: LaunchPhase[];
}
 
interface LaunchPhase {
  name: string;
  requirements: AccessTier;
  allocation: number; // Percentage of total supply
  price: number; // Price per token
  startTime: number;
  endTime: number;
}
 
export const TokenLaunch: React.FC<TokenLaunchProps> = ({ tokenMint, launchPhases }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [currentPhase, setCurrentPhase] = useState<LaunchPhase | null>(null);
  const [userTier, setUserTier] = useState<AccessTier | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [kycVerifier] = useState(() => new KycVerifier({ connection }));

  useEffect(() => {
    if (connected && publicKey) {
      determineUserTier();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    // Determine current phase based on time
    const now = Date.now() / 1000;
    const phase = launchPhases.find(
      p => p.startTime <= now && p.endTime > now
    );
    setCurrentPhase(phase || null);
  }, []);

  const determineUserTier = async () => {
    if (!publicKey) return;

    const tiers: AccessTier[] = [
      {
        name: 'whale',
        requirements: {
          kycLevel: 'plus',
          accreditationRequired: true,
          minHoldings: 100000, // $100k minimum
          customCheck: async (wallet) => {
            // Check wallet holdings
            const balance = await connection.getBalance(wallet);
            return balance > 100 * 1e9; // 100 SOL
          }
        }
      },
      {
        name: 'early',
        requirements: {
          kycLevel: 'standard',
          countryWhitelist: ['US', 'CA', 'UK', 'EU', 'SG'],
          attestationAgeDays: 30 // Must have KYC within last 30 days
        }
      },
      {
        name: 'public',
        requirements: {
          kycLevel: 'lite',
          countryBlacklist: [] // All countries allowed
        }
      }
    ];

    const tieredAccess = new TieredAccess(kycVerifier);
    const userTier = await tieredAccess.determineTier(publicKey, tiers);
    setUserTier(userTier);
  };

  const handlePurchase = async () => {
    if (!publicKey || !currentPhase || !userTier) return;

    // Verify user qualifies for current phase
    if (userTier.name !== currentPhase.requirements.name) {
      alert(`You must have ${currentPhase.requirements.name} access for this phase`);
      return;
    }

    // Additional verification
    const canPurchase = await kycVerifier.verifyWalletAccess(publicKey, {
      ...currentPhase.requirements,
      customCheck: async (wallet) => {
        // Check if user hasn't exceeded allocation
        const purchases = await getPurchasesForWallet(wallet);
        const allocated = currentPhase.allocation * TOTAL_SUPPLY / 100;
        return purchases < allocated;
      }
    });

    if (!canPurchase.allowed) {
      alert(canPurchase.reason || 'Purchase not allowed');
      return;
    }

    // Execute purchase
    await purchaseTokens(publicKey, parseFloat(purchaseAmount), currentPhase.price);
  };

  if (!connected) {
    return (
      <div className="launch-container">
        <h1>Token Launch</h1>
        <p>Connect your wallet to participate</p>
        <WalletMultiButton />
      </div>
    );
  }

  if (!userTier) {
    return <div>Determining your access tier...</div>;
  }

  return (
    <div className="launch-container">
      <div className="launch-header">
        <h1>XYZ Token Launch</h1>
        <div className={`tier-badge ${userTier.name}`}>
          {userTier.name.toUpperCase()} TIER
        </div>
      </div>

      <div className="phase-display">
        <h2>Current Phase: {currentPhase?.name || 'Not Started'}</h2>
        {currentPhase && (
          <div className="phase-details">
            <p>Price: {currentPhase.price} SOL per token</p>
            <p>Allocation: {currentPhase.allocation}% of supply</p>
            <p>Requirements: {JSON.stringify(currentPhase.requirements)}</p>
          </div>
        )}
      </div>

      <div className="tier-access">
        <h3>Your Access Level</h3>
        <div className="tier-info">
          <p><strong>Tier:</strong> {userTier.name}</p>
          <p><strong>Max Purchase:</strong> {calculateMaxPurchase(userTier)} tokens</p>
          <button onClick={() => window.open('/upgrade-tier', '_blank')}>
            Upgrade Tier
          </button>
        </div>
      </div>

      {currentPhase && userTier.name === currentPhase.requirements.name && (
        <div className="purchase-section">
          <h3>Purchase Tokens</h3>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            placeholder="Token amount"
            min="0"
            max={calculateMaxPurchase(userTier)}
          />
          <div className="purchase-summary">
            <p>Total Cost: {parseFloat(purchaseAmount) * currentPhase.price} SOL</p>
            <p>You will receive: {purchaseAmount} XYZ tokens</p>
          </div>
          <button onClick={handlePurchase} disabled={!purchaseAmount}>
            Purchase Tokens
          </button>
        </div>
      )}

      <div className="phase-schedule">
        <h3>Launch Schedule</h3>
        {launchPhases.map((phase, index) => (
          <div key={index} className={`phase-schedule-item ${
            phase.name === currentPhase?.name ? 'active' : ''
          }`}>
            <div className="phase-name">{phase.name}</div>
            <div className="phase-time">
              {new Date(phase.startTime * 1000).toLocaleDateString()} - 
              {new Date(phase.endTime * 1000).toLocaleDateString()}
            </div>
            <div className="phase-requirements">
              Requires: {phase.requirements.kycLevel || 'Any'} KYC
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
 
// Utility function to check real-time attestation status
export async function checkRealTimeAccess(
  wallet: PublicKey,
  requirements: AccessRequirements
): Promise<{ allowed: boolean; expiresIn?: number }> {
  const verifier = new KycVerifier();
  const result = await verifier.verifyWalletAccess(wallet, requirements);
 
  if (!result.allowed || !result.attestationUsed) {
    return { allowed: false };
  }
 
  // Check how long until attestation expires
  const expiresIn = result.attestationUsed.expirationDate 
    ? result.attestationUsed.expirationDate - Date.now() / 1000
    : undefined;
 
  return {
    allowed: result.allowed,
    expiresIn: expiresIn && expiresIn > 0 ? expiresIn : undefined
  };