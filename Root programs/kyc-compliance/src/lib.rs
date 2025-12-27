cat > programs/kyc-compliance/src/lib.rs << 'EOF'
pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod utils;

// Re-export
pub use error::ComplianceError;
pub use instruction::ComplianceInstruction;
pub use state::*;

// Program ID
solana_program::declare_id!("KycCompliance111111111111111111111111111111111");
EOF