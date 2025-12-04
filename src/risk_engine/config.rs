use serde::Deserialize;
use std::env;
use std::sync::Arc;
use thiserror::Error;
 
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnvVar(String),
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}
 
#[derive(Debug, Clone)]
pub struct RiskEngineConfig {
    // Provider configurations
    pub trm: TrmConfig,
    pub chainalysis: ChainalysisConfig,
    pub crystal: CrystalConfig,
    
    // Scoring thresholds
    pub thresholds: RiskThresholds,
    
    // Monitoring settings
    pub monitoring: MonitoringConfig,
    
    // On-chain settings
    pub rpc_url: String,
    pub program_id: String,
    pub risk_engine_wallet: String,
}
 
#[derive(Debug, Clone, Deserialize)]
pub struct TrmConfig {
    pub api_key: String,
    pub api_url: String,
    pub timeout_secs: u64,
    pub enabled: bool,
}
 
#[derive(Debug, Clone, Deserialize)]
pub struct ChainalysisConfig {
    pub api_key: String,
    pub api_url: String,
    pub kyt_enabled: bool,
    pub sanctions_enabled: bool,
}
 
#[derive(Debug, Clone, Deserialize)]
pub struct CrystalConfig {
    pub api_key: String,
    pub api_url: String,
    pub enable_cross_chain: bool,
}
 
#[derive(Debug, Clone, Deserialize)]
pub struct RiskThresholds {
    pub critical: f64,    // >= 90
    pub high: f64,        // >= 75
    pub medium: f64,      // >= 50
    pub low: f64,         // >= 25
}
 
#[derive(Debug, Clone, Deserialize)]
pub struct MonitoringConfig {
    pub poll_interval_minutes: u64,
    pub batch_size: usize,
    pub retry_attempts: u32,
    pub cache_ttl_minutes: u64,
}
 
impl RiskEngineConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        dotenv::dotenv().ok();
        
        Ok(RiskEngineConfig {
            trm: TrmConfig {
                api_key: env::var("TRM_API_KEY")
                    .map_err(|_| ConfigError::MissingEnvVar("TRM_API_KEY".to_string()))?,
                api_url: env::var("TRM_API_URL")
                    .unwrap_or_else(|_| "https://api.trmlabs.com/public/v1".to_string()),
                timeout_secs: env::var("TRM_TIMEOUT")
                    .unwrap_or_else(|_| "30".to_string())
                    .parse()
                    .unwrap_or(30),
                enabled: env::var("TRM_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .unwrap_or(true),
            },
            
            chainalysis: ChainalysisConfig {
                api_key: env::var("CHAINALYSIS_API_KEY")
                    .map_err(|_| ConfigError::MissingEnvVar("CHAINALYSIS_API_KEY".to_string()))?,
                api_url: env::var("CHAINALYSIS_API_URL")
                    .unwrap_or_else(|_| "https://api.chainalysis.com".to_string()),
                kyt_enabled: env::var("CHAINALYSIS_KYT_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .unwrap_or(true),
                sanctions_enabled: env::var("CHAINALYSIS_SANCTIONS_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .unwrap_or(true),
            },
            
            crystal: CrystalConfig {
                api_key: env::var("CRYSTAL_API_KEY").ok(),
                api_url: env::var("CRYSTAL_API_URL")
                    .unwrap_or_else(|_| "https://api.crystalblockchain.com".to_string()),
                enable_cross_chain: env::var("CRYSTAL_CROSS_CHAIN")
                    .unwrap_or_else(|_| "false".to_string())
                    .parse()
                    .unwrap_or(false),
            },
            
            thresholds: RiskThresholds {
                critical: env::var("THRESHOLD_CRITICAL")
                    .unwrap_or_else(|_| "90.0".to_string())
                    .parse()
                    .unwrap_or(90.0),
                high: env::var("THRESHOLD_HIGH")
                    .unwrap_or_else(|_| "75.0".to_string())
                    .parse()
                    .unwrap_or(75.0),
                medium: env::var("THRESHOLD_MEDIUM")
                    .unwrap_or_else(|_| "50.0".to_string())
                    .parse()
                    .unwrap_or(50.0),
                low: env::var("THRESHOLD_LOW")
                    .unwrap_or_else(|_| "25.0".to_string())
                    .parse()
                    .unwrap_or(25.0),
            },
            
            monitoring: MonitoringConfig {
                poll_interval_minutes: env::var("POLL_INTERVAL_MINUTES")
                    .unwrap_or_else(|_| "60".to_string())
                    .parse()
                    .unwrap_or(60),
                batch_size: env::var("BATCH_SIZE")
                    .unwrap_or_else(|_| "100".to_string())
                    .parse()
                    .unwrap_or(100),
                retry_attempts: env::var("RETRY_ATTEMPTS")
                    .unwrap_or_else(|_| "3".to_string())
                    .parse()
                    .unwrap_or(3),
                cache_ttl_minutes: env::var("CACHE_TTL_MINUTES")
                    .unwrap_or_else(|_| "15".to_string())
                    .parse()
                    .unwrap_or(15),
            },
            
            rpc_url: env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string()),
            program_id: env::var("RISK_PROGRAM_ID")
                .unwrap_or_else(|_| "RiskAwareAttestation11111111111111111111111".to_string()),
            risk_engine_wallet: env::var("RISK_ENGINE_WALLET")
                .map_err(|_| ConfigError::MissingEnvVar("RISK_ENGINE_WALLET".to_string()))?,
        })
    }
    
    pub fn risk_level_for_score(&self, score: f64) -> RiskLevel {
        if score >= self.thresholds.critical {
            RiskLevel::Critical
        } else if score >= self.thresholds.high {
            RiskLevel::High
        } else if score >= self.thresholds.medium {
            RiskLevel::Medium
        } else if score >= self.thresholds.low {
            RiskLevel::Low
        } else {
            RiskLevel::Safe
        }
    }
}
 
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RiskLevel {
    Safe,
    Low,
    Medium,
    High,
    Critical,