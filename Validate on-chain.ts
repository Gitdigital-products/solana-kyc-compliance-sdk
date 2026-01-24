const proof = await client.getOnChainProof(userPublicKey);

program.methods
  .accessRestrictedFeature()
  .accounts({
    user: userPublicKey,
    kycProof: proof.account,
  })
  .rpc();
