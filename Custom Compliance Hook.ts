import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IdentityManager, ComplianceFlags } from '@gitdigital/compliance-sdk';

export function useComplianceManager() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const manager = useMemo(() => {
    if (!wallet.publicKey) return null;
    
    // Setup Anchor Provider
    const provider = new AnchorProvider(connection, wallet as any, {});
    // Assuming your IDL is exported from the SDK
    const program = new Program(IDL, PROGRAM_ID, provider);
    
    return new IdentityManager(program, wallet as any);
  }, [connection, wallet]);

  return manager;
}
