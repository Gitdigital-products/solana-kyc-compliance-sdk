// Enhanced provider trait to support different auth flows and data formats
pub trait ComplianceProvider {
    // Core verification method
    async fn verify_identity(&self, user_data: UserData) -> Result<VerificationResult, ProviderError>;
    
    // Provider-specific webhook handling
    async fn handle_webhook(&self, payload: WebhookPayload) -> Result<WebhookResponse, ProviderError>;
    
    // Get provider configuration
    fn get_config(&self) -> &ProviderConfig;
    
    // Optional: For providers supporting accreditation checks
    async fn verify_accreditation(&self, user_data: UserData) -> Result<AccreditationResult, ProviderError>;
    
    // Optional: For providers supporting document verification
    async fn verify_document(&self, document: DocumentData) -> Result<DocumentResult, ProviderError>;
}
 
// Unified result structure
pub struct VerificationResult {
    pub user_id: String,
    pub status: VerificationStatus,
    pub details: ProviderDetails,  // Provider-specific data
    pub timestamp: i64,
    pub risk_score: Option<f32>,  // For providers offering risk scoring
}
 
// Enhanced error handling
pub enum ProviderError {
    NetworkError(reqwest::Error),
    AuthenticationError(String),
    ValidationError(String),
    RateLimitExceeded,
    ProviderUnavailable,
    ConfigurationError(String),