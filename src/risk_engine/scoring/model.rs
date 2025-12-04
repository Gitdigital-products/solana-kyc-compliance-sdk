use crate::risk_engine::types::*;
use crate::risk_engine::config::RiskThresholds;
use std::collections::HashMap;
use chrono::{Duration, Utc};

#[derive(Debug, Clone)]
pub struct RiskScoringModel {
    thresholds: RiskThresholds,
    weights: CategoryWeights,
    decay_config: ScoreDecayConfig,
}

#[derive(Debug, Clone)]
struct CategoryWeights {
    sanctions: f64,
    illicit_activity: f64,
    high_risk_service: f64,
    behavioral_anomaly: f64,
    counterparty_risk: f64,
    reputation_risk: f64,
    technical_risk: f64,
}

#[derive(Debug, Clone)]
struct ScoreDecayConfig {
    half_life_days: f64,  // Number of days for score to reduce by half
    min_decay_score: f64, // Minimum score after decay
}

impl RiskScoringModel {
    pub fn new(thresholds: RiskThresholds) -> Self {
        Self {
            thresholds,
            weights: CategoryWeights {
                sanctions: 2.0,
                illicit_activity: 1.8,
                high_risk_service: 1.5,
                behavioral_anomaly: 1.3,
                counterparty_risk: 1.2,
                reputation_risk: 1.1,
                technical_risk: 1.0,
            },
            decay_config: ScoreDecayConfig {
                half_life_days: 30.0,
                min_decay_score: 10.0,
            },
        }
    }
    
    pub fn compute_risk_score(&self, indicators: &[RiskIndicator]) -> f64 {
        if indicators.is_empty() {
            return 0.0;
        }
        
        // Group indicators by category
        let mut category_scores = HashMap::new();
        let mut category_counts = HashMap::new();
        
        for indicator in indicators {
            let decayed_score = self.apply_time_decay(
                indicator.score,
                indicator.first_seen,
                indicator.last_seen,
            );
            
            let weighted_score = decayed_score * self.get_category_weight(&indicator.category);
            
            let entry = category_scores.entry(&indicator.category)
                .or_insert(0.0);
            *entry += weighted_score;
            
            *category_counts.entry(&indicator.category).or_insert(0) += 1;
        }
        
        // Calculate weighted average
        let mut total_weighted_score = 0.0;
        let mut total_weight = 0.0;
        
        for (category, &score) in &category_scores {
            let count = category_counts.get(category).unwrap_or(&1);
            let average_score = score / (*count as f64);
            
            let weight = self.get_category_weight(category);
            total_weighted_score += average_score * weight;
            total_weight += weight;
        }
        
        let average_score = if total_weight > 0.0 {
            total_weighted_score / total_weight
        } else {
            0.0
        };
        
        // Apply non-linear amplification for high scores
        self.amplify_high_risk(average_score).min(100.0)
    }
    
    fn get_category_weight(&self, category: &RiskCategory) -> f64 {
        match category {
            RiskCategory::Sanctions => self.weights.sanctions,
            RiskCategory::IllicitActivity => self.weights.illicit_activity,
            RiskCategory::HighRiskService => self.weights.high_risk_service,
            RiskCategory::BehavioralAnomaly => self.weights.behavioral_anomaly,
            RiskCategory::CounterpartyRisk => self.weights.counterparty_risk,
            RiskCategory::ReputationRisk => self.weights.reputation_risk,
            RiskCategory::TechnicalRisk => self.weights.technical_risk,
        }
    }
    
    fn apply_time_decay(&self, score: f64, first_seen: chrono::DateTime<Utc>, last_seen: chrono::DateTime<Utc>) -> f64 {
        let now = Utc::now();
        let days_since_last = (now - last_seen).num_days() as f64;
        
        if days_since_last <= 0.0 {
            return score;
        }
        
        // Exponential decay formula
        let decay_factor = 0.5_f64.powf(days_since_last / self.decay_config.half_life_days);
        let decayed_score = score * decay_factor;
        
        decayed_score.max(self.decay_config.min_decay_score).min(score)
    }
    
    fn amplify_high_risk(&self, score: f64) -> f64 {
        if score >= self.thresholds.critical {
            // Critical risks get maximum amplification
            score * 1.2
        } else if score >= self.thresholds.high {
            // High risks get moderate amplification
            score * 1.1
        } else if score >= self.thresholds.medium {
            // Medium risks get slight amplification
            score * 1.05
        } else {
            // Low risks remain as-is
            score
        }
    }
    
    pub fn evaluate_transaction_risk(
        &self,
        transaction: &TransactionRiskAssessment,
        wallet_history: Option<&WalletRiskProfile>,
    ) -> f64 {
        let base_score = transaction.risk_score;
        
        // Adjust based on wallet history
        let history_adjustment = if let Some(history) = wallet_history {
            if history.risk_level == RiskLevel::Critical {
                1.5 // Critical history amplifies transaction risk
            } else if history.risk_level == RiskLevel::High {
                1.3
            } else if history.risk_level == RiskLevel::Medium {
                1.1
            } else {
                1.0
            }
        } else {
            1.0
        };
        
        // Check for pattern anomalies
        let pattern_adjustment = self.analyze_transaction_patterns(transaction);
        
        base_score * history_adjustment * pattern_adjustment
    }
    
    fn analyze_transaction_patterns(&self, transaction: &TransactionRiskAssessment) -> f64 {
        let mut adjustment = 1.0;
        
        // Large transaction amount adjustment
        if let Some(amount) = transaction.risk_indicators.iter()
            .find(|i| i.amount_involved.is_some())
            .and_then(|i| i.amount_involved)
        {
            if amount > 100000.0 { // $100k threshold
                adjustment *= 1.3;
            } else if amount > 10000.0 { // $10k threshold
                adjustment *= 1.15;
            }
        }
        
        // Multiple counterparties adjustment
        let counterparty_count = transaction.risk_indicators.iter()
            .filter(|i| i.counterparty.is_some())
            .count();
        
        if counterparty_count > 5 {
            adjustment *= 1.2;
        } else if counterparty_count > 2 {
            adjustment *= 1.1;
        }
        
        adjustment
    }
    
    pub fn generate_risk_report(
        &self,
        profile: &WalletRiskProfile,
    ) -> RiskReport {
        let mut report = RiskReport {
            wallet_address: profile.wallet_address.clone(),
            overall_score: profile.overall_risk_score,
            risk_level: profile.risk_level.clone(),
            category_breakdown: HashMap::new(),
            top_risks: Vec::new(),
            confidence_score: 0.0,
            recommendations: profile.recommendations.clone(),
        };
        
        // Calculate category breakdown
        for indicator in &profile.risk_indicators {
            let entry = report.category_breakdown
                .entry(indicator.category.clone())
                .or_insert(CategoryScore {
                    average_score: 0.0,
                    count: 0,
                    max_score: 0.0,
                });
            
            entry.average_score = (entry.average_score * entry.count as f64 + indicator.score) 
                / (entry.count as f64 + 1.0);
            entry.count += 1;
            entry.max_score = entry.max_score.max(indicator.score);
        }
        
        // Identify top 5 risks
        let mut indicators = profile.risk_indicators.clone();
        indicators.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        
        report.top_risks = indicators.into_iter()
            .take(5)
            .map(|ind| TopRisk {
                category: ind.category,
                score: ind.score,
                description: ind.description,
                first_seen: ind.first_seen,
            })
            .collect();
        
        // Calculate confidence score based on data sources and recency
        let source_count = profile.data_sources.len();
        let recent_count = profile.risk_indicators.iter()
            .filter(|ind| (Utc::now() - ind.last_seen).num_days() < 7)
            .count();
        
        report.confidence_score = 0.3 * (source_count as f64 / 3.0).min(1.0)
            + 0.4 * (recent_count as f64 / profile.risk_indicators.len() as f64).min(1.0)
            + 0.3 * (profile.risk_indicators.iter().map(|i| i.confidence).sum::<f64>() 
                / profile.risk_indicators.len() as f64);
        
        report
    }
}

#[derive(Debug, Clone)]
pub struct RiskReport {
    pub wallet_address: String,
    pub overall_score: f64,
    pub risk_level: RiskLevel,
    pub category_breakdown: HashMap<RiskCategory, CategoryScore>,
    pub top_risks: Vec<TopRisk>,
    pub confidence_score: f64,
    pub recommendations: Vec<RiskRecommendation>,
}

#[derive(Debug, Clone)]
pub struct CategoryScore {
    pub average_score: f64,
    pub count: usize,
    pub max_score: f64,
}

#[derive(Debug, Clone)]
pub struct TopRisk {
    pub category: RiskCategory,
    pub score: f64,
    pub description: String,
    pub first_seen: chrono::DateTime<Utc>,
}