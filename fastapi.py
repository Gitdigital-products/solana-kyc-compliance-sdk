'''python
from fastapi import FastAPI, Request, Header, HTTPException
from typing import Optional
import json
import logging

app = FastAPI(
    title="GitHub Webhook Receiver",
    description="Universal webhook intake for GitHub + smee.io",
    version="1.0.0",
)

logging.basicConfig(level=logging.INFO)


@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Webhook receiver is alive"}


@app.post("/")
async def receive_github_event(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_github_delivery: Optional[str] = Header(None),
):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logging.info("📦 GitHub Event Received")
    logging.info(f"Event Type: {x_github_event}")
    logging.info(f"Delivery ID: {x_github_delivery}")
    logging.info(json.dumps(payload, indent=2))

    # You can route logic here later:
    # if x_github_event == "push":
    #     handle_push(payload)

    return {
        "ok": True,
        "event": x_github_event,
        "delivery": x_github_delivery,
    }
```


