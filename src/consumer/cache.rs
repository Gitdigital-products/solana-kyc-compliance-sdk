use lru::LruCache;
use std::sync::Arc;
use tokio::sync::RwLock;
use solana_sdk::pubkey::Pubkey;
 
pub struct AttestationCache {
    cache: Arc<RwLock<LruCache<CacheKey, CacheValue>>>,
    ttl_seconds: u64,
}
 
impl AttestationCache {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(LruCache::new(1000))), // 1000 entry cache
            ttl_seconds: 300, // 5 minutes TTL
        }
    }
    
    pub async fn get(
        &self,
        wallet: &Pubkey,
        requirements: &AccessRequirements,
    ) -> Option<VerificationResult> {
        let key = CacheKey::new(wallet, requirements);
        let cache = self.cache.read().await;
        
        cache.get(&key).and_then(|value| {
            if value.timestamp + self.ttl_seconds > Utc::now().timestamp() as u64 {
                Some(value.result.clone())
            } else {
                None
            }
        })
    }
    
    pub async fn set(
        &self,
        wallet: &Pubkey,
        requirements: &AccessRequirements,
        result: &VerificationResult,
    ) {
        let key = CacheKey::new(wallet, requirements);
        let value = CacheValue {
            result: result.clone(),
            timestamp: Utc::now().timestamp() as u64,
        };
        
        let mut cache = self.cache.write().await;
        cache.put(key, value);
    }
    
    pub async fn invalidate(&self, wallet: &Pubkey) {
        let mut cache = self.cache.write().await;
        
        // Remove all entries for this wallet
        let keys_to_remove: Vec<CacheKey> = cache
            .iter()
            .filter(|(key, _)| key.wallet == *wallet)
            .map(|(key, _)| key.clone())
            .collect();
        
        for key in keys_to_remove {
            cache.pop(&key);
        }
    }