import requests

def send_to_gateway(message):
    return requests.post(
        "https://gateway.gitdigital.ai/v1/chat/completions",
        headers={
            "X-Org-ID": "gitdigital-products",
            "X-Repo-ID": "open-grant-stack",
            "X-API-Key": "env:GATEWAY_KEY"
        },
        json={"messages": message}
    )