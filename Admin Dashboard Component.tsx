import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useComplianceManager } from './hooks/useComplianceManager';
import { ComplianceFlags } from '@gitdigital/compliance-sdk';

export const UserComplianceCard = ({ userWallet }: { userWallet: string }) => {
  const manager = useComplianceManager();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!manager) return;
    setLoading(true);
    try {
      // Set US Accredited and EU MiCA bits, expire in 1 year
      const oneYear = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      await manager.updateComplianceBits(
        new PublicKey(userWallet),
        [ComplianceFlags.US_ACCREDITED, ComplianceFlags.EU_MICA],
        oneYear
      );
      alert("User Verified Successfully!");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white">
      <h3>Wallet: {userWallet.slice(0, 4)}...{userWallet.slice(-4)}</h3>
      <div className="flex gap-2 mt-4">
        <button 
          onClick={handleVerify}
          disabled={loading}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-500"
        >
          {loading ? "Processing..." : "Verify User"}
        </button>
        
        <button 
          onClick={() => manager?.sanctionWallet(new PublicKey(userWallet))}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
        >
          Sanction
        </button>
      </div>
    </div>
  );
};
