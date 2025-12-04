use crate::risk_engine::types::*;
use crate::risk_engine::config::RiskEngineConfig;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    transaction::Transaction,
};
use solana_client::rpc_client::RpcClient;
use std::sync::Arc;
use thiserror::Error;
use tracing::{info, warn, error};

#[derive(Error, Debug)]
pub enum ActionError {
    #[error("RPC error: {0}")]
    RpcError(String),
    #[error("Transaction failed: {0}")]
    TransactionError(String),
    #[error("Signer error: {0}")]
    SignerError(String),
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

#[derive(Debug, Clone)]
pub struct ActionExecutor {
    rpc_client: Arc<RpcClient>,
    config: Arc<RiskEngineConfig>,
    risk_engine_keypair: Keypair,
    program_id: Pubkey,
}

impl ActionExecutor {
    pub fn new(
        rpc_client: Arc<RpcClient>,
        config: Arc<RiskEngineConfig>,
        risk_engine_keypair: Keypair,
    ) -> Result<Self, ActionError> {
        let program_id = Pubkey::from_str(&config.program_id)
            .map_err(|e| ActionError::ConfigError(format!("Invalid program ID: {}", e)))?;
        
        Ok(Self {
            rpc_client,
            config,
            risk_engine_keypair,
            program_id,
        })
    }
    
    pub async fn execute_action(
        &self,
        action: &PolicyAction,
        wallet_address: &str,
        attestation_key: &Pubkey,
        risk_profile: &WalletRiskProfile,
    ) -> Result<ActionExecutionResult, ActionError> {
        // Check if action requires approval
        if action.requires_approval {
            return Err(ActionError::ConfigError(
                "Action requires manual approval".to_string()
            ));
        }
        
        // Apply delay if specified
        if let Some(delay) = action.delay_minutes {
            tokio::time::sleep(tokio::time::Duration::from_secs(delay as u64 * 60)).await;
        }
        
        match &action.action_type {
            ActionType::FlagAttestation => {
                self.flag_attestation(wallet_address, attestation_key, &action.parameters, risk_profile)
                    .await
            }
            ActionType::SuspendAttestation => {
                self.suspend_attestation(wallet_address, attestation_key, &action.parameters)
                    .await
            }
            ActionType::RevokeAttestation => {
                self.revoke_attestation(wallet_address, attestation_key, &action.parameters)
                    .await
            }
            ActionType::NoAction => {
                Ok(ActionExecutionResult {
                    action_type: ActionType::NoAction,
                    success: true,
                    transaction_signature: None,
                    message: "No action required".to_string(),
                    timestamp: chrono::Utc::now(),
                })
            }
            _ => {
                // For notification actions, just log them
                info!("Notification action: {:?} for wallet {}", action.action_type, wallet_address);
                Ok(ActionExecutionResult {
                    action_type: action.action_type.clone(),
                    success: true,
                    transaction_signature: None,
                    message: "Notification sent".to_string(),
                    timestamp: chrono::Utc::now(),
                })
            }
        }
    }
    
    async fn flag_attestation(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
        parameters: &ActionParameters,
        risk_profile: &WalletRiskProfile,
    ) -> Result<ActionExecutionResult, ActionError> {
        let reason = parameters.flag_reason.clone()
            .unwrap_or_else(|| "Risk monitoring flag".to_string());
        
        // Build flag instruction
        let instruction = risk_aware_attestation::instruction::flag_attestation(
            &self.program_id,
            attestation_key,
            &self.risk_engine_keypair.pubkey(),
            risk_profile.overall_risk_score as u8,
            reason.clone(),
        ).map_err(|e| ActionError::TransactionError(e.to_string()))?;
        
        let transaction = self.build_transaction(vec![instruction]).await?;
        
        match self.send_transaction(transaction).await {
            Ok(signature) => {
                info!("Flagged attestation {} for wallet {}: {}", 
                    attestation_key, wallet_address, reason);
                
                Ok(ActionExecutionResult {
                    action_type: ActionType::FlagAttestation,
                    success: true,
                    transaction_signature: Some(signature.to_string()),
                    message: format!("Flagged: {}", reason),
                    timestamp: chrono::Utc::now(),
                })
            }
            Err(e) => {
                error!("Failed to flag attestation {}: {}", attestation_key, e);
                Err(ActionError::TransactionError(format!("Flag failed: {}", e)))
            }
        }
    }
    
    async fn suspend_attestation(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
        parameters: &ActionParameters,
    ) -> Result<ActionExecutionResult, ActionError> {
        let duration_days = parameters.suspension_duration_days
            .unwrap_or(7);
        
        // Calculate suspension end time
        let suspension_end = chrono::Utc::now() + chrono::Duration::days(duration_days as i64);
        let suspension_timestamp = suspension_end.timestamp();
        
        // Build suspend instruction
        let instruction = risk_aware_attestation::instruction::suspend_attestation(
            &self.program_id,
            attestation_key,
            &self.risk_engine_keypair.pubkey(),
            suspension_timestamp,
        ).map_err(|e| ActionError::TransactionError(e.to_string()))?;
        
        let transaction = self.build_transaction(vec![instruction]).await?;
        
        match self.send_transaction(transaction).await {
            Ok(signature) => {
                info!("Suspended attestation {} for wallet {} for {} days", 
                    attestation_key, wallet_address, duration_days);
                
                Ok(ActionExecutionResult {
                    action_type: ActionType::SuspendAttestation,
                    success: true,
                    transaction_signature: Some(signature.to_string()),
                    message: format!("Suspended for {} days", duration_days),
                    timestamp: chrono::Utc::now(),
                })
            }
            Err(e) => {
                error!("Failed to suspend attestation {}: {}", attestation_key, e);
                Err(ActionError::TransactionError(format!("Suspend failed: {}", e)))
            }
        }
    }
    
    async fn revoke_attestation(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
        parameters: &ActionParameters,
    ) -> Result<ActionExecutionResult, ActionError> {
        let reason = parameters.revocation_reason.clone()
            .unwrap_or_else(|| "Risk-based revocation".to_string());
        
        // Build revoke instruction
        let instruction = risk_aware_attestation::instruction::revoke_attestation(
            &self.program_id,
            attestation_key,
            &self.risk_engine_keypair.pubkey(),
            reason.clone(),
        ).map_err(|e| ActionError::TransactionError(e.to_string()))?;
        
        let transaction = self.build_transaction(vec![instruction]).await?;
        
        match self.send_transaction(transaction).await {
            Ok(signature) => {
                info!("Revoked attestation {} for wallet {}: {}", 
                    attestation_key, wallet_address, reason);
                
                // Log this as a critical event
                error!("CRITICAL: Attestation revoked for wallet {}: {}", 
                    wallet_address, reason);
                
                Ok(ActionExecutionResult {
                    action_type: ActionType::RevokeAttestation,
                    success: true,
                    transaction_signature: Some(signature.to_string()),
                    message: format!("Revoked: {}", reason),
                    timestamp: chrono::Utc::now(),
                })
            }
            Err(e) => {
                error!("Failed to revoke attestation {}: {}", attestation_key, e);
                Err(ActionError::TransactionError(format!("Revoke failed: {}", e)))
            }
        }
    }
    
    async fn build_transaction(
        &self,
        instructions: Vec<solana_sdk::instruction::Instruction>,
    ) -> Result<Transaction, ActionError> {
        let recent_blockhash = self.rpc_client
            .get_latest_blockhash()
            .map_err(|e| ActionError::RpcError(e.to_string()))?;
        
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&self.risk_engine_keypair.pubkey()),
            &[&self.risk_engine_keypair],
            recent_blockhash,
        );
        
        Ok(transaction)
    }
    
    async fn send_transaction(
        &self,
        transaction: Transaction,
    ) -> Result<Signature, ActionError> {
        self.rpc_client
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| ActionError::TransactionError(e.to_string()))
    }
    
    pub async fn batch_execute_actions(
        &self,
        actions: Vec<(PolicyAction, String, Pubkey, WalletRiskProfile)>,
    ) -> Vec<BatchActionResult> {
        let mut results = Vec::new();
        
        for (action, wallet_address, attestation_key, risk_profile) in actions {
            match self.execute_action(&action, &wallet_address, &attestation_key, &risk_profile).await {
                Ok(result) => {
                    results.push(BatchActionResult {
                        wallet_address: wallet_address.clone(),
                        success: true,
                        action_type: result.action_type,
                        message: result.message,
                        transaction_signature: result.transaction_signature,
                    });
                }
                Err(e) => {
                    results.push(BatchActionResult {
                        wallet_address: wallet_address.clone(),
                        success: false,
                        action_type: action.action_type.clone(),
                        message: e.to_string(),
                        transaction_signature: None,
                    });
                }
            }
            
            // Small delay between actions to avoid rate limiting
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
        
        results
    }
}

#[derive(Debug, Clone)]
pub struct ActionExecutionResult {
    pub action_type: ActionType,
    pub success: bool,
    pub transaction_signature: Option<String>,
    pub message: String,
    pub timestamp: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct BatchActionResult {
    pub wallet_address: String,
    pub success: bool,
    pub action_type: ActionType,
    pub message: String,
    pub transaction_signature: Option<String>,
}

// Risk Aware Attestation Program
pub mod risk_aware_attestation {
    use anchor_lang::prelude::*;
    
    declare_id!("RiskAwareAttestation11111111111111111111111");
    
    #[program]
    pub mod risk_aware_attestation {
        use super::*;
        
        pub fn flag_attestation(
            ctx: Context<FlagAttestation>,
            risk_score: u8,
            reason: String,
        ) -> Result<()> {
            let attestation = &mut ctx.accounts.attestation;
            
            require!(
                attestation.issuer == ctx.accounts.risk_engine.key(),
                ErrorCode::Unauthorized
            );
            
            attestation.risk_status = RiskStatus::Flagged;
            attestation.risk_score = risk_score;
            attestation.last_risk_check = Clock::get()?.unix_timestamp;
            attestation.flag_reason = Some(reason);
            
            emit!(AttestationFlagged {
                attestation: attestation.key(),
                risk_score,
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            Ok(())
        }
        
        pub fn suspend_attestation(
            ctx: Context<SuspendAttestation>,
            suspension_end_timestamp: i64,
        ) -> Result<()> {
            let attestation = &mut ctx.accounts.attestation;
            
            require!(
                attestation.issuer == ctx.accounts.risk_engine.key(),
                ErrorCode::Unauthorized
            );
            
            attestation.risk_status = RiskStatus::Suspended;
            attestation.suspension_end = Some(suspension_end_timestamp);
            attestation.last_risk_check = Clock::get()?.unix_timestamp;
            
            emit!(AttestationSuspended {
                attestation: attestation.key(),
                suspension_end: suspension_end_timestamp,
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            Ok(())
        }
        
        pub fn revoke_attestation(
            ctx: Context<RevokeAttestation>,
            reason: String,
        ) -> Result<()> {
            let attestation = &mut ctx.accounts.attestation;
            
            require!(
                attestation.issuer == ctx.accounts.risk_engine.key(),
                ErrorCode::Unauthorized
            );
            
            attestation.risk_status = RiskStatus::Revoked;
            attestation.revocation_reason = Some(reason);
            attestation.last_risk_check = Clock::get()?.unix_timestamp;
            
            emit!(AttestationRevoked {
                attestation: attestation.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            Ok(())
        }
    }
    
    #[derive(Accounts)]
    pub struct FlagAttestation<'info> {
        #[account(mut)]
        pub attestation: Account<'info, RiskAwareAttestation>,
        pub risk_engine: Signer<'info>,
    }
    
    #[derive(Accounts)]
    pub struct SuspendAttestation<'info> {
        #[account(mut)]
        pub attestation: Account<'info, RiskAwareAttestation>,
        pub risk_engine: Signer<'info>,
    }
    
    #[derive(Accounts)]
    pub struct RevokeAttestation<'info> {
        #[account(mut)]
        pub attestation: Account<'info, RiskAwareAttestation>,
        pub risk_engine: Signer<'info>,
    }
    
    #[account]
    pub struct RiskAwareAttestation {
        pub subject: Pubkey,              // Wallet being attested
        pub issuer: Pubkey,               // Risk engine authority
        pub risk_status: RiskStatus,      // Current risk status
        pub risk_score: u8,               // 0-100 risk score
        pub last_risk_check: i64,         // Last risk assessment timestamp
        pub flag_reason: Option<String>,  // Reason for flagging
        pub suspension_end: Option<i64>,  // Suspension end timestamp
        pub revocation_reason: Option<String>, // Reason for revocation
        pub metadata_uri: Option<String>, // Link to detailed risk report
    }
    
    #[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
    pub enum RiskStatus {
        Active,
        Flagged,
        Suspended,
        Revoked,
    }
    
    #[event]
    pub struct AttestationFlagged {
        pub attestation: Pubkey,
        pub risk_score: u8,
        pub timestamp: i64,
    }
    
    #[event]
    pub struct AttestationSuspended {
        pub attestation: Pubkey,
        pub suspension_end: i64,
        pub timestamp: i64,
    }
    
    #[event]
    pub struct AttestationRevoked {
        pub attestation: Pubkey,
        pub timestamp: i64,
    }
    
    #[error_code]
    pub enum ErrorCode {
        #[msg("Unauthorized action")]
        Unauthorized,
        #[msg("Attestation not found")]
        AttestationNotFound,
        #[msg("Invalid risk score")]
        InvalidRiskScore,
    }
}