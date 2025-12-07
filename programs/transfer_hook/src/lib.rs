use anchor_lang::prelude::*;
use merkle_proof::verify_merkle_proof; // placeholder - implement helper below

declare_id!("TrnsfrHook1111111111111111111111111111111111");

#[program]
pub mod transfer_hook {
    use super::*;

    pub fn verify_transfer(
        ctx: Context<VerifyTransfer>,
        // AML merkle proof bytes and index - client constructs and passes
        aml_proof: Vec<[u8; 32]>,
        aml_leaf: [u8; 32],
        aml_index: u64,
        max_tx_amount: u64,
        window_seconds: i64,
        jurisdiction_restriction: Option<String>, // e.g., Some("Non-US")
    ) -> Result<()> {
        // 1) Check KYC Attestation for sender (and optional receiver)
        let now = Clock::get()?.unix_timestamp;

        let sender_att = &ctx.accounts.sender_attestation;
        require!(sender_att.issuer != Pubkey::default(), HookError::MissingAttestation);
        require!(!sender_att.revoked, HookError::AttestationRevoked);
        require!(sender_att.expires_at > now, HookError::AttestationExpired);

        if ctx.accounts.receiver_attestation.is_some() {
            let receiver_att = ctx.accounts.receiver_attestation.as_ref().unwrap();
            require!(receiver_att.issuer != Pubkey::default(), HookError::MissingAttestation);
            require!(!receiver_att.revoked, HookError::AttestationRevoked);
            require!(receiver_att.expires_at > now, HookError::AttestationExpired);
        }

        // 2) Jurisdiction gating
        if let Some(req) = jurisdiction_restriction {
            let j = sender_att.jurisdiction.clone();
            require!(j == req, HookError::JurisdictionMismatch);
        }

        // 3) AML Merkle check - either sender or receiver must not be blacklisted
        // Root is stored in an on-chain account (aml_root)
        let root = ctx.accounts.aml_root.root;
        let leaf = aml_leaf;
        let proof = aml_proof;
        let index = aml_index;
        if verify_merkle_proof(&root, &leaf, &proof, index) {
            return err!(HookError::Blacklisted);
        }

        // 4) Velocity/monitoring checks
        let mut v = ctx.accounts.velocity_account.load_init()?;
        // if window expired -> reset
        if now - v.window_start > window_seconds {
            v.window_start = now;
            v.amount_in_window = 0;
            v.tx_count = 0;
        }

        let amount = ctx.accounts.transfer_info.amount;
        if v.amount_in_window.checked_add(amount).unwrap_or(u128::MAX as u64) > max_tx_amount {
            return err!(HookError::VelocityExceeded);
        }

        v.amount_in_window = v.amount_in_window.checked_add(amount).unwrap();
        v.tx_count += 1;

        // all good
        Ok(())
    }

    // admin: update AML root
    pub fn set_aml_root(ctx: Context<SetAmlRoot>, new_root: [u8; 32]) -> Result<()> {
        let aml = &mut ctx.accounts.aml_root;
        aml.root = new_root;
        aml.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyTransfer<'info> {
    #[account(signer)]
    pub authority: AccountInfo<'info>,

    /// CHECK: payer / fee payer
    pub payer: AccountInfo<'info>,

    // Attestations: expected seeds: ["attestation", wallet]
    #[account(seeds = [b"attestation", sender.key.as_ref()], bump)]
    pub sender_attestation: Account<'info, crate::attestation::Attestation>,

    /// Optional receiver attestation (if the hook enforces both sides)
    /// CHECK: use Option to allow none
    pub receiver_attestation: Option<Account<'info, crate::attestation::Attestation>>,

    /// AML root account
    #[account(mut, seeds = [b"aml_root"], bump)]
    pub aml_root: Account<'info, AmlRoot>,

    /// Velocity tracking account (PDA per wallet)
    #[account(mut, seeds = [b"velocity", sender.key.as_ref()], bump)]
    pub velocity_account: AccountLoader<'info, VelocityAccount>,

    /// Transfer info (passed as sysvar or an account w/ the amount)
    /// CHECK
    pub transfer_info: AccountInfo<'info>,

    /// CHECK: sender pubkey used for seeds
    pub sender: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAmlRoot<'info> {
    #[account(mut, signer)]
    pub admin: AccountInfo<'info>,

    #[account(mut, seeds = [b"aml_root"], bump)]
    pub aml_root: Account<'info, AmlRoot>,
}

#[account]
pub struct AmlRoot {
    pub root: [u8; 32],
    pub updated_at: i64,
}

#[account(zero_copy)]
pub struct VelocityAccount {
    pub window_start: i64,
    pub amount_in_window: u64,
    pub tx_count: u64,
}

#[error_code]
pub enum HookError {
    #[msg("Missing attestation")]
    MissingAttestation,
    #[msg("Attestation revoked")]
    AttestationRevoked,
    #[msg("Attestation expired")]
    AttestationExpired,
    #[msg("Blacklisted by AML")]
    Blacklisted,
    #[msg("Velocity exceeded")]
    VelocityExceeded,
    #[msg("Jurisdiction mismatch")]
    JurisdictionMismatch,
}

// --- A small merkle proof helper (in same crate or import properly) ---
pub mod merkle_proof {
    pub fn verify_merkle_proof(
        root: &[u8; 32],
        leaf: &[u8; 32],
        proof: &Vec<[u8; 32]>,
        mut index: u64,
    ) -> bool {
        use sha2::{Digest, Sha256};
        let mut computed = *leaf;
        for p in proof.iter() {
            let mut hasher = Sha256::new();
            if (index & 1) == 0 {
                hasher.update(&computed);
                hasher.update(p);
            } else {
                hasher.update(p);
                hasher.update(&computed);
            }
            computed = hasher.finalize().into();
            index >>= 1;
        }
        &computed == root
    }
}

// Note: reference to attestation account layout - best to import from registry crate
pub mod attestation {
    use anchor_lang::prelude::*;
    #[account]
    pub struct Attestation {
        pub issuer: Pubkey,
        pub wallet: Pubkey,
        pub issued_at: i64,
        pub expires_at: i64,
        pub jurisdiction: String,
        pub data_hash: [u8; 32],
        pub revoked: bool,
    }
}