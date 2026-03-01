/**
 * Zero-Knowledge Proof module for privacy-preserving KYC
 * @package @solana-zk-kyc/sdk
 */

import type { ZKProofData, ZKProofData as ProofData } from '../types/blockchain';
import type { IdentityEntry } from '../types/identity';
import type { VerifiableCredential } from '../types/identity';

/**
 * Merkle tree implementation for ZK proofs
 */
export class MerkleTree {
  private depth: number;
  private leaves: string[];
  private tree: (string | null)[][];
  private zeroValues: string[];

  /**
   * Create a new Merkle tree
   * @param depth - Tree depth
   */
  constructor(depth: number = 20) {
    this.depth = depth;
    this.leaves = [];
    this.tree = [];
    this.zeroValues = this.generateZeroValues(depth);
    this.buildEmptyTree();
  }

  /**
   * Generate zero values for empty tree nodes
   */
  private generateZeroValues(depth: number): string[] {
    const zeroValues: string[] = [];
    let current = this.hash('0');
    zeroValues.push(current);

    for (let i = 1; i < depth; i++) {
      current = this.hash(current + current);
      zeroValues.push(current);
    }

    return zeroValues;
  }

  /**
   * Build empty tree structure
   */
  private buildEmptyTree(): void {
    this.tree = [];

    // Initialize all levels with zero values
    for (let i = 0; i <= this.depth; i++) {
      const level: (string | null)[] = [];
      const numNodes = Math.pow(2, this.depth - i);

      for (let j = 0; j < numNodes; j++) {
        level.push(this.zeroValues[i] || null);
      }

      this.tree.push(level);
    }
  }

  /**
   * Simple hash function (SHA-256 simulation)
   * In production, use a proper cryptographic hash
   */
  private hash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Insert a leaf into the tree
   * @param leaf - Leaf value to insert
   * @returns Leaf index
   */
  public insertLeaf(leaf: string): number {
    const index = this.leaves.length;
    if (index >= Math.pow(2, this.depth)) {
      throw new Error('Merkle tree is full');
    }

    this.leaves.push(leaf);
    this.updateTree(index, leaf);

    return index;
  }

  /**
   * Insert multiple leaves
   * @param leaves - Array of leaf values
   */
  public insertLeaves(leaves: string[]): void {
    for (const leaf of leaves) {
      this.insertLeaf(leaf);
    }
  }

  /**
   * Update tree after leaf insertion
   */
  private updateTree(leafIndex: number, value: string): void {
    let currentIndex = leafIndex;
    let currentValue = value;

    // Update leaf level
    this.tree[0][leafIndex] = currentValue;

    // Update parent levels
    for (let level = 1; level <= this.depth; level++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const siblingValue = this.tree[level - 1][siblingIndex] || this.zeroValues[level - 1];

      // Combine left and right values
      const left = currentIndex % 2 === 0 ? currentValue : siblingValue;
      const right = currentIndex % 2 === 0 ? siblingValue : currentValue;

      currentValue = this.hash(left + right);
      currentIndex = Math.floor(currentIndex / 2);

      this.tree[level][currentIndex] = currentValue;
    }
  }

  /**
   * Get the merkle root
   * @returns Merkle root hash
   */
  public getRoot(): string {
    return this.tree[this.depth][0] || this.zeroValues[this.depth - 1];
  }

  /**
   * Get merkle proof for a leaf
   * @param index - Leaf index
   * @returns Array of proof elements
   */
  public getProof(index: number): MerkleProof {
    if (index >= this.leaves.length) {
      throw new Error('Invalid leaf index');
    }

    const proof: string[] = [];
    let currentIndex = index;

    for (let level = 0; level < this.depth; level++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const side = currentIndex % 2 === 0 ? 'left' : 'right';
      const siblingValue = this.tree[level][siblingIndex] || this.zeroValues[level];

      proof.push(siblingValue);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: this.getRoot(),
      proof,
      leafIndex: index,
      leaf: this.leaves[index],
    };
  }

  /**
   * Verify a merkle proof
   * @param proof - Merkle proof to verify
   * @returns Whether the proof is valid
   */
  public static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leaf;

    for (let i = 0; i < proof.proof.length; i++) {
      const sibling = proof.proof[i];
      const left = i % 2 === 0 ? currentHash : sibling;
      const right = i % 2 === 0 ? sibling : currentHash;

      // Simple hash for verification
      let hash = 0;
      const combined = left + right;
      for (let j = 0; j < combined.length; j++) {
        const char = combined.charCodeAt(j);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      currentHash = Math.abs(hash).toString(16).padStart(16, '0');
    }

    return currentHash === proof.root;
  }

  /**
   * Get tree depth
   */
  public getDepth(): number {
    return this.depth;
  }

  /**
   * Get number of leaves
   */
  public getLeafCount(): number {
    return this.leaves.length;
  }

  /**
   * Get all leaves
   */
  public getLeaves(): string[] {
    return [...this.leaves];
  }
}

/**
 * Merkle proof structure
 */
export interface MerkleProof {
  /** Merkle root */
  root: string;
  /** Proof elements */
  proof: string[];
  /** Leaf index */
  leafIndex: number;
  /** Leaf value */
  leaf: string;
}

/**
 * ZK Proof generator and verifier
 */
export class ZKProofGenerator {
  private merkleTree: MerkleTree;
  private circuitParams: CircuitParams | null = null;

  /**
   * Create a new ZK proof generator
   * @param depth - Merkle tree depth
   */
  constructor(depth: number = 20) {
    this.merkleTree = new MerkleTree(depth);
  }

  /**
   * Initialize circuit parameters
   * In production, this would load compiled .wasm and .zkey files
   * @param params - Circuit parameters
   */
  public async initializeCircuit(params: CircuitParams): Promise<void> {
    this.circuitParams = params;
  }

  /**
   * Add identity to the verification tree
   * @param entry - Identity entry
   * @returns Leaf index
   */
  public addIdentity(entry: IdentityEntry): number {
    const leaf = this.hashIdentity(entry);
    return this.merkleTree.insertLeaf(leaf);
  }

  /**
   * Hash identity entry to create leaf value
   */
  private hashIdentity(entry: IdentityEntry): string {
    const data = `${entry.did}:${entry.walletAddress}:${entry.complianceLevel}:${entry.timestamp}`;
    return this.hashString(data);
  }

  /**
   * Simple string hash
   */
  private hashString(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Generate ZK proof for a credential
   * In production, this would use snarkjs with compiled circuits
   * @param credential - Verifiable credential
   * @param walletAddress - User's wallet address
   * @returns ZK proof data
   */
  public async generateProof(
    credential: VerifiableCredential,
    walletAddress: string
  ): Promise<ProofData> {
    // Find the identity entry for this wallet
    const leafIndex = this.findLeafByWallet(walletAddress);
    if (leafIndex === -1) {
      throw new Error('Wallet not found in verified identities');
    }

    const merkleProof = this.merkleTree.getProof(leafIndex);

    // Generate nullifier to prevent double-spending
    const nullifier = this.generateNullifier(walletAddress, credential.id);

    // In production, this would use actual ZK proof generation
    // with snarkjs and compiled circuits
    const proof = this.createMockProof(merkleProof, nullifier, credential);

    return proof;
  }

  /**
   * Find leaf index by wallet address
   */
  private findLeafByWallet(walletAddress: string): number {
    const leaves = this.merkleTree.getLeaves();
    for (let i = 0; i < leaves.length; i++) {
      if (leaves[i].includes(walletAddress)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Generate nullifier
   */
  private generateNullifier(walletAddress: string, credentialId: string): string {
    const data = `${walletAddress}:${credentialId}:nullifier`;
    return this.hashString(data);
  }

  /**
   * Create mock proof for demonstration
   * In production, this would generate actual ZK proofs
   */
  private createMockProof(
    merkleProof: MerkleProof,
    nullifier: string,
    credential: VerifiableCredential
  ): ProofData {
    // Extract compliance level from credential
    const complianceLevel = (credential.credentialSubject['complianceLevel'] as string) || 'BASIC';

    // Mock proof components
    // In production, these would be actual ZK proof components
    const pi_a = [merkleProof.root, nullifier];
    const pi_b = [
      [merkleProof.proof[0] || '0', merkleProof.proof[1] || '0'],
      [merkleProof.proof[2] || '0', merkleProof.proof[3] || '0'],
    ];
    const pi_c = [nullifier, merkleProof.root];

    return {
      pi_a,
      pi_b,
      pi_c,
      publicSignals: [merkleProof.root, nullifier, complianceLevel],
      merkleRoot: merkleProof.root,
      nullifier,
      complianceLevel,
    };
  }

  /**
   * Verify ZK proof
   * In production, this would use snarkjs for verification
   * @param proof - Proof data to verify
   * @returns Whether the proof is valid
   */
  public async verifyProof(proof: ProofData): Promise<boolean> {
    if (!this.circuitParams) {
      // In development/demo mode, perform basic validation
      return this.basicVerify(proof);
    }

    // In production, use snarkjs for actual verification
    // const vKey = this.circuitParams.verificationKey;
    // return await snarkjs.groth16.verify(vKey, proof.publicSignals, {
    //   pi_a: proof.pi_a,
    //   pi_b: proof.pi_b,
    //   pi_c: proof.pi_c,
    // });

    return this.basicVerify(proof);
  }

  /**
   * Basic proof verification for demo/development
   */
  private basicVerify(proof: ProofData): boolean {
    // Check proof structure
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c || !proof.publicSignals) {
      return false;
    }

    // Check required signals
    if (proof.publicSignals.length < 2) {
      return false;
    }

    // Verify merkle root is in signals
    if (!proof.publicSignals.includes(proof.merkleRoot)) {
      return false;
    }

    // Verify nullifier is in signals
    if (!proof.publicSignals.includes(proof.nullifier)) {
      return false;
    }

    return true;
  }

  /**
   * Get merkle tree root
   */
  public getMerkleRoot(): string {
    return this.merkleTree.getRoot();
  }

  /**
   * Get merkle tree instance
   */
  public getMerkleTree(): MerkleTree {
    return this.merkleTree;
  }

  /**
   * Export tree data for on-chain storage
   */
  public exportTreeData(): TreeData {
    return {
      root: this.merkleTree.getRoot(),
      depth: this.merkleTree.getDepth(),
      leafCount: this.merkleTree.getLeafCount(),
    };
  }
}

/**
 * Circuit parameters for ZK proof generation
 */
export interface CircuitParams {
  /** Circuit wasm file path */
  wasmPath: string;
  /** Proving key (zkey) path */
  zkeyPath: string;
  /** Verification key */
  verificationKey: unknown;
}

/**
 * Exported tree data
 */
export interface TreeData {
  /** Merkle root */
  root: string;
  /** Tree depth */
  depth: number;
  /** Number of leaves */
  leafCount: number;
}

/**
 * Create a new ZK proof generator
 */
export function createZKProofGenerator(depth?: number): ZKProofGenerator {
  return new ZKProofGenerator(depth);
}

/**
 * Create a merkle tree from identity entries
 */
export function createMerkleTree(entries: IdentityEntry[], depth: number = 20): MerkleTree {
  const tree = new MerkleTree(depth);

  for (const entry of entries) {
    const leaf = hashIdentityEntry(entry);
    tree.insertLeaf(leaf);
  }

  return tree;
}

/**
 * Hash identity entry
 */
function hashIdentityEntry(entry: IdentityEntry): string {
  const data = `${entry.did}:${entry.walletAddress}:${entry.complianceLevel}:${entry.timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
