{
  "name": "kyc-server-signer",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon --watch . --exec node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "tweetnacl": "^1.0.3",
    "js-sha256": "^0.9.0",
    "@msgpack/msgpack": "^2.8.0",
    "brotli": "^1.3.2",
    "ipfs-http-client": "^60.0.0",
    "basic-auth": "^2.0.1",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "pino": "^8.0.0",
    "uuid": "^9.0.0",
    "bs58": "^5.0.0"
  }
}