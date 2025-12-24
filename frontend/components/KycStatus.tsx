import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { attestationPda, REGISTRY_PROGRAM_ID } from "../utils/anchorClient";
 
export default function KycStatus({ wallet }: { wallet: string | null }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(()=> {
    if (!wallet) return;
    (async ()=> {
      try {
        const pub = new PublicKey(wallet);
        const pda = attestationPda(pub);
        // Attempt to fetch account info via rpc
        const res = await fetch(`/api/fetchAttestation?pda=${pda.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.exists ? "KYC ✅" : "No Attestation");
        } else {
          setStatus("Unknown");
        }
      } catch (e) {
        console.error(e);
        setStatus("Error");
      }
    })();
  }, [wallet]);

  if (!wallet) return <div className="text-slate-700">Connect your wallet to check KYC.</div>;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold">Wallet</h3>
      <p className="text-sm text-slate-500 mb-4">{wallet}</p>
      <div>
        <strong>Status:</strong> <span className="ml-2">{status ?? "Loading..."}</span>
      </div>
    </div>
  );
}