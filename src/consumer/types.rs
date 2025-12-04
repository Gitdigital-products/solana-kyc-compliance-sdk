#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessRequirements {
    pub kyc_level: Option<KycLevel>,
    pub provider_whitelist: Option<Vec<ProviderType>>,
    pub country_blacklist: Option<Vec<String>>,
    pub country_whitelist: Option<Vec<String>>,
    pub min_age: Option<u8>,
    pub accreditation_required: bool,
    pub max_attestation_age_days: Option<u32>, // Max days since issuance
    pub custom_validator: Option<CustomValidator>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KycLevel {
    Lite,      // Basic identity verification
    Standard,  // Document verification
    Plus,      // Enhanced due diligence
    Corporate, // Business verification
}
 
#[derive(Debug, Clone)]
pub struct CustomValidator {
    pub validator_fn: Arc<dyn Fn(&AttestationDetails) -> bool + Send + Sync>,
}
 
#[derive(Debug, Serialize)]
pub struct VerificationResult {
    pub wallet: Pubkey,
    pub allowed: bool,
    pub reason: Option<String>,
    pub attestation_used: Option<AttestationDetails>,
    pub missing_requirements: Vec<String>,
    pub verification_timestamp: i64,
}
 
#[derive(Debug, Clone)]
pub struct AttestationDetails {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub attestation_type: String,
    pub level: KycLevel,
    pub issuance_date: i64,
    pub expiration_date: Option<i64>,
    pub revoked: bool,
    pub provider: ProviderType,
    pub metadata: HashMap<String, String>,