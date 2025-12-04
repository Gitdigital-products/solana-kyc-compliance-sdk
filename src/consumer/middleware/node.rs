// Node.js middleware for REST APIs
const { AttestationVerifier, Cluster } = require('@solana-kyc-sdk/consumer');
 
class KycMiddleware {
    constructor(options = {}) {
        this.verifier = new AttestationVerifier(
            options.cluster || Cluster.Mainnet,
            options.cacheTtl || 300 // 5 minutes cache
        );
        this.options = options;
    }

    // Express middleware factory
    requireKyc(requirements = {}) {
        return async (req, res, next) => {
            try {
                const walletAddress = this.extractWalletAddress(req);
                
                if (!walletAddress) {
                    return res.status(401).json({
                        error: 'Wallet address required',
                        code: 'WALLET_REQUIRED'
                    });
                }

                const result = await this.verifier.verifyWalletAccess(
                    walletAddress,
                    requirements
                );

                if (!result.allowed) {
                    return res.status(403).json({
                        error: 'KYC verification required',
                        code: 'KYC_REQUIRED',
                        details: {
                            missingRequirements: result.missingRequirements,
                            suggestedProviders: ['Jumio', 'Circle', 'Sumsub']
                        }
                    });
                }

                // Attach verification result to request
                req.kycVerification = result;
                next();
            } catch (error) {
                console.error('KYC middleware error:', error);
                res.status(500).json({
                    error: 'Verification service unavailable',
                    code: 'VERIFICATION_ERROR'
                });
            }
        };
    }

    // WebSocket middleware
    wsRequireKyc(requirements = {}) {
        return async (socket, next) => {
            try {
                const walletAddress = socket.handshake.auth.walletAddress;
                const result = await this.verifier.verifyWalletAccess(
                    walletAddress,
                    requirements
                );

                if (!result.allowed) {
                    socket.emit('kyc_required', {
                        requirements: result.missingRequirements
                    });
                    return socket.disconnect();
                }

                socket.kycVerification = result;
                next();
            } catch (error) {
                socket.disconnect();
            }
        };
    }

    // NFT gating middleware
    requireNftAccess(collectionAddress, requirements = {}) {
        return async (req, res, next) => {
            const walletAddress = this.extractWalletAddress(req);
            const hasAccess = await this.checkNftAccess(
                walletAddress,
                collectionAddress,
                requirements
            );

            if (!hasAccess) {
                return res.status(403).json({
                    error: 'NFT ownership required',
                    code: 'NFT_ACCESS_REQUIRED',
                    collection: collectionAddress.toString()
                });
            }

            next();
        };
    }

    extractWalletAddress(req) {
        // Try from headers, query params, or body
        return req.headers['x-wallet-address'] ||
               req.query.walletAddress ||
               (req.body && req.body.walletAddress);
    }
}
 
module.exports = KycMiddleware;
 
// Usage example in Express
const express = require('express');
const { KycMiddleware } = require('@solana-kyc-sdk/consumer');
 
const app = express();
const kycMiddleware = new KycMiddleware({
    cluster: 'mainnet-beta',
    cacheTtl: 300
});
 
// Protect API route with KYC
app.get('/api/premium-content',
    kycMiddleware.requireKyc({
        kycLevel: 'plus',
        countryWhitelist: ['US', 'CA', 'UK', 'EU'],
        minAge: 18
    }),
    (req, res) => {
        // Only accessible to KYC-verified users
        res.json({ content: 'Premium content here' });
    }
);
 
// NFT-gated route
app.get('/api/exclusive-nft-mint',
    kycMiddleware.requireNftAccess(
        'EXCLUSIVE_COLLECTION_ADDRESS',
        { kycLevel: 'standard' }
    ),
    (req, res) => {
        res.json({ mintUrl: 'https://mint.example.com' });
    }