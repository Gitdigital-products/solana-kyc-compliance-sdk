import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { findExtraAccountsMetaPda } from '../utils';

/**
 * Instruction builders for the KYC Compliance Transfer Hook program.
 * @namespace Instructions
 */

/**
 * Creates an instruction to initialize a compliant mint.
 * @param {InitializeCompliantMintParams} params - Mint initialization parameters
 * @param {PublicKey} programId - The Transfer Hook program ID
 * @returns {Promise<TransactionInstruction[]>} Array of instructions to execute
 */
export async function createInitializeCompliantMintInstructions(
  params: {
    payer: PublicKey;
    mint: PublicKey;
    mintAuthority: PublicKey;
    freezeAuthority: PublicKey | null;
    decimals: number;
    kycProvider: PublicKey;
  },
  programId: PublicKey
): Promise<TransactionInstruction[]> {
  const instructions: TransactionInstruction[] = [];
  
  // 1. Create mint account with Token-2022 program
  const createMintIx = SystemProgram.createAccount({
    fromPubkey: params.payer,
    newAccountPubkey: params.mint,
    space: 82, // Standard mint account size for Token-2022
    lamports: await connection.getMinimumBalanceForRentExemption(82),
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // 2. Initialize Transfer Hook extension
  const [extraAccountsPda] = await findExtraAccountsMetaPda(params.mint, programId);
  
  const initializeHookIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: extraAccountsPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: params.kycProvider, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([0]), // Instruction discriminator for initialize_mint
      Buffer.from(new Uint8Array([params.decimals])),
      Buffer.from(params.mintAuthority.toBytes()),
      Buffer.from(params.freezeAuthority ? params.freezeAuthority.toBytes() : new Uint8Array(32)),
    ]),
  });
  
  instructions.push(createMintIx, initializeHookIx);
  return instructions;
}

/**
 * Creates an instruction for compliant token transfer with hook validation.
 * @param {TransferCheckedWithHookParams} params - Transfer parameters
 * @param {PublicKey} programId - The Transfer Hook program ID
 * @returns {Promise<TransactionInstruction>} The transfer instruction
 */
export async function createTransferCheckedWithHookInstruction(
  params: {
    source: PublicKey;
    mint: PublicKey;
    destination: PublicKey;
    owner: PublicKey;
    amount: bigint;
    decimals: number;
    kycProof: PublicKey; // PDA containing KYC verification proof
  },
  programId: PublicKey
): Promise<TransactionInstruction> {
  const [extraAccountsPda] = await findExtraAccountsMetaPda(params.mint, programId);
  
  return new TransactionInstruction({
    programId,
    keys: [
      // Token accounts
      { pubkey: params.source, isSigner: false, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: params.destination, isSigner: false, isWritable: true },
      
      // Authorities
      { pubkey: params.owner, isSigner: true, isWritable: false },
      
      // Program accounts
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      
      // Compliance accounts
      { pubkey: extraAccountsPda, isSigner: false, isWritable: false },
      { pubkey: params.kycProof, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([
      Buffer.from([1]), // Instruction discriminator for transfer_checked_with_hook
      Buffer.from(new Uint8Array(new BigUint64Array([params.amount]).buffer)),
      Buffer.from(new Uint8Array([params.decimals])),
    ]),
  });
}

/**
 * Creates an instruction to register KYC verification.
 * @param {RegisterKycParams} params - KYC registration parameters
 * @param {PublicKey} programId - The Transfer Hook program ID
 * @returns {Promise<TransactionInstruction>} The KYC registration instruction
 */
export async function createRegisterKycInstruction(
  params: {
    payer: PublicKey;
    userWallet: PublicKey;
    kycProvider: PublicKey;
    providerSigner: PublicKey;
    verificationLevel: number;
    expiration: bigint;
    signature: Uint8Array;
  },
  programId: PublicKey
): Promise<TransactionInstruction> {
  const [kycProofPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('kyc-proof'),
      params.userWallet.toBuffer(),
      params.kycProvider.toBuffer(),
    ],
    programId
  );
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: kycProofPda, isSigner: false, isWritable: true },
      { pubkey: params.userWallet, isSigner: false, isWritable: false },
      { pubkey: params.kycProvider, isSigner: false, isWritable: false },
      { pubkey: params.providerSigner, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([2]), // Instruction discriminator for register_kyc
      Buffer.from(new Uint8Array([params.verificationLevel])),
      Buffer.from(new Uint8Array(new BigUint64Array([params.expiration]).buffer)),
      Buffer.from(params.signature),
    ]),
  });
}