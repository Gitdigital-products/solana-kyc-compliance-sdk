import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { KycCompliance } from '../target/types/kyc_compliance';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.KycCompliance as Program<KycCompliance>;
    
    console.log('Deploying KYC Compliance Program...');
    
    // Initialize program state
    const [registryPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('compliance-registry')],
        program.programId
    );
    
    const [policyPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('policy-config')],
        program.programId
    );
    
    const [adminPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('admin-authority')],
        program.programId
    );
    
    console.log('Registry PDA:', registryPda.toString());
    console.log('Policy PDA:', policyPda.toString());
    console.log('Admin PDA:', adminPda.toString());
    
    // Initialize registry
    try {
        await program.methods
            .initializeRegistry()
            .accounts({
                admin: provider.wallet.publicKey,
                registryAccount: registryPda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('Registry initialized successfully');
    } catch (error) {
        console.log('Registry may already be initialized:', error);
    }
    
    // Initialize policy
    try {
        await program.methods
            .initializePolicy()
            .accounts({
                admin: provider.wallet.publicKey,
                policyAccount: policyPda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('Policy initialized successfully');
    } catch (error) {
        console.log('Policy may already be initialized:', error);
    }
    
    // Write program ID to file
    const programId = program.programId.toString();
    const configDir = path.join(__dirname, '..', 'config');
    
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(configDir, 'program-id.json'),
        JSON.stringify({ programId }, null, 2)
    );
    
    console.log('Deployment completed!');
    console.log('Program ID:', programId);
}

main().catch(console.error);