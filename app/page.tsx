export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <h1 className="text-3xl font-bold text-[#9945FF]">GitDigital Solana - Compliance Engine Live</h1>
      <p className="mt-4 text-[#14F195]">Transfer Hook + SAS + Registry - Devnet</p>
      <div className="mt-8 p-4 border border-purple-500/30 rounded">
        {/* Plug your ComplianceClient here */}
        <p>Demo loading... Connect wallet to test KYC gate</p>
      </div>
    </main>
  );
}