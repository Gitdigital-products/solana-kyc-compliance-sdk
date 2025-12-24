// Advanced access control with time-based and condition-based rules
pub struct DynamicAccessController {
    verifier: Arc<AttestationVerifier>,
    rule_engine: RuleEngine,
    event_log: EventLog,
}
 
impl DynamicAccessController {
    pub async fn check_access(
        &self,
        wallet: &Pubkey,
        resource: &Resource,
        action: &Action,
    ) -> Result<AccessDecision, AccessError> {
        // Step 1: Get current attestations
        let attestations = self.verifier.fetch_wallet_attestations(wallet).await?;
        
        // Step 2: Evaluate rules
        let context = EvaluationContext {
            wallet: *wallet,
            attestations,
            resource: resource.clone(),
            action: action.clone(),
            timestamp: Utc::now().timestamp(),
            metadata: HashMap::new(),
        };
        
        let decision = self.rule_engine.evaluate(&context).await?;
        
        // Step 3: Log decision
        self.event_log.log_decision(&context, &decision).await;
        
        // Step 4: Apply any side effects (like updating usage counters)
        if decision.allowed {
            self.apply_side_effects(&context).await?;
        }
        
        Ok(decision)
    }
    
    // Time-based access (e.g., only allow purchases during certain hours)
    pub async fn check_time_based_access(
        &self,
        wallet: &Pubkey,
        window: TimeWindow,
    ) -> Result<bool, AccessError> {
        let now = Utc::now();
        let attestations = self.verifier.fetch_wallet_attestations(wallet).await?;
        
        // Check if any attestation allows access in this time window
        for attestation in attestations {
            if let Some(time_rules) = &attestation.metadata.time_rules {
                if time_rules.is_allowed(&now) {
                    return Ok(true);
                }
            }
        }
        
        Ok(false)
    }
    
    // Usage-based access (e.g., limit to N purchases per day)
    pub async fn check_usage_based_access(
        &self,
        wallet: &Pubkey,
        resource: &Resource,
        max_uses: u32,
        period_hours: u32,
    ) -> Result<bool, AccessError> {
        let usage = self.event_log.get_usage_count(
            wallet,
            resource,
            period_hours,
        ).await?;
        
        Ok(usage < max_uses)
    }
    
    // Role-based access control (RBAC)
    pub async fn check_role_access(
        &self,
        wallet: &Pubkey,
        required_roles: &[UserRole],
    ) -> Result<bool, AccessError> {
        let attestations = self.verifier.fetch_wallet_attestations(wallet).await?;
        
        for attestation in attestations {
            if let Some(roles) = attestation.metadata.get("roles") {
                let user_roles: Vec<UserRole> = serde_json::from_str(roles)
                    .unwrap_or_default();
                
                if required_roles.iter().any(|r| user_roles.contains(r)) {
                    return Ok(true);
                }
            }
        }
        
        Ok(false)
    }
}
 
#[derive(Debug, Clone)]
pub struct Resource {
    pub id: String,
    pub resource_type: ResourceType,
    pub owner: Option<Pubkey>,
    pub metadata: HashMap<String, String>,
}
 
#[derive(Debug, Clone)]
pub enum ResourceType {
    NftCollection,
    DeFiPool,
    TokenSale,
    Content,
    ApiEndpoint,
}
 
#[derive(Debug, Clone)]
pub struct Action {
    pub action_type: ActionType,
    pub parameters: HashMap<String, Value>,
}
 
#[derive(Debug, Clone)]
pub enum ActionType {
    Purchase,
    Mint,
    Withdraw,
    Transfer,
    View,
    Modify,
}
 
#[derive(Debug)]
pub struct AccessDecision {
    pub allowed: bool,
    pub reason: Option<String>,
    pub constraints: Vec<AccessConstraint>,
    pub valid_until: Option<i64>,
}
 
#[derive(Debug)]
pub enum AccessConstraint {
    MaxAmount(u64),
    TimeWindow(TimeWindow),
    UsageLimit(u32, u32), // max uses, period hours
    MustHoldAsset(Pubkey, u64), // token mint, min amount