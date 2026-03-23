SUPPORTERAPISERVER_STUB.md
A lightweight server stub for a future supporter API.

`markdown

Supporter API — Server Stub (Concept)

A minimal, extensible API surface for supporter data.

---

Endpoints

GET /supporters
Returns all supporters in JSON format.

GET /supporters/{id}
Returns a single supporter by ID.

POST /supporters
Adds a new supporter (admin‑only).

PATCH /supporters/{id}
Updates supporter tier or metadata.

GET /tiers
Returns tier definitions and benefits.

---

Example Implementation (Pseudo‑Code)

GET /supporters:
  return loadjson("SUPPORTERWALL.json")

POST /supporters:
  validate(payload)
  appendtojson("SUPPORTER_WALL.json", payload)
  return success
`