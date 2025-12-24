import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-base';
 
export class SolanaProvider {
  private connection: Connection;
  private wallet: WalletContextState | null = null;

  constructor(network: 'mainnet-beta' | 'devnet' | 'testnet' = 'devnet', endpoint?: string) {
    const rpcUrl = endpoint || clusterApiUrl(network);
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  setWallet(wallet: WalletContextState) {
    this.wallet = wallet;
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getWalletPublicKey(): Promise<PublicKey | null> {
    return this.wallet?.publicKey || null;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array | null> {
    if (!this.wallet?.signMessage) {
      throw new Error('Wallet does not support message signing');
    }
    return await this.wallet.signMessage(message);
  }