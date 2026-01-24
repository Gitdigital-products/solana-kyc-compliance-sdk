const result = await client.verifyUser({
  wallet: userPublicKey,
  jurisdiction: "US",
  checks: ["identity", "sanctions", "age"],
});
