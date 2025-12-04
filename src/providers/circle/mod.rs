pub struct CircleProvider {
    config: CircleConfig,
    client: reqwest::Client,
    crypto: CircleCrypto,  // For Verite credential signing
}

impl CircleProvider {
    pub fn new(config: CircleConfig) -> Result<Self, CircleError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()?;
        
        let crypto = CircleCrypto::new(&config)?;
        
        Ok(Self {
            config,
            client,
            crypto,
        })
    }
    
    // Create a Verifiable Credential for a user
    pub async fn issue_verifiable_credential(
        &self,
        user_data: &VeriteUserData,
        credential_type: VeriteCredentialType,
    ) -> Result<VerifiableCredential, CircleError> {
        // Step 1: Create credential subject
        let credential_subject = match credential_type {
            VeriteCredentialType::KycCredential => {
                self.create_kyc_credential_subject(user_data).await?
            }
            VeriteCredentialType::AccreditationCredential => {
                self.create_accreditation_subject(user_data).await?
            }
            VeriteCredentialType::CountryResidenceCredential => {
                self.create_country_residence_subject(user_data).await?
            }
        };
        
        // Step 2: Create Verifiable Credential
        let credential = VerifiableCredential {
            context: vec![
                "https://www.w3.org/2018/credentials/v1".to_string(),
                "https://verite.id/credentials/v1".to_string(),
            ],
            id: format!("urn:uuid:{}", Uuid::new_v4()),
            type_: vec![
                "VerifiableCredential".to_string(),
                credential_type.to_string(),
            ],
            issuer: self.config.get_verite_issuer_did(),
            issuance_date: Utc::now().to_rfc3339(),
            expiration_date: Some(
                (Utc::now() + Duration::days(365)).to_rfc3339()
            ),
            credential_subject,
            proof: None, // Will be added after signing
        };
        
        // Step 3: Sign the credential
        let signed_credential = self.crypto.sign_credential(credential).await?;
        
        Ok(signed_credential)
    }
    
    // Verify a credential from another issuer
    pub async fn verify_credential(
        &self,
        credential: &VerifiableCredential,
    ) -> Result<VerificationResult, CircleError> {
        // Step 1: Verify cryptographic proof
        let is_valid = self.crypto.verify_credential_proof(credential).await?;
        
        if !is_valid {
            return Err(CircleError::InvalidCredential("Proof verification failed".into()));
        }
        
        // Step 2: Check expiration
        if let Some(expiration) = &credential.expiration_date {
            let exp_date = DateTime::parse_from_rfc3339(expiration)
                .map_err(|_| CircleError::InvalidCredential("Invalid expiration date".into()))?;
            
            if exp_date < Utc::now() {
                return Err(CircleError::ExpiredCredential);
            }
        }
        
        // Step 3: Parse credential subject based on type
        let status = self.parse_credential_status(credential).await?;
        
        Ok(VerificationResult {
            user_id: self.extract_user_id(credential)?,
            status,
            details: ProviderDetails::Circle(CircleDetails {
                credential_id: credential.id.clone(),
                issuer: credential.issuer.clone(),
                issuance_date: credential.issuance_date.clone(),
                credential_types: credential.type_.clone(),
            }),
            timestamp: Utc::now().timestamp(),
            risk_score: None, // Circle may provide this in enterprise plans
        })
    }
    
    // Create a presentation request for user
    pub async fn create_presentation_request(
        &self,
        request: PresentationRequest,
    ) -> Result<PresentationRequestResponse, CircleError> {
        let url = format!("{}/verite/presentation-requests", self.config.api_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;
        
        match response.status() {
            reqwest::StatusCode::OK => {
                let pres_req_response: PresentationRequestResponse = response.json().await?;
                Ok(pres_req_response)
            }
            status => {
                let error = response.json::<CircleApiError>().await
                    .unwrap_or_else(|_| CircleApiError::default());
                Err(CircleError::ApiError {
                    status,
                    code: error.code,
                    message: error.message,
                })
            }
        }
    }
    
    // Submit verification to Circle's compliance system
    pub async fn submit_compliance_check(
        &self,
        user_data: ComplianceUserData,
    ) -> Result<ComplianceCheckResult, CircleError> {
        let url = format!("{}/compliance/checks", self.config.api_url);
        
        let payload = CircleCompliancePayload {
            entity_id: self.config.entity_id.clone(),
            user_data,
            check_types: vec![
                "KYC".to_string(),
                "SANCTIONS".to_string(),
                "ADVERSE_MEDIA".to_string(),
            ],
            callback_url: None, // Or your webhook URL
        };
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .json(&payload)
            .send()
            .await?;
        
        self.parse_compliance_response(response).await
    }
}

impl ComplianceProvider for CircleProvider {
    async fn verify_identity(&self, user_data: UserData) -> Result<VerificationResult, ProviderError> {
        // Convert to Circle format
        let circle_user_data = self.convert_to_circle_format(user_data.clone())?;
        
        // Submit compliance check
        let compliance_result = self.submit_compliance_check(circle_user_data).await
            .map_err(|e| ProviderError::NetworkError(e.into()))?;
        
        // Issue Verite credential if approved
        if compliance_result.status == ComplianceStatus::Approved {
            let credential = self.issue_verifiable_credential(
                &user_data.into(),
                VeriteCredentialType::KycCredential,
            ).await
            .map_err(|e| ProviderError::ProviderUnavailable)?;
            
            Ok(VerificationResult {
                user_id: user_data.id,
                status: VerificationStatus::Approved,
                details: ProviderDetails::Circle(CircleDetails {
                    credential_id: credential.id,
                    credential_jwt: self.crypto.credential_to_jwt(&credential).await?,
                    issuer: credential.issuer,
                    issuance_date: credential.issuance_date,
                    credential_types: credential.type_,
                }),
                timestamp: Utc::now().timestamp(),
                risk_score: compliance_result.risk_score,
            })
        } else {
            Ok(VerificationResult {
                user_id: user_data.id,
                status: VerificationStatus::Denied,
                details: ProviderDetails::Circle(CircleDetails::default()),
                timestamp: Utc::now().timestamp(),
                risk_score: compliance_result.risk_score,
            })
        }
    }
    
    async fn handle_webhook(&self, payload: WebhookPayload) -> Result<WebhookResponse, ProviderError> {
        // Circle uses different webhook formats for different events
        let circle_event: CircleWebhookEvent = serde_json::from_str(&payload.body)
            .map_err(|e| ProviderError::ValidationError(e.to_string()))?;
        
        match circle_event.event_type.as_str() {
            "compliance.check.completed" => {
                self.handle_completion_webhook(circle_event).await
            }
            "credential.issued" => {
                self.handle_credential_webhook(circle_event).await
            }
            _ => Err(ProviderError::ValidationError(
                format!("Unknown event type: {}", circle_event.event_type)
            )),
        }
    }
    
    fn get_config(&self) -> &ProviderConfig {
        &self.config.base_config
    }
}