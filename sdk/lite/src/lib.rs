#[cfg(target_arch = "wasm32")]
pub fn verify_offline(input: &KycData) -> bool {
    // Minimal local verification logic (for cached/offline use)
    input.verified && input.expiry_timestamp > js_sys::Date::now() as i64
}