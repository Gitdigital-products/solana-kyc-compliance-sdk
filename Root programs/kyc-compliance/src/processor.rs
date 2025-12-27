cat > programs/kyc-compliance/src/processor.rs << 'EOF'
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{clock::Clock, rent::Rent, Sysvar},
};

use crate::{
    error::ComplianceError,
    instruction::ComplianceInstruction,
    state::*,
};

pub struct Processor;

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = ComplianceInstruction::unpack(instruction_data)?;
            
        match instruction {
            ComplianceInstruction::InitializeRegistry => {
                Self::process_initialize_registry(program_id, accounts)
            }
            ComplianceInstruction::InitializePolicy => {
                Self::process_initialize_policy(program_id, accounts)
            }
            ComplianceInstruction::RegisterInvestor { investor_data } => {
                Self::process_register_investor(program_id, accounts, investor_data)
            }
            ComplianceInstruction::RevokeInvestor => {
                Self::process_revoke_investor(program_id, accounts)
            }
            ComplianceInstruction::UpdatePolicy { policy } => {
                Self::process_update_policy(program_id, accounts, policy)
            }
            ComplianceInstruction::SetAdmin => {
                Self::process_set_admin(program_id, accounts)
            }
            ComplianceInstruction::FreezeWallet => {
                Self::process_freeze_wallet(program_id, accounts, true)
            }
            ComplianceInstruction::UnfreezeWallet => {
                Self::process_freeze_wallet(program_id, accounts, false)
            }
            ComplianceInstruction::ValidateTransfer { amount } => {
                Self::process_validate_transfer(program_id, accounts, amount)
            }
        }
    }
    
    /// Initialize compliance registry
    fn process_initialize_registry(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        let admin = next_account_info(accounts_iter)?;
        let registry_account = next_account_info(accounts_iter)?;
        let system_program = next_account_info(accounts_iter)?;
        
        if !admin.is_signer {
            return Err(ComplianceError::Unauthorized.into());
        }
        
        let (registry_pda, registry_bump) = Pubkey::find_program_address(
            &[b"compliance-registry"],
            program_id,
        );
        
        if registry_pda != *registry_account.key {
            return Err(ProgramError::InvalidArgument);
        }
        
        if !registry_account.data_is_empty() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        
        let rent = Rent::get()?;
        let space = ComplianceRegistry::LEN;
        let lamports = rent.minimum_balance(space);
        
        invoke_signed(
            &system_instruction::create_account(
                admin.key,
                registry_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[admin.clone(), registry_account.clone(), system_program.clone()],
            &[&[b"compliance-registry", &[registry_bump]]],
        )?;
        
        let registry = ComplianceRegistry::new(*admin.key, registry_bump);
        registry.serialize(&mut &mut registry_account.data.borrow_mut()[..])?;
        
        msg!("Compliance registry initialized");
        Ok(())
    }
    
    /// Initialize policy config
    fn process_initialize_policy(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        let admin = next_account_info(accounts_iter)?;
        let policy_account = next_account_info(accounts_iter)?;
        let system_program = next_account_info(accounts_iter)?;
        
        if !admin.is_signer {
            return Err(ComplianceError::Unauthorized.into());
        }
        
        let (policy_pda, policy_bump) = Pubkey::find_program_address(
            &[b"policy-config"],
            program_id,
        );
        
        if policy_pda != *policy_account.key {
            return Err(ProgramError::InvalidArgument);
        }
        
        if !policy_account.data_is_empty() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        
        let rent = Rent::get()?;
        let space = PolicyConfig::LEN;
        let lamports = rent.minimum_balance(space);
        
        invoke_signed(
            &system_instruction::create_account(
                admin.key,
                policy_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[admin.clone(), policy_account.clone(), system_program.clone()],
            &[&[b"policy-config", &[policy_bump]]],
        )?;
        
        // Permanent delegate is the admin initially
        let policy_config = PolicyConfig::new(*admin.key, policy_bump, *admin.key);
        policy_config.serialize(&mut &mut policy_account.data.borrow_mut()[..])?;
        
        msg!("Policy config initialized");
        Ok(())
    }
    
    /// Register a new investor
    fn process_register_investor(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        investor_data: InvestorData,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        let payer = next_account_info(accounts_iter)?;
        let registry_account = next_account_info(accounts_iter)?;
        let investor_record_account = next_account_info(accounts_iter)?;
        let investor_wallet = next_account_info(accounts_iter)?;
        let system_program = next_account_info(accounts_iter)?;
        
        if !payer.is_signer {
            return Err(ComplianceError::Unauthorized.into());
        }
        
        // Validate country code length
        if investor_data.country_code.len() != 2 {
            return Err(ComplianceError::InvalidCountryCode.into());
        }
        
        let registry = ComplianceRegistry::try_from_slice(&registry_account.data.borrow())?;
        
        // Load policy to check requirements
        let (policy_pda, _) = Pubkey::find_program_address(
            &[b"policy-config"],
            program_id,
        );
        
        // Find investor record PDA
        let (investor_pda, investor_bump) = Pubkey::find_program_address(
            &[b"investor-record", investor_wallet.key.as_ref()],
            program_id,
        );
        
        if investor_pda != *investor_record_account.key {
            return Err(ProgramError::InvalidArgument);
        }
        
        if !investor_record_account.data_is_empty() {
            return Err(ComplianceError::AlreadyRegistered.into());
        }
        
        let clock = Clock::get()?;
        let rent = Rent::get()?;
        let space = InvestorRecord::LEN;
        let lamports = rent.minimum_balance(space);
        
        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                investor_record_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[payer.clone(), investor_record_account.clone(), system_program.clone()],
            &[&[b"investor-record", investor_wallet.key.as_ref(), &[investor_bump]]],
        )?;
        
        let investor_record = InvestorRecord::new(
            *investor_wallet.key,
            investor_bump,
            investor_data.kyc_level,
            investor_data.country_code,
            investor_data.investor_type,
            investor_data.accreditation_status,
            clock.unix_timestamp,
        );
        
        investor_record.serialize(&mut &mut investor_record_account.data.borrow_mut()[..])?;
        
        // Update registry
        let mut registry = ComplianceRegistry::try_from_slice(&registry_account.data.borrow())?;
        registry.investor_count += 1;
        registry.total_registered += 1;
        registry.serialize(&mut &mut registry_account.data.borrow_mut()[..])?;
        
        msg!("Investor registered: {}", investor_wallet.key);
        Ok(())
    }
    
    /// Revoke investor status
    fn process_revoke_investor(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        