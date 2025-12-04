import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export class Environment {
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // Solana Configuration
  static getSolanaNetwork(): 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    return network as any;
  }

  static getSolanaRpcUrl(): string {
    const network = this.getSolanaNetwork();
    const urls = {
      'mainnet-beta': process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'devnet': process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'testnet': process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com',
      'localnet': 'http://localhost:8899'
    };
    return urls[network];
  }

  static getSolanaWsUrl(): string {
    const network = this.getSolanaNetwork();
    const urls = {
      'mainnet-beta': process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com',
      'devnet': process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
      'testnet': process.env.SOLANA_WS_URL || 'wss://api.testnet.solana.com',
      'localnet': 'ws://localhost:8900'
    };
    return urls[network];
  }

  static getCommitment(): 'processed' | 'confirmed' | 'finalized' {
    return (process.env.SOLANA_COMMITMENT as any) || 'confirmed';
  }

  // Program IDs
  static getProgramIds(): {
    kycVerifier: string;
    kycIssuer: string;
    sas: string;
  } {
    return {
      kycVerifier: process.env.KYC_VERIFIER_PROGRAM_ID || '',
      kycIssuer: process.env.KYC_ISSUER_PROGRAM_ID || '',
      sas: process.env.SAS_PROGRAM_ID || 'SAS11111111111111111111111111111111111111'
    };
  }

  // Database
  static getDatabaseUrl(): string {
    if (this.isTest()) {
      return process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kyc_test';
    }
    return process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kyc_dev';
  }

  // Redis
  static getRedisUrl(): string {
    return process.env.REDIS_URL || 'redis://localhost:6379';
  }

  // Security
  static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }
    return secret;
  }

  static getWebhookSecret(): string {
    return process.env.WEBHOOK_SECRET || '';
  }

  // Feature Flags
  static isFeatureEnabled(feature: string): boolean {
    const envVar = `ENABLE_${feature.toUpperCase()}`;
    const value = process.env[envVar];
    return value === 'true' || value === '1';
  }

  // Validation
  static validate(): string[] {
    const errors: string[] = [];

    // Validate required environment variables
    if (!process.env.JWT_SECRET && this.isProduction()) {
      errors.push('JWT_SECRET is required in production');
    }

    if (this.isProduction() && !process.env.SOLANA_RPC_URL) {
      errors.push('SOLANA_RPC_URL is required in production');
    }

    if (this.isProduction() && !process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }

    // Validate Solana network
    const validNetworks = ['mainnet-beta', 'devnet', 'testnet', 'localnet'];
    const network = this.getSolanaNetwork();
    if (!validNetworks.includes(network)) {
      errors.push(`Invalid SOLANA_NETWORK: ${network}. Must be one of: ${validNetworks.join(', ')}`);
    }

    return errors;
  }
}

// Validate environment on startup
const errors = Environment.validate();
if (errors.length > 0) {
  console.error('Environment validation errors:');
  errors.forEach(error => console.error(`  - ${error}`));
  if (Environment.isProduction()) {
    process.exit(1);
  }
}

export default Environment;