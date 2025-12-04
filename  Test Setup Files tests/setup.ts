import dotenv from 'dotenv';
import { Connection, Keypair } from '@solana/web3.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for tests
process.env.SOLANA_NETWORK = 'devnet';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.SOLANA_COMMITMENT = 'confirmed';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test fixtures
global.testKeypair = Keypair.generate();
global.testWalletAddress = global.testKeypair.publicKey.toString();

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test connection
global.testConnection = new Connection(
  process.env.SOLANA_RPC_URL!,
  'confirmed'
);

// Jest timeout
jest.setTimeout(30000);

export {};