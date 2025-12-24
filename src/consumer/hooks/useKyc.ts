// React hook for frontend KYC checks
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect, useCallback } from 'react';
import { AttestationVerifier, Cluster, AccessRequirements } from '@solana-kyc-sdk/consumer';
 
interface UseKycOptions {
  cluster?: Cluster;
  autoCheck?: boolean;
  requirements?: AccessRequirements;
}
 
interface KycStatus {
  verified: boolean;
  loading: boolean;
  attestations: AttestationDetails[];
  error?: string;
  checkAccess: () => Promise<boolean>;
}
 
export function useKyc(options: UseKycOptions = {}): KycStatus {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [status, setStatus] = useState<KycStatus>({
    verified: false,
    loading: false,
    attestations: [],
    checkAccess: async () => false
  });

  const verifier = new AttestationVerifier(
    options.cluster || (connection.rpcEndpoint.includes('devnet') ? Cluster.Devnet : Cluster.Mainnet)
  );

  const checkAccess = useCallback(async (): Promise<boolean> => {
    if (!publicKey) return false;

    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await verifier.verifyWalletAccess(
        publicKey,
        options.requirements || {}
      );

      setStatus(prev => ({
        ...prev,
        verified: result.allowed,
        attestations: result.attestationUsed ? [result.attestationUsed] : [],
        loading: false
      }));

      return result.allowed;
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
      return false;
    }
  }, [publicKey, options.requirements]);

  useEffect(() => {
    if (options.autoCheck !== false && publicKey && connected) {
      checkAccess();
    }
  }, [publicKey, connected, checkAccess, options.autoCheck]);

  return {
    ...status,
    checkAccess
  };
}
 
// Higher-Order Component for KYC-gated components
export function withKyc<P extends object>(
  Component: React.ComponentType<P>,
  requirements: AccessRequirements,
  FallbackComponent?: React.ComponentType
) {
  return function WithKycComponent(props: P) {
    const { verified, loading } = useKyc({ requirements, autoCheck: true });

    if (loading) {
      return <div className="kyc-loading">Verifying KYC status...</div>;
    }

    if (!verified) {
      if (FallbackComponent) {
        return <FallbackComponent {...props} />;
      }
      return (
        <div className="kyc-required">
          <h3>KYC Verification Required</h3>
          <p>You need to complete KYC verification to access this content.</p>
          <button onClick={() => window.open('/kyc-verification', '_blank')}>
            Complete KYC
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };