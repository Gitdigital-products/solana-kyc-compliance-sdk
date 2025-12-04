use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use std::collections::HashMap;
use chrono::{DateTime, Utc};
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletRiskProfile {
    pub wallet_address: String,
    pub overall_risk_score: f64,
    pub risk_level: RiskLevel,
    pub risk_indicators: Vec<RiskIndicator>,
    pub attestation_key: Option<Pubkey>,
    pub last_updated: DateTime<Utc>,
    pub data_sources: Vec<DataSource>,
    pub recommendations: Vec<RiskRecommendation>,
    pub metadata: HashMap<String, serde_json::Value>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskLevel {
    Safe,
    Low,
    Medium,
    High,
    Critical,
}
 
impl RiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Safe => "safe",
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
            RiskLevel::Critical => "critical",
        }
    }
    
    pub fn requires_action(&self) -> bool {
        matches!(self, RiskLevel::High | RiskLevel::Critical)
    }
    
    pub fn requires_immediate_action(&self) -> bool {
        self == &RiskLevel::Critical
    }
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskIndicator {
    pub id: String,
    pub category: RiskCategory,
    pub subcategory: String,
    pub score: f64,
    pub confidence: f64,
    pub description: String,
    pub evidence: Vec<Evidence>,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub transaction_hashes: Vec<String>,
    pub addresses_involved: Vec<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskCategory {
    Sanctions,
    IllicitActivity,
    HighRiskService,
    BehavioralAnomaly,
    CounterpartyRisk,
    ReputationRisk,
    TechnicalRisk,
}
 
impl RiskCategory {
    pub fn weight(&self) -> f64 {
        match self {
            RiskCategory::Sanctions => 2.0,
            RiskCategory::IllicitActivity => 1.8,
            RiskCategory::HighRiskService => 1.5,
            RiskCategory::BehavioralAnomaly => 1.3,
            RiskCategory::CounterpartyRisk => 1.2,
            RiskCategory::ReputationRisk => 1.1,
            RiskCategory::TechnicalRisk => 1.0,
        }
    }
    
    pub fn description(&self) -> &'static str {
        match self {
            RiskCategory::Sanctions => "Sanctions and watchlist exposure",
            RiskCategory::IllicitActivity => "Direct involvement in illicit activities",
            RiskCategory::HighRiskService => "Interaction with high-risk services",
            RiskCategory::BehavioralAnomaly => "Unusual behavioral patterns",
            RiskCategory::CounterpartyRisk => "Counterparty exposure risk",
            RiskCategory::ReputationRisk => "Reputational damage risk",
            RiskCategory::TechnicalRisk => "Technical security risks",
        }
    }
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    pub source: DataSource,
    pub raw_data: serde_json::Value,
    pub extracted_info: HashMap<String, String>,
    pub timestamp: DateTime<Utc>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DataSource {
    TrmLabs,
    Chainalysis,
    Crystal,
    OnChain,
    Internal,
    Manual,
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskRecommendation {
    pub action: RecommendedAction,
    pub priority: PriorityLevel,
    pub reason: String,
    pub deadline_hours: Option<u32>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RecommendedAction {
    NoAction,
    FlagForReview,
    SuspendTemporarily,
    RevokeAttestation,
    EscalateToCompliance,
    RequestAdditionalKyc,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PriorityLevel {
    Low,
    Medium,
    High,
    Critical,
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRiskAssessment {
    pub tx_hash: String,
    pub wallet_address: String,
    pub risk_score: f64,
    pub risk_indicators: Vec<TransactionIndicator>,
    pub timestamp: DateTime<Utc>,
    pub verified: bool,
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionIndicator {
    pub category: RiskCategory,
    pub description: String,
    pub amount_involved: Option<f64>,
    pub counterparty: Option<String>,
    pub risk_score: f64,
}
 
// Batch processing types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRiskAssessment {
    pub batch_id: String,
    pub wallets: Vec<WalletRiskProfile>,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub summary: BatchSummary,
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchSummary {
    pub total_wallets: usize,
    pub safe_count: usize,
    pub low_count: usize,
    pub medium_count: usize,
    pub high_count: usize,
    pub critical_count: usize,
    pub average_risk_score: f64,
    pub actions_required: usize,