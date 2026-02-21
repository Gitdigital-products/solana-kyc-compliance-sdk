🛡️ Technical FAQ: GitDigital Compliance SDK
Q: How does the Transfer Hook impact transaction gas costs?
A: Our SDK is optimized for the Firedancer era (Solana 2026). By using Jurisdictional Bitmasks (u64), we reduce complex compliance checks to a single bitwise AND operation.
Performance: Adds <2,000 Compute Units (CUs) per transfer.
Cost: Even with high-priority fees, the overhead remains below $0.001 per transaction.
Q: Can a user bypass the KYC check by calling the program directly?
A: No. We implement a CPI Guard and a mandatory assert_is_transferring check. The program only executes when invoked by the Token-2022 runtime during an actual transfer. Direct calls to the execute instruction without a valid transfer context will result in an immediate ProgramError.
Q: What happens if the Risk Oracle (AI Shield) goes offline?
A: We utilize a Fail-Safe Policy that you can configure:
Optimistic Mode: Transfers continue, and suspicious activity is queued for retrospective sanctioning.
Strict Mode: Transfers are paused until the oracle heartbeat returns (recommended for high-value RWAs).
Q: Is the KYC data private?
A: Yes. We do not store PII (Personally Identifiable Information) on-chain. The SDK stores a Zero-Knowledge Hash or a bitmask that points to a verified status. Even if the ledger is public, a user's real-world identity remains encrypted and off-chain with your chosen provider (e.g., Sumsub/Persona).
Q: Does this work with Permissionless DEXs (Jupiter/Raydium)?
A: Yes. Because it uses the SPL Token-2022 Transfer Hook extension, any DEX that supports Token-2022 will automatically trigger our compliance logic. If the buyer is not KYC’d, the DEX transaction will simply fail at the simulation stage.