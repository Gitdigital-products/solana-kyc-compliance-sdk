// W3C Verifiable Credential structures
#[derive(Debug, Serialize, Deserialize)]
pub struct VerifiableCredential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub type_: Vec<String>,
    pub issuer: String,
    pub issuance_date: String,
    pub expiration_date: Option<String>,
    pub credential_subject: serde_json::Value,
    pub proof: Option<Proof>,
}
 
#[derive(Debug, Serialize, Deserialize)]
pub struct Proof {
    #[serde(rename = "type")]
    pub type_: String,
    pub created: String,
    pub verification_method: String,
    pub proof_purpose: String,
    pub jws: String,
}
 
// Circle-specific types
#[derive(Debug, Serialize)]
pub struct CircleCompliancePayload {
    pub entity_id: String,
    pub user_data: ComplianceUserData,
    pub check_types: Vec<String>,
    pub callback_url: Option<String>,
}
 
#[derive(Debug, Deserialize)]
pub struct CircleComplianceResult {
    pub check_id: String,
    pub status: ComplianceStatus,
    pub risk_score: Option<f32>,
    pub reasons: Vec<String>,
    pub completed_at: String,
}
 
pub enum VeriteCredentialType {
    KycCredential,
    AccreditationCredential,
    CountryResidenceCredential,
}
 
impl ToString for VeriteCredentialType {
    fn to_string(&self) -> String {
        match self {
            Self::KycCredential => "KycCredential".to_string(),
            Self::AccreditationCredential => "AccreditationCredential".to_string(),
            Self::CountryResidenceCredential => "CountryResidenceCredential".to_string(),
        }
    }