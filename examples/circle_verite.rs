#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize with Circle
    let sdk = KycSdk::builder()
        .with_provider(ProviderType::Circle)
        .with_verite_config(VeriteConfig {
            issuer_did: "did:circle:your-issuer-id".to_string(),
            credential_types: vec![
                "KycCredential".to_string(),
                "AccreditationCredential".to_string(),
            ],
        })
        .build()
        .await?;
    
    // Issue a Verifiable Credential
    let user_data = VeriteUserData {
        did: "did:ethr:0x1234...".to_string(),
        kyc_level: "plus".to_string(),
        accreditation_status: true,
        country_of_residence: "US".to_string(),
    };
    
    let credential = sdk.issue_verifiable_credential(
        user_data,
        VeriteCredentialType::KycCredential,
    ).await?;
    
    println!("Issued Verifiable Credential:");
    println!("ID: {}", credential.id);
    println!("Issuer: {}", credential.issuer);
    println!("Expires: {:?}", credential.expiration_date);
    
    // Store credential on Solana using SAS
    let attestation = sdk.create_sas_attestation(
        credential,
        AttestationOptions {
            validity_days: 365,
            revocable: true,
            fee_payer: Some("your_wallet".to_string()),
        },
    ).await?;
    
    println!("SAS Attestation created: {:?}", attestation.signature);
    
    Ok(())