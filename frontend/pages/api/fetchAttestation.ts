import type { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
 
const connection = new Connection("http://127.0.0.1:8899");
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pda } = req.query;
  if (!pda || typeof pda !== "string") return res.status(400).json({ error: "pda required" });

  try {
    const acct = await connection.getAccountInfo(new PublicKey(pda));
    if (acct) return res.status(200).json({ exists: true, dataLen: acct.data.length });
    return res.status(200).json({ exists: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.toString() });
  }