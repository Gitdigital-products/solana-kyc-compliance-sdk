#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize SDK with Jumio
    let sdk = KycSdk::builder()
        .with_provider(ProviderType::Jumio)
        .with_logging(LogLevel::Debug)
        .build()
        .await?;
    
    // Create user data
    let user_data = UserData {
        id: "user_123".to_string(),
        email: "user@example.com".to_string(),
        first_name: "John".to_string(),
        last_name: "Doe".to_string(),
        country: "US".to_string(),
        date_of_birth: "1990-01-01".to_string(),
    };
    
    // Initiate verification
    let verification = sdk.initiate_verification(
        ProviderType::Jumio,
        user_data,
        VerificationOptions {
            document_type: Some("PASSPORT".to_string()),
            enable_instant_verification: false,
            additional_data: None,
        },
    ).await?;
    
    println!("Verification initiated!");
    println!("Redirect URL: {}", verification.redirect_url);
    println!("Scan Reference: {}", verification.scan_reference);
    
    // Webhook handler example
    let webhook_server = WebhookServer::new(sdk.clone());
    webhook_server.start("0.0.0.0:8080").await?;
    
    Ok(())