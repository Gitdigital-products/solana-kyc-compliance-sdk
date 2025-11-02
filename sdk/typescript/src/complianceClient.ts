import { Connection, PublicKey } from '@solana/web3.js';
import { DEFAULT_PROGRAM_ID } from './constants';

export class ComplianceClient {
  connection: Connection;
  programId: PublicKey;

  constructor(connection: Connection, programId?: string) {
    this.connection = connection;
    this.programId = new PublicKey(programId ?? DEFAULT_PROGRAM_ID);
  }

  async isVerified(registryPubkey: PublicKey, user: PublicKey): Promise<boolean> {
    const acct = await this.connection.getAccountInfo(registryPubkey);
    if (!acct) return false;
    return true; // TODO: decode and check user in registry
  }
}
