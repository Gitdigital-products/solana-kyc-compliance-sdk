// Anchor program constraint for KYC-gated instructions
pub struct KycConstraint<'info> {
    pub wallet: Signer<'info>,
    pub attestation_account: Option<AccountInfo<'info>>,
    pub sas_registry: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
 
impl<'info> KycConstraint<'info> {
    pub fn validate(
        &self,
        ctx: &Context<KycConstraint<'info>>,
        required_level: KycLevel,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        
        // If attestation account is provided directly
        if let Some(attestation_account) = &self.attestation_account {
            let attestation = Attestation::try_deserialize(
                &mut &attestation_account.data.borrow()[..]
            )?;
            
            require!(
                attestation.subject == self.wallet.key(),
                ErrorCode::InvalidAttestationSubject
            );
            
            require!(
                attestation.level >= required_level,
                ErrorCode::InsufficientKycLevel
            );
            
            require!(
                !attestation.revoked,
                ErrorCode::AttestationRevoked
            );
            
            require!(
                attestation.expiration_timestamp.map_or(true, |exp| exp > current_timestamp),
                ErrorCode::AttestationExpired
            );
            
            Ok(())
        } else {
            // Check SAS registry for attestations
            let attestations = SasRegistry::get_attestations_for_subject(
                &self.sas_registry,
                &self.wallet.key(),
            )?;
            
            let has_valid = attestations.iter().any(|att| {
                att.level >= required_level &&
                !att.revoked &&
                att.expiration_timestamp.map_or(true, |exp| exp > current_timestamp)
            });
            
            require!(has_valid, ErrorCode::KycRequired);
            
            Ok(())
        }
    }
}
 
// Example Anchor instruction with KYC gating
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    
    pub kyc_check: KycConstraint<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
 
#[program]
pub mod gated_token_sale {
    use super::*;
    
    pub fn buy_tokens(
        ctx: Context<BuyToken>,
        amount: u64,
    ) -> Result<()> {
        // Validate KYC before processing
        ctx.accounts.kyc_check.validate(&ctx, KycLevel::Standard)?;
        
        // Proceed with token purchase
        // ... token transfer logic
        
        Ok(())
    }