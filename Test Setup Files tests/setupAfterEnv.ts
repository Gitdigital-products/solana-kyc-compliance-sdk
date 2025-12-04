import { Connection } from '@solana/web3.js';

beforeAll(async () => {
  // Verify test connection
  try {
    const version = await global.testConnection.getVersion();
    console.log(`✅ Connected to Solana ${process.env.SOLANA_NETWORK}: ${JSON.stringify(version)}`);
  } catch (error) {
    console.warn('⚠️ Could not connect to Solana RPC. Some tests may fail.');
  }
});

afterAll(async () => {
  // Cleanup
  if (global.testConnection) {
    // Close any open connections
  }
});

// Global test helpers
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

global.generateTestWallet = () => {
  const keypair = Keypair.generate();
  return {
    keypair,
    publicKey: keypair.publicKey.toString(),
    secretKey: Buffer.from(keypair.secretKey).toString('base64')
  };
};