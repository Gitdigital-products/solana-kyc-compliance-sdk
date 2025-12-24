use crate::risk_engine::{
    config::RiskEngineConfig,
    providers::{TrmClient, ChainalysisClient, RiskDataAggregator},
    scoring::{RiskScoringModel, BehavioralAnomalyDetector},
    policy::{PolicyManager, ActionExecutor},
    types::*,
};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{interval, Duration};
use tracing::{info, warn, error};
use std::collections::{HashMap, HashSet};
 
#[derive(Debug, Clone)]
pub struct RiskMonitoringService {
    config: Arc<RiskEngineConfig>,
    rpc_client: Arc<RpcClient>,
    aggregator: Arc<RiskDataAggregator>,
    scoring_model: Arc<RiskScoringModel>,
    anomaly_detector: Arc<Mutex<BehavioralAnomalyDetector>>,
    policy_manager: Arc<PolicyManager>,
    action_executor: Arc<ActionExecutor>,
    
    // State management
    active_wallets: Arc<RwLock<HashSet<String>>>,
    wallet_attestations: Arc<RwLock<HashMap<String, Pubkey>>>,
    risk_cache: Arc<RwLock<HashMap<String, (WalletRiskProfile, chrono::DateTime<Utc>)>>>,
    
    // Service state
    is_running: Arc<Mutex<bool>>,
}
 
impl RiskMonitoringService {
    pub async fn new(config: RiskEngineConfig) -> Result<Self, String> {
        let config = Arc::new(config);
        
        // Initialize RPC client
        let rpc_client = Arc::new(RpcClient::new(config.rpc_url.clone()));
        
        // Initialize providers
        let trm_config = Arc::new(config.trm.clone());
        let chainalysis_config = Arc::new(config.chainalysis.clone());
        
        let trm_client = if config.trm.enabled {
            Some(Arc::new(TrmClient::new(trm_config)))
        } else {
            None
        };
        
        let chainalysis_client = if config.chainalysis.kyt_enabled {
            ChainalysisClient::new(chainalysis_config)
                .map(|c| Some(Arc::new(c)))
                .map_err(|e| e.to_string())?
        } else {
            None
        };
        
        // Initialize aggregator
        let aggregator = Arc::new(RiskDataAggregator::new(
            trm_client,
            chainalysis_client,
            config.clone(),
        ));
        
        // Initialize scoring model
        let scoring_model = Arc::new(RiskScoringModel::new(config.thresholds.clone()));
        
        // Initialize anomaly detector
        let anomaly_detector = Arc::new(Mutex::new(BehavioralAnomalyDetector::new()));
        
        // Initialize policy manager
        let policy_manager = Arc::new(PolicyManager::new(config.clone()));
        
        // Initialize action executor
        let risk_engine_keypair = Keypair::new(); // In production, load from secure storage
        let action_executor = ActionExecutor::new(
            rpc_client.clone(),
            config.clone(),
            risk_engine_keypair,
        ).map_err(|e| e.to_string())?;
        
        Ok(Self {
            config,
            rpc_client,
            aggregator,
            scoring_model,
            anomaly_detector,
            policy_manager,
            action_executor,
            active_wallets: Arc::new(RwLock::new(HashSet::new())),
            wallet_attestations: Arc::new(RwLock::new(HashMap::new())),
            risk_cache: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(Mutex::new(false)),
        })
    }
    
    pub async fn start(&self) {
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            warn!("Risk monitoring service is already running");
            return;
        }
        
        *is_running = true;
        drop(is_running);
        
        info!("Starting risk monitoring service");
        
        // Start monitoring loop
        let service = self.clone();
        tokio::spawn(async move {
            service.monitoring_loop().await;
        });
        
        // Start anomaly detection loop
        let service = self.clone();
        tokio::spawn(async move {
            service.anomaly_detection_loop().await;
        });
        
        info!("Risk monitoring service started successfully");
    }
    
    pub async fn stop(&self) {
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
        info!("Risk monitoring service stopped");
    }
    
    async fn monitoring_loop(&self) {
        let mut interval = interval(Duration::from_secs(
            self.config.monitoring.poll_interval_minutes * 60
        ));
        
        while *self.is_running.lock().await {
            interval.tick().await;
            
            match self.run_monitoring_cycle().await {
                Ok(summary) => {
                    info!("Monitoring cycle completed: {}", summary);
                }
                Err(e) => {
                    error!("Monitoring cycle failed: {}", e);
                }
            }
        }
    }
    
    async fn run_monitoring_cycle(&self) -> Result<MonitoringCycleSummary, String> {
        let start_time = chrono::Utc::now();
        
        // Get active wallets
        let active_wallets = self.active_wallets.read().await;
        let wallet_attestations = self.wallet_attestations.read().await;
        
        let wallets_to_check: Vec<(String, Pubkey)> = active_wallets.iter()
            .filter_map(|wallet| {
                wallet_attestations.get(wallet)
                    .map(|attestation| (wallet.clone(), *attestation))
            })
            .collect();
        
        drop(active_wallets);
        drop(wallet_attestations);
        
        let total_wallets = wallets_to_check.len();
        info!("Starting monitoring cycle for {} wallets", total_wallets);
        
        let mut processed = 0;
        let mut high_risk = 0;
        let mut actions_taken = 0;
        let mut errors = 0;
        
        // Process wallets in batches
        for chunk in wallets_to_check.chunks(self.config.monitoring.batch_size) {
            let mut batch_results = Vec::new();
            
            for (wallet_address, attestation_key) in chunk {
                match self.process_wallet(wallet_address, attestation_key).await {
                    Ok(result) => {
                        processed += 1;
                        
                        if result.risk_level.requires_action() {
                            high_risk += 1;
                        }
                        
                        if result.action_taken {
                            actions_taken += 1;
                        }
                        
                        batch_results.push(result);
                    }
                    Err(e) => {
                        error!("Failed to process wallet {}: {}", wallet_address, e);
                        errors += 1;
                    }
                }
            }
            
            // Small delay between batches to avoid rate limiting
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
        
        let duration = chrono::Utc::now() - start_time;
        
        Ok(MonitoringCycleSummary {
            cycle_start: start_time,
            cycle_end: chrono::Utc::now(),
            total_wallets,
            processed,
            high_risk,
            actions_taken,
            errors,
            duration_seconds: duration.num_seconds(),
        })
    }
    
    async fn process_wallet(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
    ) -> Result<WalletProcessingResult, String> {
        // Check cache first
        if let Some((cached_profile, cached_time)) = self.risk_cache.read().await.get(wallet_address) {
            let cache_age = chrono::Utc::now() - *cached_time;
            if cache_age.num_minutes() < self.config.monitoring.cache_ttl_minutes as i64 {
                info!("Using cached risk profile for {}", wallet_address);
                return self.evaluate_cached_profile(
                    wallet_address,
                    attestation_key,
                    cached_profile.clone(),
                ).await;
            }
        }
        
        // Fetch fresh risk data
        let risk_profile = self.aggregator.aggregate_wallet_risk(wallet_address).await
            .map_err(|e| format!("Failed to aggregate risk data: {}", e))?;
        
        // Update cache
        let mut cache = self.risk_cache.write().await;
        cache.insert(wallet_address.to_string(), (risk_profile.clone(), chrono::Utc::now()));
        
        // Evaluate policy
        self.evaluate_and_execute(wallet_address, attestation_key, &risk_profile).await
    }
    
    async fn evaluate_cached_profile(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
        risk_profile: WalletRiskProfile,
    ) -> Result<WalletProcessingResult, String> {
        // Even with cached profile, we still need to check if action is required
        self.evaluate_and_execute(wallet_address, attestation_key, &risk_profile).await
    }
    
    async fn evaluate_and_execute(
        &self,
        wallet_address: &str,
        attestation_key: &Pubkey,
        risk_profile: &WalletRiskProfile,
    ) -> Result<WalletProcessingResult, String> {
        // Evaluate policy
        let policy_evaluation = self.policy_manager.evaluate_policy(
            risk_profile,
            None, // attestation_age_days - would need to fetch from chain
            None, // recent_volume - would need to calculate
        );
        
        let mut action_taken = false;
        let mut executed_actions = Vec::new();
        
        // Execute recommended actions
        for action in &policy_evaluation.recommended_actions {
            if !action.requires_approval {
                match self.action_executor.execute_action(
                    action,
                    wallet_address,
                    attestation_key,
                    risk_profile,
                ).await {
                    Ok(result) => {
                        if result.success {
                            action_taken = true;
                            executed_actions.push(result);
                        }
                    }
                    Err(e) => {
                        warn!("Failed to execute action for {}: {}", wallet_address, e);
                    }
                }
            }
        }
        
        Ok(WalletProcessingResult {
            wallet_address: wallet_address.to_string(),
            risk_profile: risk_profile.clone(),
            policy_evaluation,
            action_taken,
            executed_actions,
            processed_at: chrono::Utc::now(),
        })
    }
    
    async fn anomaly_detection_loop(&self) {
        let mut interval = interval(Duration::from_secs(300)); // Every 5 minutes
        
        while *self.is_running.lock().await {
            interval.tick().await;
            
            // This would typically listen to transaction stream
            // For now, it's a placeholder for anomaly detection
            self.check_for_anomalies().await;
        }
    }
    
    async fn check_for_anomalies(&self) {
        // In a real implementation, this would:
        // 1. Subscribe to transaction stream
        // 2. Analyze transactions in real-time
        // 3. Update anomaly detector
        // 4. Trigger actions if anomalies are detected
        info!("Anomaly detection check (placeholder)");
    }
    
    pub async fn register_wallet(
        &self,
        wallet_address: String,
        attestation_key: Pubkey,
    ) -> Result<(), String> {
        let mut active_wallets = self.active_wallets.write().await;
        let mut wallet_attestations = self.wallet_attestations.write().await;
        
        active_wallets.insert(wallet_address.clone());
        wallet_attestations.insert(wallet_address, attestation_key);
        
        info!("Registered wallet for risk monitoring");
        Ok(())
    }
    
    pub async fn unregister_wallet(
        &self,
        wallet_address: &str,
    ) -> Result<(), String> {
        let mut active_wallets = self.active_wallets.write().await;
        let mut wallet_attestations = self.wallet_attestations.write().await;
        let mut risk_cache = self.risk_cache.write().await;
        
        active_wallets.remove(wallet_address);
        wallet_attestations.remove(wallet_address);
        risk_cache.remove(wallet_address);
        
        info!("Unregistered wallet from risk monitoring");
        Ok(())
    }
    
    pub async fn get_wallet_risk(
        &self,
        wallet_address: &str,
    ) -> Result<Option<WalletRiskProfile>, String> {
        let cache = self.risk_cache.read().await;
        
        if let Some((profile, _)) = cache.get(wallet_address) {
            Ok(Some(profile.clone()))
        } else {
            Ok(None)
        }
    }
    
    pub async fn force_risk_check(
        &self,
        wallet_address: &str,
    ) -> Result<WalletRiskProfile, String> {
        // Clear cache for this wallet
        self.risk_cache.write().await.remove(wallet_address);
        
        // Check if wallet is registered
        let attestation_key = self.wallet_attestations.read().await
            .get(wallet_address)
            .cloned()
            .ok_or_else(|| format!("Wallet {} not registered", wallet_address))?;
        
        // Process wallet
        self.process_wallet(wallet_address, &attestation_key).await
            .map(|result| result.risk_profile)
    }
}
 
#[derive(Debug, Clone)]
pub struct MonitoringCycleSummary {
    pub cycle_start: chrono::DateTime<Utc>,
    pub cycle_end: chrono::DateTime<Utc>,
    pub total_wallets: usize,
    pub processed: usize,
    pub high_risk: usize,
    pub actions_taken: usize,
    pub errors: usize,
    pub duration_seconds: i64,
}
 
impl std::fmt::Display for MonitoringCycleSummary {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Processed {}/{} wallets, {} high risk, {} actions, {} errors in {}s",
            self.processed,
            self.total_wallets,
            self.high_risk,
            self.actions_taken,
            self.errors,
            self.duration_seconds
        )
    }
}
 
#[derive(Debug, Clone)]
pub struct WalletProcessingResult {
    pub wallet_address: String,
    pub risk_profile: WalletRiskProfile,
    pub policy_evaluation: PolicyEvaluationResult,
    pub action_taken: bool,
    pub executed_actions: Vec<ActionExecutionResult>,
    pub processed_at: chrono::DateTime<Utc>,
}
 
impl Clone for RiskMonitoringService {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            rpc_client: self.rpc_client.clone(),
            aggregator: self.aggregator.clone(),
            scoring_model: self.scoring_model.clone(),
            anomaly_detector: self.anomaly_detector.clone(),
            policy_manager: self.policy_manager.clone(),
            action_executor: self.action_executor.clone(),
            active_wallets: self.active_wallets.clone(),
            wallet_attestations: self.wallet_attestations.clone(),
            risk_cache: self.risk_cache.clone(),
            is_running: self.is_running.clone(),
        }
    }