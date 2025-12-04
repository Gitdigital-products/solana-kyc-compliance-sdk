use solana_kyc_compliance_sdk::risk_engine::{RiskEngineConfig, RiskMonitoringService};
use tracing_subscriber::{EnvFilter, fmt};
use tracing::{info, error};
use tokio::signal;
use std::process;
 
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(false)
        .init();
    
    info!("Starting Solana KYC Compliance SDK Risk Engine");
    
    // Load configuration
    let config = RiskEngineConfig::from_env()
        .map_err(|e| {
            error!("Failed to load configuration: {}", e);
            process::exit(1);
        })?;
    
    info!("Configuration loaded successfully");
    
    // Initialize risk monitoring service
    let service = RiskMonitoringService::new(config)
        .await
        .map_err(|e| {
            error!("Failed to initialize risk monitoring service: {}", e);
            process::exit(1);
        })?;
    
    info!("Risk monitoring service initialized");
    
    // Start the service
    service.start().await;
    info!("Risk monitoring service started");
    
    // Wait for shutdown signal
    tokio::select! {
        _ = signal::ctrl_c() => {
            info!("Received shutdown signal");
        }
    }
    
    // Stop the service gracefully
    service.stop().await;
    info!("Risk monitoring service stopped");
    
    Ok(())