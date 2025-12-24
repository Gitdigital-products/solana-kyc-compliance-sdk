import React, { useEffect, useState } from "react";
import ConnectButton from "../components/ConnectButton";
import KycStatus from "../components/KycStatus";
 
export default function Home() {
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    // quick-local: window.solana for phantom may exist in real env
    if ((window as any).solana && (window as any).solana.isPhantom) {
      (window as any).solana.connect({ onlyIfTrusted: true }).then((res: any) => {
        setWallet(res.publicKey.toString());
      }).catch(()=>{});
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Solana KYC Compliance SDK — Demo</h1>
        <p className="text-slate-600 mb-6">Issue attestations, check status, and demo AML proofs.</p>
        <ConnectButton onConnect={(pk)=>setWallet(pk)} />
      </header>

      <main className="max-w-4xl mx-auto mt-8">
        <KycStatus wallet={wallet} />
      </main>
    </div>
  );
}