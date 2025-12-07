/**
 * amlMerkle.ts
 * - utilities to build Merkle root/proofs off-chain (server side)
 * - uses merkletreejs + keccak256
 */
 
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
 
export function buildAmlTree(addresses: string[]) {
  const leaves = addresses.map((a) => keccak256(a));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
}
 
export function getProofFor(address: string, tree: MerkleTree) {
  const leaf = keccak256(address);
  const proof = tree.getProof(leaf).map((p) => p.data);
  const root = tree.getRoot();
  const index = tree.getIndex(leaf);
  return { proof, root, leaf, index };