use solana_client::rpc_client::RpcClient;
use tokio::{task, time};
use std::time::Duration;
use kyc_verifier::run_verification_job;

#[tokio::main]
async fn main() {
    let rpc = RpcClient::new("https://api.mainnet-beta.solana.com");
    loop {
        task::spawn(async {
            if let Err(err) = run_verification_job(&rpc).await {
                eprintln!("Verification job failed: {:?}", err);
            }
        });
        time::sleep(Duration::from_secs(10)).await; // poll queue
    }
}