use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub async fn verify_remote(address: &str) -> bool {
    // Call remote verifier API
    let res = reqwest::get(&format!("https://verifier.api/{}", address))
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
    res.contains("verified")
}