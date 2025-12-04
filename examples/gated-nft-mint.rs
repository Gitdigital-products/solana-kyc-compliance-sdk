// Complete example of a KYC-gated NFT mint program
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use anchor_spl::metadata::{Metadata, MetadataAccount};
use mpl_token_metadata::state::{Metadata as TokenMetadata, TokenStandard};
 
declare_id!("GATEDNFTM1NT1111111111111111111111111111111");
 
#[program]
pub mod gated_nft_mint {
    use super::*;
    
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        collection_data: CollectionData,
    ) -> Result<()> {
        // Store collection metadata with KYC requirements
        let collection = &mut ctx.accounts.collection;
        collection.authority = ctx.accounts.authority.key();
        collection.mint = ctx.accounts.mint.key();
        collection.kyc_requirements = collection_data.kyc_requirements;
        collection.max_supply = collection_data.max_supply;
        collection.minted_count = 0;
        collection.is_active = true;
        
        Ok(())
    }
    
    pub fn mint_nft(
        ctx: Context<MintNft>,
        metadata_uri: String,
    ) -> Result<()> {
        let collection = &ctx.accounts.collection;
        
        // Check collection supply
        require!(
            collection.minted_count < collection.max_supply,
            ErrorCode::CollectionSoldOut
        );
        
        require!(collection.is_active, ErrorCode::CollectionInactive);
        
        // Verify KYC requirements
        let kyc_result = verify_kyc_for_mint(
            &ctx.accounts.minter,
            &ctx.accounts.attestation,
            &collection.kyc_requirements,
            &ctx.accounts.clock,
        )?;
        
        require!(kyc_result.allowed, ErrorCode::KycRequired);
        
        // Create metadata
        let metadata_accounts = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.clone(),
            metadata_accounts,
        );
        
        // Create metadata with collection info
        Metadata::create(
            cpi_ctx,
            metadata_uri,
            collection.mint.key(),
            ctx.accounts.mint_authority.key(),
            0,
            true,
            true,
        )?;
        
        // Mint token
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            1, // One NFT
        )?;
        
        // Update collection count
        ctx.accounts.collection.minted_count += 1;
        
        // Emit event
        emit!(NftMinted {
            minter: ctx.accounts.minter.key(),
            mint: ctx.accounts.mint.key(),
            collection: collection.key(),
            timestamp: ctx.accounts.clock.unix_timestamp,
            kyc_provider: kyc_result.provider,
        });
        
        Ok(())
    }
    
    fn verify_kyc_for_mint(
        minter: &AccountInfo,
        attestation: &AccountInfo,
        requirements: &KycRequirements,
        clock: &Sysvar<Clock>,
    ) -> Result<KycVerificationResult> {
        // Deserialize attestation
        let attestation_data = Attestation::try_deserialize(
            &mut &attestation.data.borrow()[..]
        )?;
        
        // Verify attestation belongs to minter
        require!(
            attestation_data.subject == minter.key(),
            ErrorCode::InvalidAttestation
        );
        
        // Check KYC level
        require!(
            attestation_data.level >= requirements.min_level,
            ErrorCode::InsufficientKycLevel
        );
        
        // Check country restrictions
        if let Some(allowed_countries) = &requirements.allowed_countries {
            let country = attestation_data.metadata.get("country")
                .ok_or(ErrorCode::CountryInfoMissing)?;
            require!(
                allowed_countries.contains(country),
                ErrorCode::CountryNotAllowed
            );
        }
        
        // Check expiration
        require!(
            !attestation_data.revoked,
            ErrorCode::AttestationRevoked
        );
        
        require!(
            attestation_data.expiration_timestamp
                .map_or(true, |exp| exp > clock.unix_timestamp),
            ErrorCode::AttestationExpired
        );
        
        Ok(KycVerificationResult {
            allowed: true,
            provider: attestation_data.provider,
            level: attestation_data.level,
            country: attestation_data.metadata.get("country").cloned(),
        })
    }
}
 
#[derive(Accounts)]
#[instruction(collection_data: CollectionData)]
pub struct InitializeCollection<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = Collection::LEN,
        seeds = [b"collection", mint.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,
    
    pub mint: Account<'info, token::Mint>,
    
    pub system_program: Program<'info, System>,
}
 
#[derive(Accounts)]
pub struct MintNft<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = minter
    )]
    pub destination: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"collection", collection.mint.as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,
    
    // KYC attestation account
    pub attestation: AccountInfo<'info>,
    
    // Token minting accounts
    #[account(mut)]
    pub mint: Account<'info, token::Mint>,
    
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    // Programs
    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}
 
#[account]
pub struct Collection {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub kyc_requirements: KycRequirements,
    pub max_supply: u64,
    pub minted_count: u64,
    pub is_active: bool,
}
 
impl Collection {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        KycRequirements::LEN +
        8 +  // max_supply
        8 +  // minted_count
        1;   // is_active
}
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionData {
    pub kyc_requirements: KycRequirements,
    pub max_supply: u64,
}
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct KycRequirements {
    pub min_level: KycLevel,
    pub allowed_countries: Option<Vec<String>>,
    pub require_accreditation: bool,
    pub max_age_days: Option<u32>,
}
 
impl KycRequirements {
    pub const LEN: usize = 1 + // min_level
        1 + 32 + 4 + 32 + // allowed_countries (Option<Vec>)
        1 + // require_accreditation
        1 + 4; // max_age_days
}
 
#[event]
pub struct NftMinted {
    pub minter: Pubkey,
    pub mint: Pubkey,
    pub collection: Pubkey,
    pub timestamp: i64,
    pub kyc_provider: ProviderType,