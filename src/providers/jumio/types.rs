#[derive(Debug, Serialize)]
pub struct JumioUserData {
    pub internal_reference: String,  // Your internal user ID
    pub user_reference: String,      // User-visible reference
    pub locale: String,              // en-US, fr-FR, etc.
    pub country: Option<String>,     // Preset country for ID
    pub document_type: Option<String>, // PASSPORT, DRIVER_LICENSE, ID_CARD
}
 
#[derive(Debug, Deserialize)]
pub struct JumioInitiationResponse {
    pub scan_reference: String,
    pub transaction_reference: String,
    pub redirect_url: String,
    pub timestamp: String,
    pub workflow_id: String,
}
 
#[derive(Debug, Deserialize)]
pub struct JumioCallbackData {
    #[serde(rename = "callbackType")]
    pub callback_type: String,
    #[serde(rename = "scanReference")]
    pub scan_reference: String,
    #[serde(rename = "verificationStatus")]
    pub verification_status: String,
    #[serde(rename = "idCheckStatus")]
    pub id_check_status: Option<String>,
    #[serde(rename = "identityVerification")]
    pub identity_verification: Option<JumioIdentityVerification>,
    #[serde(rename = "document")]
    pub document: Option<JumioDocument>,
    #[serde(rename = "transactionDate")]
    pub transaction_date: String,
    #[serde(rename = "customerInternalReference")]
    pub customer_internal_reference: String,
}
 
#[derive(Debug, Deserialize)]
pub struct JumioIdentityVerification {
    pub similarity: String,
    pub validity: bool,
    pub reason: Option<String>,