// TypeScript/Anchor example of accredited investor-only DeFi pool
import * as anchor from '@project-serum/anchor';
import { Program, web3 } from '@project-serum/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { KycVerifier } from '@solana-kyc-sdk/consumer';
 
interface AccreditedPool {
  invest(
    investor: PublicKey,
    amount: anchor.BN,
    attestation: PublicKey
  ): Promise<web3.TransactionSignature>;
 
  withdraw(
    investor: PublicKey,
    amount: anchor.BN
  ): Promise<web3.TransactionSignature>;
 
  claimRewards(
    investor: PublicKey
  ): Promise<web3.TransactionSignature>;
}
 
class AccreditedInvestorPool implements AccreditedPool {
  private program: Program;
  private poolPubkey: PublicKey;
  private kycVerifier: KycVerifier;

  constructor(
    provider: anchor.Provider,
    programId: PublicKey,
    poolPubkey: PublicKey
  ) {
    this.program = new Program(AccreditedPoolIDL, programId, provider);
    this.poolPubkey = poolPubkey;
    this.kycVerifier = new KycVerifier({
      cluster: 'mainnet-beta',
      programId: SAS_PROGRAM_ID
    });
  }

  async invest(
    investor: PublicKey,
    amount: anchor.BN,
    attestation: PublicKey
  ): Promise<web3.TransactionSignature> {
    // Verify accreditation before allowing investment
    const isAccredited = await this.verifyAccreditation(investor, attestation);
    
    if (!isAccredited) {
      throw new Error('Investor must be accredited');
    }

    const [investorAccount] = await this.findInvestorAccount(investor);
    const [vaultAccount] = await this.findVaultAccount();

    const tx = await this.program.methods
      .invest(amount)
      .accounts({
        investor,
        investorAccount,
        vault: vaultAccount,
        attestation,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  private async verifyAccreditation(
    investor: PublicKey,
    attestation: PublicKey
  ): Promise<boolean> {
    // Method 1: Direct attestation check
    try {
      const attestationData = await this.kycVerifier.getAttestation(attestation);
      
      return attestationData.subject.equals(investor) &&
             attestationData.attestationType === 'accredited_investor' &&
             !attestationData.revoked &&
             (attestationData.expirationDate === null || 
              attestationData.expirationDate > Date.now() / 1000);
    } catch (error) {
      // Method 2: Check SAS registry
      const attestations = await this.kycVerifier.getAttestationsForWallet(investor);
      
      return attestations.some(att => 
        att.attestationType === 'accredited_investor' &&
        att.level === 'verified' &&
        !att.revoked
      );
    }
  }

  async createPool(
    creator: PublicKey,
    poolConfig: PoolConfig
  ): Promise<PublicKey> {
    const [poolAccount] = await this.findPoolAccount(creator);
    const [vaultAccount] = await this.findVaultAccount();

    const tx = await this.program.methods
      .initializePool(poolConfig)
      .accounts({
        creator,
        pool: poolAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return poolAccount;
  }

  private async findInvestorAccount(investor: PublicKey): Promise<[PublicKey, number]> {
    return web3.PublicKey.findProgramAddress(
      [Buffer.from('investor'), investor.toBuffer(), this.poolPubkey.toBuffer()],
      this.program.programId
    );
  }

  private async findVaultAccount(): Promise<[PublicKey, number]> {
    return web3.PublicKey.findProgramAddress(
      [Buffer.from('vault'), this.poolPubkey.toBuffer()],
      this.program.programId
    );
  }

  // Frontend React component for the pool
  static PoolInterface = ({ poolAddress }: { poolAddress: string }) => {
    const { publicKey, connected } = useWallet();
    const { verified: isAccredited, loading, attestations } = useKyc({
      requirements: {
        accreditationRequired: true,
        kycLevel: 'plus',
        countryWhitelist: ['US'] // US accreditation rules
      }
    });

    const [investmentAmount, setInvestmentAmount] = useState('');
    const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);

    useEffect(() => {
      if (connected && publicKey) {
        fetchPoolInfo();
      }
    }, [connected, publicKey]);

    if (!connected) {
      return <WalletMultiButton />;
    }

    if (loading) {
      return <div>Verifying accreditation status...</div>;
    }

    if (!isAccredited) {
      return (
        <div className="accredited-gate">
          <h2>Accredited Investors Only</h2>
          <p>This investment opportunity is only available to accredited investors.</p>
          <div className="verification-options">
            <h3>Verify Your Accreditation:</h3>
            <button onClick={() => window.open('/verify/accredited', '_blank')}>
              Verify with Circle
            </button>
            <button onClick={() => window.open('/verify/jumio-accredited', '_blank')}>
              Verify with Jumio
            </button>
          </div>
          <div className="accreditation-info">
            <p>To qualify as an accredited investor in the US, you must meet one of these criteria:</p>
            <ul>
              <li>Income exceeding $200,000 ($300,000 joint) for last two years</li>
              <li>Net worth over $1 million (excluding primary residence)</li>
              <li>Hold certain professional certifications</li>
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="pool-interface">
        <div className="pool-header">
          <h2>Private Investment Pool</h2>
          <div className="investor-status verified">
            <span>✓ Accredited Investor Verified</span>
            <small>Verified via {attestations[0]?.provider}</small>
          </div>
        </div>
        
        <div className="pool-stats">
          <div className="stat">
            <label>Total Pool Size</label>
            <div className="value">{poolInfo?.totalValue.toLocaleString()} USDC</div>
          </div>
          <div className="stat">
            <label>Your Investment</label>
            <div className="value">{poolInfo?.yourInvestment.toLocaleString()} USDC</div>
          </div>
          <div className="stat">
            <label>Estimated APY</label>
            <div className="value">{poolInfo?.apy}%</div>
          </div>
        </div>

        <div className="investment-form">
          <h3>Additional Investment</h3>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            placeholder="Amount in USDC"
          />
          <button onClick={handleInvest} disabled={!investmentAmount}>
            Invest
          </button>
          <p className="min-investment">Minimum investment: 10,000 USDC</p>
        </div>

        <div className="risk-disclosure">
          <h4>Risk Disclosure</h4>
          <p>This private investment is only suitable for accredited investors who can bear the risk of complete loss.</p>
        </div>
      </div>
    );
  };