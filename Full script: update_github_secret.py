import base64
import json
import os
import requests
from nacl import encoding, public

# --- CONFIG ---
GITHUB_TOKEN = os.environ["GH_TOKEN"]
REPO = "Gitdigital-products/solana-kyc-compliance-sdk"
SECRET_NAME = "DEVNET_KEYPAIR"

# Path to your local Solana keypair file
KEYPAIR_PATH = os.path.expanduser("~/.config/solana/id.json")

# --- 1️⃣ Get repo public key ---
headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
key_url = f"https://api.github.com/repos/{REPO}/actions/secrets/public-key"
res = requests.get(key_url, headers=headers)
res.raise_for_status()
public_key = res.json()
print("Fetched GitHub public key for repo")

# --- 2️⃣ Read and encrypt the keypair ---
keypair_data = open(KEYPAIR_PATH, "r").read().strip()
sealed_box = public.SealedBox(public.PublicKey(public_key["key"], encoding.Base64Encoder()))
encrypted_value = sealed_box.encrypt(keypair_data.encode("utf-8"))
encrypted_value_b64 = base64.b64encode(encrypted_value).decode("utf-8")

# --- 3️⃣ Upload secret to GitHub ---
put_url = f"https://api.github.com/repos/{REPO}/actions/secrets/{SECRET_NAME}"
payload = {
    "encrypted_value": encrypted_value_b64,
    "key_id": public_key["key_id"],
}
res = requests.put(put_url, headers=headers, data=json.dumps(payload))
res.raise_for_status()
print(f"✅ Secret '{SECRET_NAME}' updated successfully in {REPO}")
