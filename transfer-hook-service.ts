/**
 * Transfer Hook Service
 * 
 * Service layer specifically for managing Solana Token Extension transfer hooks.
 * Handles the complex ExtraAccountMetaList initialization required by Token-2022.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  ComputeBudgetProgram 
} from '@solana/web3.js';
import { 
  AnchorProvider, 
} from '@coral-xyz/anchor';
import { 
  TOKEN_2022_PROGRAM_ID, 
  getExtraAccountMetaListAddress,
  createInitializeTransferHookInstruction,
  createInitializeExtraAccountMetaListInstruction,
  getTransferHook,
 } from '@solana/spl-token';
import { ComplianceError, ErrorCode } from '../errors';

/**
 * Transfer Hook Service Configuration
 */
export interface TransferHookConfig {
  /** The KYC compliance program ID */
  programId: PublicKey;
  /** Additional compute units */
  computeUnits?: number;
  /** Priority fee in lamports */
  priorityFee?: number;
}

/**
 * Mint with Transfer Hook Result
 */
export interface MintWithHookResult {
  /** The mint address */
  mint: PublicKey;
  /** The extra account metas PDA */
  extraAccountMetaList: PublicKey;
  /** Transaction signature */
  signature: string;
}

/**
 * Extra Account Meta information
 */
interface ExtraAccountMetaInfo {
  /** Account address */
  address: PublicKey;
  /** Whether the account is a signer */
  isSigner: boolean;
  /** Whether the account is writable */
  isWritable: boolean;
}

/**
 * Transfer Hook Service
 * 
 * Provides utilities for setting up and managing Token-2022 transfer hooks
 */
export class TransferHookService {
  private connection: Connection;
  private provider: AnchorProvider;
  private programId: PublicKey;
  private computeUnits: number;
  private priorityFee: number;
  
  /**
   * Create a new TransferHookService
   * 
   * @param connection - Solana connection
   * @param provider - Anchor provider
   * @param programId - KYC compliance program ID
   */
  constructor(
    connection: Connection,
    provider: AnchorProvider,
    programId: PublicKey
  ) {
    this.connection = connection;
    this.provider = provider;
    this.programId = programId;
    this.computeUnits = 200000;
    this.priorityFee = 5000;
  }
  
  /**
   * Create a new mint with KYC transfer hook enabled
   * 
   * @param authority - Mint authority
   * @param decimals - Token decimals
   * @returns Mint address, extra account meta list PDA, and signature
   */
  async createMintWithTransferHook(
    authority: PublicKey,
    decimals: number = 9
  ): Promise<MintWithHookResult> {
    try {
      // Generate a new mint keypair
      const mintKeypair = new (await import('@solana/web3.js')).Keypair();
      const mint = mintKeypair.publicKey;
      
      // Derive the extra account metas PDA
      const extraAccountMetaList = getExtraAccountMetaListAddress(
        mint,
        this.programId
      );
      
      // Build transaction
      const transaction = new Transaction();
      
      // Add compute budget instruction
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: this.computeUnits }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.priorityFee })
      );
      
      // Create mint account
      const mintSpace = 82; // Mint account size
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.provider.wallet.publicKey,
          newAccountPubkey: mint,
          space: mintSpace,
          lamports: await this.connection.getMinimumBalanceForRentExemption(mintSpace),
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // Initialize mint
      transaction.add(
        this.createInitializeMintInstruction(mint, authority, decimals)
      );
      
      // Initialize transfer hook
      transaction.add(
        createInitializeTransferHookInstruction({
          mint,
          programId: this.programId,
          authority,
        })
      );
      
      // Initialize extra account meta list
      transaction.add(
        await this.createExtraAccountMetaListInstruction(
          mint,
          extraAccountMetaList,
          authority
        )
      );
      
      // Send transaction
      const signature = await this.provider.sendAndConfirm(
        transaction,
        [mintKeypair],
        { commitment: 'confirmed' }
      );
      
      return {
        mint,
        extraAccountMetaList,
        signature,
      };
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.MINT_CREATION_FAILED,
        `Failed to create mint with transfer hook: ${error}`,
        error
      );
    }
  }
  
  /**
   * Update the transfer hook program ID for an existing mint
   * 
   * @param mint - Mint address
   * @returns Transaction signature
   */
  async updateTransferHookProgramId(mint: PublicKey): Promise<string> {
    try {
      // Get current mint info
      const mintInfo = await this.connection.getParsedAccountInfo(mint);
      
      if (!mintInfo.value) {
        throw new Error('Mint account not found');
      }
      
      // Extract current authority
      const parsedData = mintInfo.value.data as any;
      const authority = new PublicKey(parsedData.data.authority);
      
      // Build transaction
      const transaction = new Transaction();
      
      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: this.computeUnits }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.priorityFee })
      );
      
      // Update transfer hook (requires authority signature)
      // Note: In production, you'd use the actual update instruction
      transaction.add(
        createInitializeTransferHookInstruction({
          mint,
          programId: this.programId,
          authority,
        })
      );
      
      return await this.provider.sendAndConfirm(transaction, [], {
        commitment: 'confirmed',
      });
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.HOOK_UPDATE_FAILED,
        `Failed to update transfer hook: ${error}`,
        error
      );
    }
  }
  
  /**
   * Get the transfer hook info for a mint
   * 
   * @param mint - Mint address
   * @returns Transfer hook info
   */
  async getTransferHookInfo(mint: PublicKey): Promise<{
    programId: PublicKey | null;
    authority: PublicKey | null;
  }> {
    try {
      const hook = await getTransferHook(this.connection, mint);
      
      if (!hook) {
        return {
          programId: null,
          authority: null,
        };
      }
      
      return {
        programId: hook.programId,
        authority: hook.authority,
      };
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.HOOK_FETCH_FAILED,
        `Failed to get transfer hook info: ${error}`,
        error
      );
    }
  }
  
  /**
   * Create the extra account meta list instruction
   * 
   * @param mint - Mint address
   * @param extraAccountMetaList - PDA for extra account metas
   * @param authority - Authority to sign
   */
  private async createExtraAccountMetaListInstruction(
    mint: PublicKey,
    extraAccountMetaList: PublicKey,
    authority: PublicKey
  ): Promise<TransactionInstruction> {
    // Build extra accounts list:
    // 1. KYC Compliance Program
    // 2. Compliance Registry
    // 3. Authority
    
    const extraAccounts: ExtraAccountMetaInfo[] = [
      {
        address: this.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        address: PublicKey.findProgramAddressSync(
          [Buffer.from('compliance_registry')],
          this.programId
        )[0],
        isSigner: false,
        isWritable: false,
      },
      {
        address: authority,
        isSigner: true,
        isWritable: false,
      },
    ];
    
    // For now, return a basic instruction
    // In production, you'd use the proper spl-token method
    return createInitializeExtraAccountMetaListInstruction({
      mint,
      programId: this.programId,
      extraAccounts: extraAccounts.map(acc => ({
        address: acc.address.toBuffer(),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      })),
    });
  }
  
  /**
   * Create initialize mint instruction
   * 
   * @param mint - Mint address
   * @param authority - Mint authority
   * @param decimals - Token decimals
   */
  private createInitializeMintInstruction(
    mint: PublicKey,
    authority: PublicKey,
    decimals: number
  ): TransactionInstruction {
    // Use TOKEN_2022_PROGRAM_ID for initialization
    // This would use @solana/spl-token's createInitializeMintInstruction
    // Simplified for this example
    return new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([
        0x00, // InitializeMint instruction
        decimals,
        0x01, // Option: supply
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // supply = 0
        0x02, // decimals
        0x00, // freeze authority option
      ]),
    });
  }
  
  /**
   * Verify that a mint has transfer hook enabled
   * 
   * @param mint - Mint address
   * @returns Whether transfer hook is enabled
   */
  async hasTransferHook(mint: PublicKey): Promise<boolean> {
    try {
      const hook = await getTransferHook(this.connection, mint);
      return hook !== null && hook.programId.equals(this.programId);
    } catch {
      return false;
    }
  }
  
  /**
   * Set custom compute units
   * 
   * @param units - Compute unit limit
   */
  setComputeUnits(units: number): void {
    this.computeUnits = units;
  }
  
  /**
   * Set custom priority fee
   * 
   * @param lamports - Priority fee in lamports
   */
  setPriorityFee(lamports: number): void {
    this.priorityFee = lamports;
  }
}

export default TransferHookService;
