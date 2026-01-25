client.verifyUser({
  wallet,
  checks: ["identity", "sanctions", "age"],
});
