use crate::risk_engine::types::*;
use crate::risk_engine::config::RiskEngineConfig;
use crate::risk_engine::providers::{TrmClient, ChainalysisClient};
use std::sync::Arc;
use tokio::time::Instant;
use std::collections::HashMap;
use tracing::{info, warn, error};

#[derive(Debug, Clone)]
pub struct RiskDataAggregator {
    trm_client: Option<Arc<TrmClient>>,
    chainalysis_client: Option<Arc<ChainalysisClient>>,
    config: Arc<RiskEngineConfig>,
}

impl RiskDataAggregator {
    pub fn new(
        trm_client: Option<Arc<TrmClient>>,
        chainalysis_client: Option<Arc<ChainalysisClient>>,
        config: Arc<RiskEngineConfig>,
    ) -> Self {
        Self {
            trm_client,
            chainalysis_client,
            config,
        }
    }
    
    pub async fn aggregate_wallet_risk(&self, wallet_address: &str) -> Result<WalletRiskProfile, String> {
        let start_time = Instant::now();
        let mut all_indicators = Vec::new();
        let mut data_sources = Vec::new();
        
        // Parallel data fetching from all providers
        let mut tasks = Vec::new();
        
        // TRM Labs
        if let Some(client) = &self.trm_client {
            let client = client.clone();
            let address = wallet_address.to_string();
            tasks.push(tokio::spawn(async move {
                client.get_address_risk(&address).await
            }));
        }
        
        // Chainalysis
        if let Some(client) = &self.chainalysis_client {
            let client = client.clone();
            let address = wallet_address.to_string();
            tasks.push(tokio::spawn(async move {
                client.get_address_screening(&address).await
            }));
        }
        
        // Wait for all providers
        let results = futures::future::join_all(tasks).await;
        
        // Process TRM results
        if let Some(result) = results.get(0) {
            match result {
                Ok(Ok(trm_response)) => {
                    let indicators: Vec<RiskIndicator> = trm_response.clone().into();
                    all_indicators.extend(indicators);
                    data_sources.push(DataSource::TrmLabs);
                    info!("TRM data fetched for {}", wallet_address);
                }
                Ok(Err(e)) => {
                    warn!("TRM provider failed for {}: {}", wallet_address, e);
                }
                Err(e) => {
                    warn!("TRM task failed for {}: {}", wallet_address, e);
                }
            }
        }
        
        // Process Chainalysis results
        if let Some(result) = results.get(1) {
            match result {
                Ok(Ok(chainalysis_screening)) => {
                    // Convert Chainalysis data to our indicators
                    let indicators = self.convert_chainalysis_indicators(
                        wallet_address,
                        chainalysis_screening,
                    );
                    all_indicators.extend(indicators);
                    data_sources.push(DataSource::Chainalysis);
                    info!("Chainalysis data fetched for {}", wallet_address);
                }
                Ok(Err(e)) => {
                    warn!("Chainalysis provider failed for {}: {}", wallet_address, e);
                }
                Err(e) => {
                    warn!("Chainalysis task failed for {}: {}", wallet_address, e);
                }
            }
        }
        
        // Calculate overall risk score
        let overall_score = self.calculate_overall_score(&all_indicators);
        let risk_level = self.config.risk_level_for_score(overall_score);
        
        // Generate recommendations
        let recommendations = self.generate_recommendations(&risk_level, &all_indicators);
        
        let profile = WalletRiskProfile {
            wallet_address: wallet_address.to_string(),
            overall_risk_score: overall_score,
            risk_level,
            risk_indicators: all_indicators,
            attestation_key: None, // Will be populated by caller
            last_updated: chrono::Utc::now(),
            data_sources,
            recommendations,
            metadata: HashMap::new(),
        };
        
        let duration = start_time.elapsed();
        info!("Risk aggregation completed for {} in {:?}", wallet_address, duration);
        
        Ok(profile)
    }
    
    fn calculate_overall_score(&self, indicators: &[RiskIndicator]) -> f64 {
        if indicators.is_empty() {
            return 0.0;
        }
        
        // Weighted average based on category weights and confidence
        let mut weighted_sum = 0.0;
        let mut total_weight = 0.0;
        
        for indicator in indicators {
            let category_weight = indicator.category.weight();
            let confidence_weight = indicator.confidence;
            let weight = category_weight * confidence_weight;
            
            weighted_sum += indicator.score * weight;
            total_weight += weight;
        }
        
        let average = if total_weight > 0.0 {
            weighted_sum / total_weight
        } else {
            0.0
        };
        
        // Apply non-linear scaling for critical risks
        self.apply_nonlinear_scaling(average)
    }
    
    fn apply_nonlinear_scaling(&self, score: f64) -> f64 {
        // Exponential scaling for higher scores to emphasize critical risks
        if score > 80.0 {
            score + (score - 80.0) * 0.5
        } else if score > 60.0 {
            score + (score - 60.0) * 0.3
        } else {
            score
        }.min(100.0)
    }
    
    fn convert_chainalysis_indicators(
        &self,
        wallet_address: &str,
        screening: &ChainalysisScreening,
    ) -> Vec<RiskIndicator> {
        let mut indicators = Vec::new();
        
        // Convert category scores to indicators
        for category_score in &screening.category_scores {
            let category = match category_score.category.as_str() {
                "sanctions" => RiskCategory::Sanctions,
                "illicit_activity" => RiskCategory::IllicitActivity,
                "high_risk_service" => RiskCategory::HighRiskService,
                _ => RiskCategory::TechnicalRisk,
            };
            
            let indicator = RiskIndicator {
                id: format!("chainalysis_{}_{}", wallet_address, category_score.category),
                category,
                subcategory: category_score.subcategory.clone().unwrap_or_default(),
                score: category_score.score,
                confidence: 0.9, // Chainalysis typically has high confidence
                description: format!("Chainalysis {} risk detected", category_score.category),
                evidence: vec![Evidence {
                    source: DataSource::Chainalysis,
                    raw_data: serde_json::to_value(category_score).unwrap(),
                    extracted_info: HashMap::from([
                        ("category".to_string(), category_score.category.clone()),
                        ("score".to_string(), category_score.score.to_string()),
                    ]),
                    timestamp: chrono::Utc::now(),
                }],
                first_seen: chrono::Utc::now(),
                last_seen: chrono::Utc::now(),
                transaction_hashes: Vec::new(),
                addresses_involved: Vec::new(),
                metadata: HashMap::new(),
            };
            
            indicators.push(indicator);
        }
        
        // Add sanctions indicator if applicable
        if screening.is_sanctioned {
            let sanctions_indicator = RiskIndicator {
                id: format!("chainalysis_{}_sanctions", wallet_address),
                category: RiskCategory::Sanctions,
                subcategory: "OFAC".to_string(),
                score: 100.0, // Maximum score for sanctions
                confidence: 1.0,
                description: "Address appears on sanctions list".to_string(),
                evidence: vec![Evidence {
                    source: DataSource::Chainalysis,
                    raw_data: serde_json::json!({"is_sanctioned": true}),
                    extracted_info: HashMap::from([
                        ("sanctioned".to_string(), "true".to_string()),
                    ]),
                    timestamp: chrono::Utc::now(),
                }],
                first_seen: chrono::Utc::now(),
                last_seen: chrono::Utc::now(),
                transaction_hashes: Vec::new(),
                addresses_involved: Vec::new(),
                metadata: HashMap::new(),
            };
            
            indicators.push(sanctions_indicator);
        }
        
        indicators
    }
    
    fn generate_recommendations(
        &self,
        risk_level: &RiskLevel,
        indicators: &[RiskIndicator],
    ) -> Vec<RiskRecommendation> {
        let mut recommendations = Vec::new();
        
        match risk_level {
            RiskLevel::Critical => {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::RevokeAttestation,
                    priority: PriorityLevel::Critical,
                    reason: "Critical risk level detected".to_string(),
                    deadline_hours: Some(1),
                });
            }
            RiskLevel::High => {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::SuspendTemporarily,
                    priority: PriorityLevel::High,
                    reason: "High risk level requires immediate action".to_string(),
                    deadline_hours: Some(4),
                });
            }
            RiskLevel::Medium => {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::FlagForReview,
                    priority: PriorityLevel::Medium,
                    reason: "Medium risk level requires review".to_string(),
                    deadline_hours: Some(24),
                });
            }
            RiskLevel::Low => {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::NoAction,
                    priority: PriorityLevel::Low,
                    reason: "Low risk level - monitor only".to_string(),
                    deadline_hours: None,
                });
            }
            RiskLevel::Safe => {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::NoAction,
                    priority: PriorityLevel::Low,
                    reason: "Safe risk level".to_string(),
                    deadline_hours: None,
                });
            }
        }
        
        // Add specific recommendations based on indicators
        for indicator in indicators {
            if indicator.category == RiskCategory::Sanctions && indicator.score > 80.0 {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::EscalateToCompliance,
                    priority: PriorityLevel::Critical,
                    reason: "Sanctions exposure detected".to_string(),
                    deadline_hours: Some(1),
                });
            }
            
            if indicator.category == RiskCategory::IllicitActivity && indicator.score > 70.0 {
                recommendations.push(RiskRecommendation {
                    action: RecommendedAction::RequestAdditionalKyc,
                    priority: PriorityLevel::High,
                    reason: "Potential illicit activity detected".to_string(),
                    deadline_hours: Some(12),
                });
            }
        }
        
        recommendations
    }
}