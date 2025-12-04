use crate::risk_engine::types::*;
use std::collections::{HashMap, VecDeque};
use chrono::{Duration, Utc};

#[derive(Debug, Clone)]
pub struct BehavioralAnomalyDetector {
    window_size: usize,
    history: HashMap<String, VecDeque<TransactionRecord>>,
    thresholds: AnomalyThresholds,
}

#[derive(Debug, Clone)]
struct TransactionRecord {
    timestamp: chrono::DateTime<Utc>,
    amount: f64,
    counterparty: String,
    risk_score: f64,
}

#[derive(Debug, Clone)]
struct AnomalyThresholds {
    volume_spike: f64,      // e.g., 3.0 = 300% increase
    frequency_spike: f64,   // e.g., 5.0 = 500% increase
    amount_threshold: f64,  // Large transaction threshold
    new_counterparty_ratio: f64, // Ratio of new counterparties
}

impl BehavioralAnomalyDetector {
    pub fn new() -> Self {
        Self {
            window_size: 100, // Keep last 100 transactions
            history: HashMap::new(),
            thresholds: AnomalyThresholds {
                volume_spike: 3.0,
                frequency_spike: 5.0,
                amount_threshold: 10000.0, // $10k
                new_counterparty_ratio: 0.7, // 70% new counterparties
            },
        }
    }
    
    pub fn analyze_transaction(
        &mut self,
        wallet_address: &str,
        transaction: &TransactionRiskAssessment,
    ) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();
        
        // Get or create transaction history
        let history = self.history
            .entry(wallet_address.to_string())
            .or_insert_with(VecDeque::new);
        
        // Add current transaction to history
        let record = TransactionRecord {
            timestamp: transaction.timestamp,
            amount: transaction.risk_indicators.iter()
                .find_map(|i| i.amount_involved)
                .unwrap_or(0.0),
            counterparty: transaction.risk_indicators.iter()
                .find_map(|i| i.counterparty.clone())
                .unwrap_or_default(),
            risk_score: transaction.risk_score,
        };
        
        history.push_back(record);
        if history.len() > self.window_size {
            history.pop_front();
        }
        
        // Only analyze if we have enough history
        if history.len() >= 10 {
            anomalies.extend(self.detect_volume_anomalies(wallet_address, history));
            anomalies.extend(self.detect_frequency_anomalies(wallet_address, history));
            anomalies.extend(self.detect_counterparty_anomalies(wallet_address, history));
            anomalies.extend(self.detect_pattern_anomalies(wallet_address, history));
        }
        
        anomalies
    }
    
    fn detect_volume_anomalies(
        &self,
        wallet_address: &str,
        history: &VecDeque<TransactionRecord>,
    ) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();
        
        let recent_window = 24; // Last 24 hours
        let comparison_window = 168; // Previous week
        
        let recent_sum: f64 = history.iter()
            .rev()
            .take(recent_window)
            .filter(|r| (Utc::now() - r.timestamp).num_hours() <= 24)
            .map(|r| r.amount)
            .sum();
        
        let comparison_sum: f64 = history.iter()
            .filter(|r| (Utc::now() - r.timestamp).num_hours() > 24 
                     && (Utc::now() - r.timestamp).num_hours() <= 24 * 7)
            .map(|r| r.amount)
            .sum();
        
        if comparison_sum > 0.0 {
            let volume_ratio = recent_sum / comparison_sum * 7.0; // Normalize to daily
            if volume_ratio > self.thresholds.volume_spike {
                anomalies.push(AnomalyDetection {
                    wallet_address: wallet_address.to_string(),
                    anomaly_type: AnomalyType::VolumeSpike,
                    severity: self.calculate_severity(volume_ratio),
                    description: format!("Transaction volume increased by {:.1}x", volume_ratio),
                    timestamp: Utc::now(),
                    metadata: HashMap::from([
                        ("recent_volume".to_string(), recent_sum.to_string()),
                        ("comparison_volume".to_string(), comparison_sum.to_string()),
                        ("ratio".to_string(), volume_ratio.to_string()),
                    ]),
                });
            }
        }
        
        anomalies
    }
    
    fn detect_frequency_anomalies(
        &self,
        wallet_address: &str,
        history: &VecDeque<TransactionRecord>,
    ) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();
        
        let recent_count = history.iter()
            .filter(|r| (Utc::now() - r.timestamp).num_hours() <= 24)
            .count();
        
        let comparison_count = history.iter()
            .filter(|r| (Utc::now() - r.timestamp).num_hours() > 24 
                     && (Utc::now() - r.timestamp).num_hours() <= 24 * 7)
            .count() / 7; // Average per day
        
        if comparison_count > 0 {
            let frequency_ratio = recent_count as f64 / comparison_count as f64;
            if frequency_ratio > self.thresholds.frequency_spike {
                anomalies.push(AnomalyDetection {
                    wallet_address: wallet_address.to_string(),
                    anomaly_type: AnomalyType::FrequencySpike,
                    severity: self.calculate_severity(frequency_ratio),
                    description: format!("Transaction frequency increased by {:.1}x", frequency_ratio),
                    timestamp: Utc::now(),
                    metadata: HashMap::from([
                        ("recent_count".to_string(), recent_count.to_string()),
                        ("comparison_count".to_string(), comparison_count.to_string()),
                        ("ratio".to_string(), frequency_ratio.to_string()),
                    ]),
                });
            }
        }
        
        anomalies
    }
    
    fn detect_counterparty_anomalies(
        &self,
        wallet_address: &str,
        history: &VecDeque<TransactionRecord>,
    ) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();
        
        // Get recent counterparties
        let recent_counterparties: Vec<String> = history.iter()
            .filter(|r| (Utc::now() - r.timestamp).num_hours() <= 24)
            .map(|r| r.counterparty.clone())
            .filter(|c| !c.is_empty())
            .collect();
        
        // Get historical counterparties
        let historical_counterparties: Vec<String> = history.iter()
            .filter(|r| (Utc::now() - r.timestamp).num_hours() > 24)
            .map(|r| r.counterparty.clone())
            .filter(|c| !c.is_empty())
            .collect();
        
        if !recent_counterparties.is_empty() {
            let new_counterparties: Vec<String> = recent_counterparties.iter()
                .filter(|c| !historical_counterparties.contains(c))
                .cloned()
            .collect();
            
            let new_ratio = new_counterparties.len() as f64 / recent_counterparties.len() as f64;
            
            if new_ratio > self.thresholds.new_counterparty_ratio {
                anomalies.push(AnomalyDetection {
                    wallet_address: wallet_address.to_string(),
                    anomaly_type: AnomalyType::NewCounterparties,
                    severity: self.calculate_severity(new_ratio),
                    description: format!("{:.0}% of recent counterparties are new", new_ratio * 100.0),
                    timestamp: Utc::now(),
                    metadata: HashMap::from([
                        ("new_counterparties".to_string(), new_counterparties.len().to_string()),
                        ("total_recent".to_string(), recent_counterparties.len().to_string()),
                        ("ratio".to_string(), new_ratio.to_string()),
                    ]),
                });
            }
        }
        
        anomalies
    }
    
    fn detect_pattern_anomalies(
        &self,
        wallet_address: &str,
        history: &VecDeque<TransactionRecord>,
    ) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();
        
        // Detect structuring (multiple transactions just below threshold)
        let structuring_candidates: Vec<&TransactionRecord> = history.iter()
            .filter(|r| r.amount > self.thresholds.amount_threshold * 0.9 
                     && r.amount < self.thresholds.amount_threshold)
            .collect();
        
        if structuring_candidates.len() >= 3 {
            let total_amount: f64 = structuring_candidates.iter()
                .map(|r| r.amount)
                .sum();
            
            if total_amount > self.thresholds.amount_threshold * 2.0 {
                anomalies.push(AnomalyDetection {
                    wallet_address: wallet_address.to_string(),
                    anomaly_type: AnomalyType::Structuring,
                    severity: SeverityLevel::High,
                    description: "Potential transaction structuring detected".to_string(),
                    timestamp: Utc::now(),
                    metadata: HashMap::from([
                        ("candidate_count".to_string(), structuring_candidates.len().to_string()),
                        ("total_amount".to_string(), total_amount.to_string()),
                        ("threshold".to_string(), self.thresholds.amount_threshold.to_string()),
                    ]),
                });
            }
        }
        
        anomalies
    }
    
    fn calculate_severity(&self, ratio: f64) -> SeverityLevel {
        if ratio > 10.0 {
            SeverityLevel::Critical
        } else if ratio > 5.0 {
            SeverityLevel::High
        } else if ratio > 3.0 {
            SeverityLevel::Medium
        } else {
            SeverityLevel::Low
        }
    }
    
    pub fn get_wallet_behavior_profile(
        &self,
        wallet_address: &str,
    ) -> Option<BehaviorProfile> {
        self.history.get(wallet_address).map(|history| {
            let total_transactions = history.len();
            let total_volume: f64 = history.iter().map(|r| r.amount).sum();
            let avg_transaction = if total_transactions > 0 {
                total_volume / total_transactions as f64
            } else {
                0.0
            };
            
            let unique_counterparties: std::collections::HashSet<String> = history.iter()
                .map(|r| r.counterparty.clone())
                .filter(|c| !c.is_empty())
                .collect();
            
            BehaviorProfile {
                wallet_address: wallet_address.to_string(),
                total_transactions,
                total_volume,
                avg_transaction_size: avg_transaction,
                unique_counterparties: unique_counterparties.len(),
                risk_trend: self.calculate_risk_trend(history),
                last_updated: Utc::now(),
            }
        })
    }
    
    fn calculate_risk_trend(&self, history: &VecDeque<TransactionRecord>) -> RiskTrend {
        if history.len() < 10 {
            return RiskTrend::InsufficientData;
        }
        
        let recent_risk: f64 = history.iter()
            .rev()
            .take(10)
            .map(|r| r.risk_score)
            .sum::<f64>() / 10.0;
        
        let previous_risk: f64 = history.iter()
            .rev()
            .skip(10)
            .take(10)
            .map(|r| r.risk_score)
            .sum::<f64>() / 10.0;
        
        if recent_risk > previous_risk * 1.5 {
            RiskTrend::Increasing
        } else if recent_risk < previous_risk * 0.7 {
            RiskTrend::Decreasing
        } else {
            RiskTrend::Stable
        }
    }
}

#[derive(Debug, Clone)]
pub struct AnomalyDetection {
    pub wallet_address: String,
    pub anomaly_type: AnomalyType,
    pub severity: SeverityLevel,
    pub description: String,
    pub timestamp: chrono::DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnomalyType {
    VolumeSpike,
    FrequencySpike,
    NewCounterparties,
    Structuring,
    TimeOfDay,
    Geographical,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeverityLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub struct BehaviorProfile {
    pub wallet_address: String,
    pub total_transactions: usize,
    pub total_volume: f64,
    pub avg_transaction_size: f64,
    pub unique_counterparties: usize,
    pub risk_trend: RiskTrend,
    pub last_updated: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RiskTrend {
    Increasing,
    Decreasing,
    Stable,
    InsufficientData,
}