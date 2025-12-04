pub struct CircleConfig {
    pub api_key: String,
    pub api_url: String,
    pub entity_id: String,          // Your entity ID in Circle's system
    pub verite_issuer_id: String,   // Your issuer DID
    pub wallet_id: String,          // Circle wallet for transaction fees
    pub environment: CircleEnvironment,
}
 
pub enum CircleEnvironment {
    Sandbox,
    Production,
}
 
impl CircleConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            api_key: std::env::var("CIRCLE_API_KEY")?,
            api_url: std::env::var("CIRCLE_API_URL")
                .unwrap_or_else(|_| "https://api.circle.com/v1".to_string()),
            entity_id: std::env::var("CIRCLE_ENTITY_ID")?,
            verite_issuer_id: std::env::var("CIRCLE_VERITE_ISSUER_ID")?,
            wallet_id: std::env::var("CIRCLE_WALLET_ID")?,
            environment: match std::env::var("CIRCLE_ENV").as_deref() {
                Ok("PRODUCTION") => CircleEnvironment::Production,
                _ => CircleEnvironment::Sandbox,
            },
        })
    }
    
    pub fn get_verite_issuer_did(&self) -> String {
        format!("did:circle:{}", self.verite_issuer_id)
    }