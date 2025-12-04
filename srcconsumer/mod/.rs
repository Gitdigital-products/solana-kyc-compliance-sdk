// Main consumer-facing verification module
pub struct AttestationVerifier {
    rpc_client: Arc<RpcClient>,
    program_id: Pubkey,
    sas_registry: Pubkey,
    cache: AttestationCache,
}
 
impl AttestationVerifier {
    pub fn new(cluster: Cluster) -> Self {
        let rpc_url = match cluster {
            Cluster::Devnet => "https://api.devnet.solana.com",
            Cluster::Mainnet => "https://api.mainnet-beta.solana.com",
            Cluster::Testnet => "https://api.testnet.solana.com",
        };
        
        Self {
            rpc_client: Arc::new(RpcClient::new(rpc_url.to_string())),
            program_id: sas_program_id(), // Your program ID
            sas_registry: sas_registry_address(),
            cache: AttestationCache::new(),
        }
    }
    
    // Core verification function
    pub async fn verify_wallet_access(
        &self,
        wallet: &Pubkey,
        requirements: &AccessRequirements,
    ) -> Result<VerificationResult, VerificationError> {
        // Step 1: Check cache first
        if let Some(cached) = self.cache.get(wallet, requirements).await {
            return Ok(cached);
        }
        
        // Step 2: Fetch attestations from SAS
        let attestations = self.fetch_wallet_attestations(wallet).await?;
        
        // Step 3: Filter and validate based on requirements
        let result = self.validate_against_requirements(
            wallet,
            &attestations,
            requirements,
        ).await?;
        
        // Step 4: Cache the result
        self.cache.set(wallet, requirements, &result).await;
        
        Ok(result)
    }
    
    // Check if wallet has ANY valid KYC attestation
    pub async fn has_valid_kyc(
        &self,
        wallet: &Pubkey,
        min_level: Option<KycLevel>,
    ) -> Result<bool, VerificationError> {
        let attestations = self.fetch_wallet_attestations(wallet).await?;
        
        for attestation in attestations {
            if self.is_valid_kyc_attestation(&attestation, min_level).await? {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
    
    // Get specific attestation details
    pub async fn get_attestation_details(
        &self,
        attestation_key: &Pubkey,
    ) -> Result<AttestationDetails, VerificationError> {
        let account_data = self.rpc_client
            .get_account_data(attestation_key)
            .await
            .map_err(|_| VerificationError::AttestationNotFound)?;
        
        let attestation = Attestation::try_from_slice(&account_data)?;
        
        // Check if revoked
        let is_revoked = self.check_revocation_status(attestation_key).await?;
        
        Ok(AttestationDetails {
            issuer: attestation.issuer,
            subject: attestation.subject,
            attestation_type: attestation.attestation_type,
            level: attestation.level,
            issuance_date: attestation.issuance_timestamp,
            expiration_date: attestation.expiration_timestamp,
            revoked: is_revoked,
            provider: attestation.provider,
            metadata: attestation.metadata,
        })
    }
    
    // Bulk verification for multiple wallets (useful for token launches)
    pub async fn batch_verify(
        &self,
        wallets: &[Pubkey],
        requirements: &AccessRequirements,
    ) -> Result<HashMap<Pubkey, VerificationResult>, VerificationError> {
        let mut results = HashMap::new();
        
        // Process in parallel batches of 10
        for chunk in wallets.chunks(10) {
            let futures = chunk.iter().map(|wallet| {
                self.verify_wallet_access(wallet, requirements)
            });
            
            let chunk_results = futures::future::join_all(futures).await;
            
            for (wallet, result) in chunk.iter().zip(chunk_results) {
                if let Ok(verification) = result {
                    results.insert(*wallet, verification);
                }
            }
        }
        
        Ok(results)
    }