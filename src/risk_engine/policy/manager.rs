use crate::risk_engine::types::*;
use crate::risk_engine::config::RiskEngineConfig;
use std::sync::Arc;
use chrono::{Duration, Utc};

#[derive(Debug, Clone)]
pub struct PolicyManager {
    config: Arc<RiskEngineConfig>,
    policies: Vec<RiskPolicy>,
    escalation_path: EscalationPath,
}

#[derive(Debug, Clone)]
pub struct RiskPolicy {
    pub id: String,
    pub name: String,
    pub conditions: PolicyConditions,
    pub actions: Vec<PolicyAction>,
    pub priority: PolicyPriority,
    pub active: bool,
}

#[derive(Debug, Clone)]
pub struct PolicyConditions {
    pub risk_level: Option<RiskLevel>,
    pub risk_score_min: Option<f64>,
    pub risk_score_max: Option<f64>,
    pub categories: Vec<RiskCategory>,
    pub age_of_attestation_days: Option<u32>,
    pub transaction_volume_threshold: Option<f64>,
    pub required_sources: Vec<DataSource>,
}

#[derive(Debug, Clone)]
pub struct PolicyAction {
    pub action_type: ActionType,
    pub parameters: ActionParameters,
    pub delay_minutes: Option<u32>,
    pub requires_approval: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionType {
    NoAction,
    FlagAttestation,
    SuspendAttestation,
    RevokeAttestation,
    RequestAdditionalKyc,
    EscalateToCompliance,
    NotifyUser,
    NotifyComplianceTeam,
}

#[derive(Debug, Clone)]
pub struct ActionParameters {
    pub flag_reason: Option<String>,
    pub suspension_duration_days: Option<u32>,
    pub revocation_reason: Option<String>,
    pub notification_message: Option<String>,
    pub escalation_level: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyPriority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub struct EscalationPath {
    pub levels: Vec<EscalationLevel>,
    pub auto_escalate_hours: u32,
}

#[derive(Debug, Clone)]
pub struct EscalationLevel {
    pub level: u32,
    pub risk_threshold: f64,
    pub required_approvals: u32,
    pub approver_roles: Vec<String>,
}

impl PolicyManager {
    pub fn new(config: Arc<RiskEngineConfig>) -> Self {
        let mut policies = Vec::new();
        
        // Critical Risk Policy
        policies.push(RiskPolicy {
            id: "critical_risk".to_string(),
            name: "Critical Risk Immediate Action".to_string(),
            conditions: PolicyConditions {
                risk_level: Some(RiskLevel::Critical),
                risk_score_min: Some(config.thresholds.critical),
                risk_score_max: None,
                categories: vec![RiskCategory::Sanctions, RiskCategory::IllicitActivity],
                age_of_attestation_days: None,
                transaction_volume_threshold: None,
                required_sources: vec![DataSource::TrmLabs, DataSource::Chainalysis],
            },
            actions: vec![
                PolicyAction {
                    action_type: ActionType::RevokeAttestation,
                    parameters: ActionParameters {
                        revocation_reason: Some("Critical risk detected".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(0),
                    requires_approval: false,
                },
                PolicyAction {
                    action_type: ActionType::NotifyComplianceTeam,
                    parameters: ActionParameters {
                        notification_message: Some("Critical risk detected - attestation revoked".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(5),
                    requires_approval: false,
                },
            ],
            priority: PolicyPriority::Critical,
            active: true,
        });
        
        // High Risk Policy
        policies.push(RiskPolicy {
            id: "high_risk".to_string(),
            name: "High Risk Suspension".to_string(),
            conditions: PolicyConditions {
                risk_level: Some(RiskLevel::High),
                risk_score_min: Some(config.thresholds.high),
                risk_score_max: Some(config.thresholds.critical),
                categories: vec![],
                age_of_attestation_days: None,
                transaction_volume_threshold: None,
                required_sources: vec![],
            },
            actions: vec![
                PolicyAction {
                    action_type: ActionType::SuspendAttestation,
                    parameters: ActionParameters {
                        suspension_duration_days: Some(7),
                        ..Default::default()
                    },
                    delay_minutes: Some(0),
                    requires_approval: true,
                },
                PolicyAction {
                    action_type: ActionType::RequestAdditionalKyc,
                    parameters: ActionParameters {
                        notification_message: Some("Additional KYC required due to high risk".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(60),
                    requires_approval: false,
                },
            ],
            priority: PolicyPriority::High,
            active: true,
        });
        
        // Medium Risk Policy
        policies.push(RiskPolicy {
            id: "medium_risk".to_string(),
            name: "Medium Risk Flagging".to_string(),
            conditions: PolicyConditions {
                risk_level: Some(RiskLevel::Medium),
                risk_score_min: Some(config.thresholds.medium),
                risk_score_max: Some(config.thresholds.high),
                categories: vec![],
                age_of_attestation_days: None,
                transaction_volume_threshold: None,
                required_sources: vec![],
            },
            actions: vec![
                PolicyAction {
                    action_type: ActionType::FlagAttestation,
                    parameters: ActionParameters {
                        flag_reason: Some("Medium risk level detected".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(0),
                    requires_approval: false,
                },
                PolicyAction {
                    action_type: ActionType::NotifyUser,
                    parameters: ActionParameters {
                        notification_message: Some("Your attestation has been flagged for review".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(120),
                    requires_approval: false,
                },
            ],
            priority: PolicyPriority::Medium,
            active: true,
        });
        
        // Sanctions Specific Policy
        policies.push(RiskPolicy {
            id: "sanctions_exposure".to_string(),
            name: "Sanctions Exposure".to_string(),
            conditions: PolicyConditions {
                risk_level: None,
                risk_score_min: Some(80.0),
                risk_score_max: None,
                categories: vec![RiskCategory::Sanctions],
                age_of_attestation_days: None,
                transaction_volume_threshold: None,
                required_sources: vec![DataSource::TrmLabs, DataSource::Chainalysis],
            },
            actions: vec![
                PolicyAction {
                    action_type: ActionType::EscalateToCompliance,
                    parameters: ActionParameters {
                        escalation_level: Some(1),
                        ..Default::default()
                    },
                    delay_minutes: Some(0),
                    requires_approval: false,
                },
                PolicyAction {
                    action_type: ActionType::SuspendAttestation,
                    parameters: ActionParameters {
                        suspension_duration_days: Some(30),
                        ..Default::default()
                    },
                    delay_minutes: Some(30),
                    requires_approval: true,
                },
            ],
            priority: PolicyPriority::Critical,
            active: true,
        });
        
        // Behavioral Anomaly Policy
        policies.push(RiskPolicy {
            id: "behavioral_anomaly".to_string(),
            name: "Behavioral Anomaly Detection".to_string(),
            conditions: PolicyConditions {
                risk_level: None,
                risk_score_min: Some(60.0),
                risk_score_max: None,
                categories: vec![RiskCategory::BehavioralAnomaly],
                age_of_attestation_days: Some(30),
                transaction_volume_threshold: Some(10000.0),
                required_sources: vec![],
            },
            actions: vec![
                PolicyAction {
                    action_type: ActionType::FlagAttestation,
                    parameters: ActionParameters {
                        flag_reason: Some("Behavioral anomaly detected".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(0),
                    requires_approval: false,
                },
                PolicyAction {
                    action_type: ActionType::RequestAdditionalKyc,
                    parameters: ActionParameters {
                        notification_message: Some("Behavioral anomaly detected - additional verification required".to_string()),
                        ..Default::default()
                    },
                    delay_minutes: Some(240),
                    requires_approval: false,
                },
            ],
            priority: PolicyPriority::Medium,
            active: true,
        });
        
        let escalation_path = EscalationPath {
            levels: vec![
                EscalationLevel {
                    level: 1,
                    risk_threshold: 75.0,
                    required_approvals: 1,
                    approver_roles: vec!["compliance_analyst".to_string()],
                },
                EscalationLevel {
                    level: 2,
                    risk_threshold: 85.0,
                    required_approvals: 2,
                    approver_roles: vec!["senior_compliance".to_string(), "compliance_manager".to_string()],
                },
                EscalationLevel {
                    level: 3,
                    risk_threshold: 95.0,
                    required_approvals: 3,
                    approver_roles: vec!["head_of_compliance".to_string(), "legal_counsel".to_string()],
                },
            ],
            auto_escalate_hours: 24,
        };
        
        Self {
            config,
            policies,
            escalation_path,
        }
    }
    
    pub fn evaluate_policy(
        &self,
        risk_profile: &WalletRiskProfile,
        attestation_age_days: Option<u32>,
        recent_volume: Option<f64>,
    ) -> PolicyEvaluationResult {
        let mut matched_policies = Vec::new();
        let mut recommended_actions = Vec::new();
        
        for policy in &self.policies {
            if !policy.active {
                continue;
            }
            
            if self.matches_policy(policy, risk_profile, attestation_age_days, recent_volume) {
                matched_policies.push(policy.clone());
                recommended_actions.extend(policy.actions.clone());
            }
        }
        
        // Sort actions by priority and delay
        recommended_actions.sort_by(|a, b| {
            let priority_a = self.action_priority(&a.action_type);
            let priority_b = self.action_priority(&b.action_type);
            priority_b.cmp(&priority_a)
                .then(a.delay_minutes.cmp(&b.delay_minutes))
        });
        
        PolicyEvaluationResult {
            wallet_address: risk_profile.wallet_address.clone(),
            risk_score: risk_profile.overall_risk_score,
            risk_level: risk_profile.risk_level.clone(),
            matched_policies,
            recommended_actions,
            evaluation_timestamp: Utc::now(),
            escalation_level: self.determine_escalation_level(risk_profile.overall_risk_score),
        }
    }
    
    fn matches_policy(
        &self,
        policy: &RiskPolicy,
        risk_profile: &WalletRiskProfile,
        attestation_age_days: Option<u32>,
        recent_volume: Option<f64>,
    ) -> bool {
        // Check risk level
        if let Some(required_level) = &policy.conditions.risk_level {
            if &risk_profile.risk_level != required_level {
                return false;
            }
        }
        
        // Check risk score range
        if let Some(min_score) = policy.conditions.risk_score_min {
            if risk_profile.overall_risk_score < min_score {
                return false;
            }
        }
        
        if let Some(max_score) = policy.conditions.risk_score_max {
            if risk_profile.overall_risk_score >= max_score {
                return false;
            }
        }
        
        // Check categories
        if !policy.conditions.categories.is_empty() {
            let profile_categories: std::collections::HashSet<RiskCategory> = risk_profile
                .risk_indicators
                .iter()
                .map(|i| i.category.clone())
                .collect();
            
            let required_categories: std::collections::HashSet<RiskCategory> = policy
                .conditions
                .categories
                .iter()
                .cloned()
                .collect();
            
            if profile_categories.intersection(&required_categories).count() == 0 {
                return false;
            }
        }
        
        // Check attestation age
        if let Some(required_age) = policy.conditions.age_of_attestation_days {
            if let Some(actual_age) = attestation_age_days {
                if actual_age < required_age {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        // Check transaction volume
        if let Some(volume_threshold) = policy.conditions.transaction_volume_threshold {
            if let Some(actual_volume) = recent_volume {
                if actual_volume < volume_threshold {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        // Check required data sources
        if !policy.conditions.required_sources.is_empty() {
            let profile_sources: std::collections::HashSet<DataSource> = risk_profile
                .data_sources
                .iter()
                .cloned()
                .collect();
            
            let required_sources: std::collections::HashSet<DataSource> = policy
                .conditions
                .required_sources
                .iter()
                .cloned()
                .collect();
            
            if !required_sources.is_subset(&profile_sources) {
                return false;
            }
        }
        
        true
    }
    
    fn action_priority(&self, action_type: &ActionType) -> u8 {
        match action_type {
            ActionType::RevokeAttestation => 4,
            ActionType::SuspendAttestation => 3,
            ActionType::EscalateToCompliance => 3,
            ActionType::FlagAttestation => 2,
            ActionType::RequestAdditionalKyc => 2,
            ActionType::NotifyComplianceTeam => 1,
            ActionType::NotifyUser => 1,
            ActionType::NoAction => 0,
        }
    }
    
    fn determine_escalation_level(&self, risk_score: f64) -> Option<u32> {
        for level in &self.escalation_path.levels {
            if risk_score >= level.risk_threshold {
                return Some(level.level);
            }
        }
        None
    }
    
    pub fn get_escalation_details(&self, level: u32) -> Option<&EscalationLevel> {
        self.escalation_path.levels.iter().find(|l| l.level == level)
    }
    
    pub fn add_policy(&mut self, policy: RiskPolicy) {
        self.policies.push(policy);
    }
    
    pub fn update_policy(&mut self, policy_id: &str, updated_policy: RiskPolicy) -> bool {
        if let Some(index) = self.policies.iter().position(|p| p.id == policy_id) {
            self.policies[index] = updated_policy;
            true
        } else {
            false
        }
    }
    
    pub fn deactivate_policy(&mut self, policy_id: &str) -> bool {
        if let Some(policy) = self.policies.iter_mut().find(|p| p.id == policy_id) {
            policy.active = false;
            true
        } else {
            false
        }
    }
}

#[derive(Debug, Clone)]
pub struct PolicyEvaluationResult {
    pub wallet_address: String,
    pub risk_score: f64,
    pub risk_level: RiskLevel,
    pub matched_policies: Vec<RiskPolicy>,
    pub recommended_actions: Vec<PolicyAction>,
    pub evaluation_timestamp: chrono::DateTime<Utc>,
    pub escalation_level: Option<u32>,
}

impl Default for ActionParameters {
    fn default() -> Self {
        Self {
            flag_reason: None,
            suspension_duration_days: None,
            revocation_reason: None,
            notification_message: None,
            escalation_level: None,
        }
    }
}