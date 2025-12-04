// Webhook server to handle attestation updates in real-time
pub struct AttestationWebhookServer {
    verifier: Arc<AttestationVerifier>,
    subscribers: Arc<RwLock<HashMap<Pubkey, Vec<WebhookSubscriber>>>>,
}
 
impl AttestationWebhookServer {
    pub async fn handle_attestation_update(
        &self,
        update: AttestationUpdate,
    ) -> Result<(), WebhookError> {
        match update.update_type {
            AttestationUpdateType::Issued => {
                self.notify_subscribers(&update.subject, &update).await?;
                self.update_cache(&update.subject).await?;
            }
            AttestationUpdateType::Revoked => {
                self.notify_subscribers(&update.subject, &update).await?;
                self.invalidate_cache(&update.subject).await?;
            }
            AttestationUpdateType::Expired => {
                self.invalidate_cache(&update.subject).await?;
            }
        }
        
        Ok(())
    }
    
    pub async fn subscribe(
        &self,
        wallet: Pubkey,
        callback_url: String,
        events: Vec<WebhookEventType>,
    ) -> Result<String, WebhookError> {
        let subscriber = WebhookSubscriber {
            id: Uuid::new_v4().to_string(),
            callback_url,
            events,
            secret: generate_secret(),
            created_at: Utc::now(),
        };
        
        let mut subscribers = self.subscribers.write().await;
        let wallet_subscribers = subscribers.entry(wallet).or_insert_with(Vec::new);
        wallet_subscribers.push(subscriber.clone());
        
        Ok(subscriber.id)
    }
    
    async fn notify_subscribers(
        &self,
        wallet: &Pubkey,
        update: &AttestationUpdate,
    ) -> Result<(), WebhookError> {
        let subscribers = self.subscribers.read().await;
        
        if let Some(wallet_subscribers) = subscribers.get(wallet) {
            for subscriber in wallet_subscribers {
                if subscriber.events.contains(&update.update_type.into()) {
                    self.send_webhook(subscriber, update).await?;
                }
            }
        }
        
        Ok(())
    }