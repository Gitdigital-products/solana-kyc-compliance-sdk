use solana_program::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub fn assert_signer(account: &AccountInfo) -> Result<(), ProgramError> {
    if !account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<(), ProgramError> {
    if account.owner != owner {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

pub fn assert_not_empty(account: &AccountInfo) -> Result<(), ProgramError> {
    if account.data_is_empty() {
        return Err(ProgramError::UninitializedAccount);
    }
    Ok(())
}

pub fn assert_initialized<T: borsh::BorshDeserialize>(account: &AccountInfo) -> Result<T, ProgramError> {
    assert_not_empty(account)?;
    T::try_from_slice(&account.data.borrow()).map_err(|_| ProgramError::InvalidAccountData)
}