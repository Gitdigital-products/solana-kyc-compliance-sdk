pub struct JumioConfig {
    pub api_token: String,
    pub api_secret: String,
    pub api_url: String,
    pub callback_url: String,
    pub workflow_id: String,  // Jumio workflow for KYC
    pub document_workflow_id: Option<String>, // Optional document verification workflow
    pub region: JumioRegion,  // US, EU, or APAC
}
 
pub enum JumioRegion {
    Us,  // api.america.jumio.com
    Eu,  // api.emea.jumio.com
    Apac, // api.apac.jumio.com
}
 
impl JumioConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            api_token: std::env::var("JUMIO_API_TOKEN")?,
            api_secret: std::env::var("JUMIO_API_SECRET")?,
            api_url: std::env::var("JUMIO_API_URL")
                .unwrap_or_else(|_| "https://api.america.jumio.com".to_string()),
            callback_url: std::env::var("JUMIO_CALLBACK_URL")?,
            workflow_id: std::env::var("JUMIO_WORKFLOW_ID")?,
            document_workflow_id: std::env::var("JUMIO_DOCUMENT_WORKFLOW_ID").ok(),
            region: match std::env::var("JUMIO_REGION").as_deref() {
                Ok("EU") => JumioRegion::Eu,
                Ok("APAC") => JumioRegion::Apac,
                _ => JumioRegion::Us,
            },
        })
    }