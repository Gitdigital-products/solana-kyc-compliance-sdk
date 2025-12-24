import React from "react";
 
export default function ConnectButton({ onConnect }: { onConnect: (pk: string)=>void }) {
  const connect = async () => {
    const sol = (window as any).solana;
    if (sol && sol.isPhantom) {
      const res = await sol.connect();
      onConnect(res.publicKey.toString());
    } else {
      alert("Phantom not found. This UI expects Phantom or a compatible wallet in-browser.");
    }
  };

  return (
    <button onClick={connect} className="bg-indigo-600 text-white px-4 py-2 rounded">
      Connect Wallet
    </button>
  );
}