/**
 * Deploy Programs Script
 * 
 * Automated script for deploying and initializing the Anchor programs
 * to Solana clusters (localnet, devnet, mainnet).
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as yaml from 'yaml';

/**
 * Deployment Configuration
 */
interface DeployConfig {
  cluster: 'localnet' | 'devnet' | 'testnet' | 'mainnet';
  rpcUrl: string;
  wsUrl: string;
  keypairPath: string;
  programs: ProgramConfig[];
}

/**
 * Program Configuration
 */
interface ProgramConfig {
  name: string;
  programId: string;
  deployPath?: string;
  idlPath?: string;
  skipUpgrade?: boolean;
}

/**
 * Deployment Result
 */
interface DeployResult {
  programId: string;
  signature: string;
  cluster: string;
}

/**
 * Default configuration for each cluster
 */
const CLUSTER_CONFIGS: Record<string, { rpcUrl: string; wsUrl: string }> = {
  localnet: {
    rpcUrl: 'http://127.0.0.1:8899',
    wsUrl: 'ws://127.0.0.1:8900',
  },
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com',
  },
  testnet: {
    rpcUrl: 'https://api.testnet.solana.com',
    wsUrl: 'wss://api.testnet.solana.com',
  },
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    wsUrl: 'wss://api.mainnet-beta.solana.com',
  },
};

/**
 * Default program IDs
 */
const DEFAULT_PROGRAMS: ProgramConfig[] = [
  {
    name: 'kyc-compliance',
    programId: 'KYCCo7vM2uLkGzqH6XqKJp1TJK5JjK9jW8vY9xQz1P2',
  },
  {
    name: 'compliance_registry',
    programId: 'REG9xqH3qH6XqKJp1TJK5LjK9jW8vY9xQz1P3',
  },
];

/**
 * Load configuration from file or environment
 */
function loadConfig(cluster?: string): DeployConfig {
  // Get cluster from args or environment
  const targetCluster = (cluster || process.env.SOLANA_CLUSTER || 'localnet') as keyof typeof CLUSTER_CONFIGS;
  
  // Load keypair path
  const keypairPath = process.env.KEYPAIR_PATH || 
    process.env.HOME + '/.config/solana/id.json';
  
  // Check for custom config file
  const configPath = process.env.DEPLOY_CONFIG || './deploy-config.yaml';
  
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const fileConfig = yaml.parse(configFile);
    return {
      ...fileConfig,
      cluster: targetCluster,
      ...CLUSTER_CONFIGS[targetCluster],
    };
  }
  
  // Use default configuration
  return {
    cluster: targetCluster,
    ...CLUSTER_CONFIGS[targetCluster],
    keypairPath,
    programs: DEFAULT_PROGRAMS,
  };
}

/**
 * Load keypair from file
 */
function loadKeypair(keypairPath: string): Keypair {
  const keypairData = fs.readFileSync(keypairPath, 'utf8');
  const keypairArray = JSON.parse(keypairData);
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
}

/**
 * Create provider
 */
function createProvider(config: DeployConfig, keypair: Keypair): AnchorProvider {
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const wallet = new Wallet(keypair);
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    skipPreflight: false,
  });
}

/**
 * Deploy a single program
 */
async function deployProgram(
  config: DeployConfig,
  provider: AnchorProvider,
  program: ProgramConfig
): Promise<DeployResult> {
  console.log(`\nDeploying ${program.name}...`);
  
  const programId = new PublicKey(program.programId);
  const deployPath = program.deployPath || `./target/deploy/${program.name}.so`;
  
  // Check if program exists
  if (!fs.existsSync(deployPath)) {
    console.log(`Warning: Program binary not found at ${deployPath}`);
    console.log('Attempting to build first...');
    
    // Try to build
    const { execSync } = require('child_process');
    try {
      execSync('anchor build', { stdio: 'inherit' });
    } catch {
      console.error('Build failed. Please build manually.');
      throw new Error(`Program binary not found: ${deployPath}`);
    }
  }
  
  // Check if program is already deployed
  try {
    const programInfo = await provider.connection.getParsedAccountInfo(programId);
    if (programInfo.value) {
      console.log(`Program ${program.name} already deployed at ${program.programId}`);
      return {
        programId: program.programId,
        signature: 'Already deployed',
        cluster: config.cluster,
      };
    }
  } catch {
    // Program not deployed, continue
  }
  
  // Deploy program using solana CLI
  const { execSync } = require('child_process');
  
  try {
    const deployCmd = [
      'solana',
      'program',
      'deploy',
      deployPath,
      '--program-id', program.programId,
      '--url', config.rpcUrl,
      '--keypair', config.keypairPath,
      '--skip-upgrade', program.skipUpgrade ? 'true' : 'false',
    ].join(' ');
    
    console.log(`Running: ${deployCmd}`);
    const output = execSync(deployCmd, { encoding: 'utf8' });
    
    // Extract signature from output
    const signatureMatch = output.match(/Signature: ([a-zA-Z0-9]+)/);
    const signature = signatureMatch ? signatureMatch[1] : 'Deployment successful';
    
    console.log(`Deployed ${program.name} successfully!`);
    
    return {
      programId: program.programId,
      signature,
      cluster: config.cluster,
    };
  } catch (error: any) {
    console.error(`Failed to deploy ${program.name}:`, error.message);
    throw error;
  }
}

/**
 * Initialize program state
 */
async function initializeProgram(
  config: DeployConfig,
  provider: AnchorProvider,
  programName: string,
  programId: string
): Promise<void> {
  console.log(`\nInitializing ${programName}...`);
  
  // This would typically call the program's initialize instruction
  // For now, just log
  console.log(`Would initialize ${programName} at ${programId}`);
  
  // Example of what this would do:
  // const program = new Program<IDL>(idl, programId, provider);
  // await program.methods.initialize().accounts({...}).rpc();
}

/**
 * Save deployment info
 */
function saveDeploymentInfo(results: DeployResult[], config: DeployConfig): void {
  const infoPath = './deployment-info.json';
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    cluster: config.cluster,
    results,
  };
  
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${infoPath}`);
}

/**
 * Main deployment function
 */
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Solana KYC Compliance SDK - Program Deployment');
  console.log('='.repeat(50));
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let cluster: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cluster' || args[i] === '-c') {
      cluster = args[i + 1];
    }
  }
  
  // Load configuration
  const config = loadConfig(cluster);
  console.log(`\nTarget cluster: ${config.cluster}`);
  console.log(`RPC URL: ${config.rpcUrl}`);
  
  // Check if keypair exists
  if (!fs.existsSync(config.keypairPath)) {
    console.error(`\nError: Keypair not found at ${config.keypairPath}`);
    console.log('Please create a keypair or set KEYPAIR_PATH environment variable');
    process.exit(1);
  }
  
  // Load keypair
  console.log('\nLoading keypair...');
  const keypair = loadKeypair(config.keypairPath);
  console.log(`Wallet: ${keypair.publicKey.toString()}`);
  
  // Create provider
  const provider = createProvider(config, keypair);
  
  // Check balance
  const balance = await provider.connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  
  if (balance < 1e9) {
    console.warn('Warning: Low balance. You may need more SOL for deployment.');
  }
  
  // Deploy programs
  const results: DeployResult[] = [];
  
  for (const program of config.programs) {
    try {
      const result = await deployProgram(config, provider, program);
      results.push(result);
      
      // Initialize program
      await initializeProgram(config, provider, program.name, program.programId);
    } catch (error) {
      console.error(`Error deploying ${program.name}:`, error);
      process.exit(1);
    }
  }
  
  // Save deployment info
  saveDeploymentInfo(results, config);
  
  console.log('\n' + '='.repeat(50));
  console.log('Deployment completed successfully!');
  console.log('='.repeat(50));
}

// Run main function
main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
