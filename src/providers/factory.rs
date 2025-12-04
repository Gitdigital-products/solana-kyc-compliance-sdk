pub struct ProviderFactory {
    config: Arc<ProviderFactoryConfig>,
    providers: RwLock<HashMap<ProviderType, Arc<dyn ComplianceProvider>>>,
}
 
impl ProviderFactory {
    pub async fn new() -> Result<Self, FactoryError> {
        let config = ProviderFactoryConfig::from_env()?;
        let factory = Self {
            config: Arc::new(config),
            providers: RwLock::new(HashMap::new()),
        };
        
        // Initialize providers based on config
        factory.initialize_providers().await?;
        
        Ok(factory)
    }
    
    async fn initialize_providers(&self) -> Result<(), FactoryError> {
        let mut providers = self.providers.write().await;
        
        // Initialize Sumsub (existing)
        if let Ok(sumsub_config) = SumsubConfig::from_env() {
            let sumsub = SumsubProvider::new(sumsub_config);
            providers.insert(ProviderType::Sumsub, Arc::new(sumsub));
        }
        
        // Initialize Jumio
        if let Ok(jumio_config) = JumioConfig::from_env() {
            let jumio = JumioProvider::new(jumio_config);
            providers.insert(ProviderType::Jumio, Arc::new(jumio));
        }
        
        // Initialize Circle
        if let Ok(circle_config) = CircleConfig::from_env() {
            let circle = CircleProvider::new(circle_config)
                .map_err(|e| FactoryError::ProviderInitError("Circle".into(), e.to_string()))?;
            providers.insert(ProviderType::Circle, Arc::new(circle));
        }
        
        Ok(())
    }
    
    pub async fn get_provider(
        &self,
        provider_type: ProviderType,
    ) -> Result<Arc<dyn ComplianceProvider>, FactoryError> {
        let providers = self.providers.read().await;
        providers.get(&provider_type)
            .cloned()
            .ok_or_else(|| FactoryError::ProviderNotFound(provider_type))
    }
    
    // Smart provider selection based on requirements
    pub async fn select_provider(
        &self,
        requirements: &ProviderRequirements,
    ) -> Result<Arc<dyn ComplianceProvider>, FactoryError> {
        let providers = self.providers.read().await;
        
        for (provider_type, provider) in providers.iter() {
            if self.matches_requirements(provider_type, provider, requirements).await {
                return Ok(provider.clone());
            }
        }
        
        Err(FactoryError::NoMatchingProvider)
    }
    
    async fn matches_requirements(
        &self,
        provider_type: &ProviderType,
        provider: &Arc<dyn ComplianceProvider>,
        requirements: &ProviderRequirements,
    ) -> bool {
        let config = provider.get_config();
        
        // Check country support
        if let Some(country) = &requirements.country {
            if !config.supported_countries.contains(country) {
                return false;
            }
        }
        
        // Check document types
        if let Some(doc_type) = &requirements.document_type {
            if !config.supported_documents.contains(doc_type) {
                return false;
            }
        }
        
        // Check verification speed
        match requirements.speed {
            VerificationSpeed::Instant => provider_type.supports_instant_verification(),
            VerificationSpeed::Standard => true,
        }
    }