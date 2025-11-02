use anchor_lang::prelude::*;
use anchor_spl::token_interface::spl_token_2022::ID as TOKEN_2022_PROGRAM_ID;

// Import all modules containing our program logic
pub mod state;
pub mod errors;
pub mod instructions;
pub mod processor; // Contains the transfer_hook logic

// Import the Contexts and Handlers from the instructions and processor modules
use instructions::*;
use processor::*;


declare_id!("COMPLYb623W7w5vT5Vv2k737Mh4W9p1m5sK8C47A7A7A"); // **PLACEHOLDER: REPLACE WITH YOUR PROGRAM ID**

#[program]
pub mod compliance_registry {
    use super::*;

    // --- KYC/Compliance Registry Instructions ---
    
    // Instruction to create a new ComplianceStatus PDA for a wallet.
    pub fn initialize_compliance_status(
        ctx: Context<InitializeComplianceStatus>,
        status: state::KycStatus,
        valid_until: i64,
    ) -> Result<()> {
        instructions::initialize_compliance_status(ctx, status, valid_until)
    }

    // Instruction to update an existing ComplianceStatus PDA (e.g., renewal or revocation).
    pub fn update_compliance_status(
        ctx: Context<UpdateComplianceStatus>,
        new_status: state::KycStatus,
        new_valid_until: i64,
    ) -> Result<()> {
        instructions::update_compliance_status(ctx, new_status, new_valid_until)
    }

    // --- Token Extensions (Transfer Hook) Instructions ---

    // Instruction to create the Extra Account Meta List (EAML) PDA.
    // This allows clients to easily call the compliant token transfer.
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>
    ) -> Result<()> {
        instructions::initialize_extra_account_meta_list(ctx)
    }

    // This function is required by the Transfer Hook interface (Token-2022).
    // It is called by the runtime, NOT by a typical client transaction.
    // We must expose it as part of the Anchor program for compilation.
    pub fn transfer_hook(ctx: Context<TransferHookContext>, amount: u64) -> Result<()> {
        processor::transfer_hook(ctx, amount)
    }
}

// --- Anchor CPI and Interface implementation ---

// Implement the Transfer Hook instruction from the SPL Token standard.
// This ensures that the runtime can correctly invoke the transfer_hook function.
// We must specify the program ID of the token program (Token-2022).
// Note: We use TOKEN_2022_PROGRAM_ID alias defined at the top.
#[derive(Accounts)]
pub struct TransferHook {}

impl anchor_spl::token_interface::TransferHook for TransferHook {
    const TOKEN_PROGRAM_ID: Pubkey = TOKEN_2022_PROGRAM_ID;
    
    fn transfer_hook(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> Result<()> {
        // This boilerplate is needed to correctly deserialize accounts for the hook.
        let ctx = Context::try_from_instruction(program_id, accounts)?;
        processor::transfer_hook(ctx, amount)
    }

    fn instruction(_: Pubkey, _: Pubkey, _: Pubkey, _: Pubkey, _: u64) -> Result<solana_program::instruction::Instruction> {
        // This function is generally unused for the hook itself, but required by the trait.
        Err(error!(ErrorCode::InstructionMissing))
    }
}
