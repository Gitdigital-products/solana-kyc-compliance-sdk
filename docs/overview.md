<!-- Identity & Tech Stack -->
![Language](https://img.shields.io/badge/lang-Rust-orange)
![Type](https://img.shields.io/badge/type-CLI-blue)

<!-- Technical Health -->
![CI Status](https://github.com/Gitdigital-products/-nextgen-cli/workflows/Rust/badge.svg)

<!-- Security -->
![Security Scan](https://img.shields.io/badge/scan-CodeQL-cyan)

<!-- Activity -->
![Last Commit](https://img.shields.io/github/last-commit/Gitdigital-products/-nextgen-cli?label=last%20commit)

<!-- Community -->
![Contributors](https://img.shields.io/github/contributors/Gitdigital-products/-nextgen-cli?label=contributors)
![License](https://img.shields.io/badge/license-Other-lightgrey)
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solana KYC Compliance SDK | Secure Identity Verification</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #00ffa3; /* Solana green */
            --secondary: #9945ff; /* Solana purple */
            --dark: #0a0a0a;
            --darker: #050505;
            --light: #f8f9fa;
            --gray: #6c757d;
            --card-bg: #111111;
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        body {
            background-color: var(--darker);
            color: var(--light);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Header & Navigation */
        header {
            background-color: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding: 15px 0;
        }
        
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 1.5rem;
        }
        
        .logo-icon {
            color: var(--primary);
        }
        
        .nav-links {
            display: flex;
            gap: 30px;
        }
        
        .nav-links a {
            color: var(--light);
            text-decoration: none;
            font-weight: 500;
            transition: var(--transition);
            position: relative;
        }
        
        .nav-links a:hover {
            color: var(--primary);
        }
        
        .nav-links a:after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            bottom: -5px;
            left: 0;
            transition: var(--transition);
        }
        
        .nav-links a:hover:after {
            width: 100%;
        }
        
        .github-btn {
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            color: var(--dark);
            padding: 10px 20px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: var(--transition);
        }
        
        .github-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 255, 163, 0.2);
        }
        
        /* Hero Section */
        .hero {
            padding: 100px 0;
            text-align: center;
            background: radial-gradient(ellipse at center, rgba(153, 69, 255, 0.1) 0%, transparent 70%);
        }
        
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            line-height: 1.2;
        }
        
        .hero p {
            font-size: 1.3rem;
            max-width: 700px;
            margin: 0 auto 40px;
            color: #b0b0b0;
        }
        
        .tagline {
            display: inline-block;
            background: rgba(0, 255, 163, 0.1);
            color: var(--primary);
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
            margin-bottom: 30px;
            border: 1px solid rgba(0, 255, 163, 0.3);
        }
        
        .cta-buttons {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 40px;
        }
        
        .btn {
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: var(--transition);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .btn-primary {
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            color: var(--dark);
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(0, 255, 163, 0.3);
        }
        
        .btn-secondary {
            background: transparent;
            color: var(--light);
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--primary);
        }
        
        /* Features Section */
        .section {
            padding: 100px 0;
        }
        
        .section-title {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 60px;
            color: var(--light);
        }
        
        .section-title span {
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .feature-card {
            background-color: var(--card-bg);
            border-radius: 15px;
            padding: 30px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: var(--transition);
            height: 100%;
        }
        
        .feature-card:hover {
            transform: translateY(-10px);
            border-color: rgba(0, 255, 163, 0.3);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
        }
        
        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 20px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .feature-card h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: var(--light);
        }
        
        .feature-card p {
            color: #b0b0b0;
        }
        
        /* Code Example */
        .code-section {
            background-color: var(--card-bg);
            border-radius: 15px;
            padding: 40px;
            margin-top: 40px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .code-header h3 {
            font-size: 1.5rem;
            color: var(--light);
        }
        
        .code-header .btn {
            padding: 8px 20px;
            font-size: 0.9rem;
        }
        
        pre {
            background-color: #050505;
            border-radius: 10px;
            padding: 25px;
            overflow-x: auto;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        code {
            font-family: 'Courier New', monospace;
            color: #f8f9fa;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .code-comment { color: #6c757d; }
        .code-keyword { color: #ff6b6b; }
        .code-function { color: #00ffa3; }
        .code-string { color: #ffd166; }
        .code-operator { color: #9d4edd; }
        
        /* Integration Section */
        .integration-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        
        .integration-item {
            background-color: var(--card-bg);
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: var(--transition);
        }
        
        .integration-item:hover {
            transform: translateY(-5px);
            border-color: rgba(153, 69, 255, 0.3);
        }
        
        .integration-icon {
            font-size: 2rem;
            margin-bottom: 15px;
            color: var(--secondary);
        }
        
        /* Footer */
        footer {
            background-color: #050505;
            padding: 60px 0 30px;
            margin-top: 60px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .footer-logo {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .footer-links h4 {
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: var(--light);
        }
        
        .footer-links ul {
            list-style: none;
        }
        
        .footer-links li {
            margin-bottom: 10px;
        }
        
        .footer-links a {
            color: #b0b0b0;
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer-links a:hover {
            color: var(--primary);
            padding-left: 5px;
        }
        
        .copyright {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5rem;
            }
            
            .hero p {
                font-size: 1.1rem;
            }
            
            .nav-links {
                display: none;
            }
            
            .section {
                padding: 60px 0;
            }
            
            .section-title {
                font-size: 2rem;
            }
            
            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 300px;
            }
            
            .code-section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="container">
            <nav>
                <div class="logo">
                    <i class="fas fa-shield-alt logo-icon"></i>
                    <span>Solana KYC SDK</span>
                </div>
                <div class="nav-links">
                    <a href="#features">Features</a>
                    <a href="#integration">Integration</a>
                    <a href="#docs">Documentation</a>
                    <a href="#examples">Examples</a>
                </div>
                <a href="https://github.com/gitdigital-products" class="github-btn" target="_blank">
                    <i class="fab fa-github"></i> GitHub
                </a>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <div class="tagline">
                <i class="fas fa-bolt"></i> Built for Solana
            </div>
            <h1>Secure KYC Compliance for Solana Applications</h1>
            <p>A robust, lightweight SDK that integrates identity verification and regulatory compliance directly into your Solana dApps, wallets, and DeFi platforms.</p>
            <div class="cta-buttons">
                <a href="#getting-started" class="btn btn-primary">
                    <i class="fas fa-rocket"></i> Get Started
                </a>
                <a href="https://github.com/gitdigital-products/solana-kyc-sdk" class="btn btn-secondary" target="_blank">
                    <i class="fas fa-code"></i> View Documentation
                </a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="section" id="features">
        <div class="container">
            <h2 class="section-title">Why Choose Our <span>KYC SDK</span></h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h3>Secure Identity Verification</h3>
                    <p>Implement bank-grade KYC processes with identity document verification, facial recognition, and liveness detection while maintaining user privacy.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3>Solana Native</h3>
                    <p>Built specifically for the Solana blockchain with support for wallets like Phantom, Solflare, and Ledger. Leverages Solana's speed and low transaction costs.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <h3>Easy Integration</h3>
                    <p>Add KYC compliance to your dApp with just a few lines of code. Comprehensive documentation and example implementations included.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-globe"></i>
                    </div>
                    <h3>Global Compliance</h3>
                    <p>Stay compliant with regulations across jurisdictions including FATF, EU's AMLD5/6, and US FinCEN requirements with automated updates.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-tachometer-alt"></i>
                    </div>
                    <h3>High Performance</h3>
                    <p>Lightweight SDK with minimal overhead. Verification processes complete in seconds, not minutes, leveraging Solana's high throughput.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h3>Privacy Focused</h3>
                    <p>Zero-knowledge proofs and on-chain privacy techniques ensure only necessary verification data is stored while maintaining compliance.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Quick Start Section -->
    <section class="section" id="getting-started">
        <div class="container">
            <h2 class="section-title">Get Started in <span>Minutes</span></h2>
            <div class="code-section">
                <div class="code-header">
                    <h3>Basic Integration Example</h3>
                    <a href="https://github.com/gitdigital-products/solana-kyc-sdk-examples" class="btn btn-secondary" target="_blank">
                        <i class="fas fa-external-link-alt"></i> More Examples
                    </a>
                </div>
                <pre><code><span class="code-comment">// Install the SDK</span>
<span class="code-keyword">npm</span> install @gitdigital-products/solana-kyc-sdk

<span class="code-comment">// Initialize the KYC provider in your application</span>
<span class="code-keyword">import</span> { SolanaKYC } <span class="code-keyword">from</span> <span class="code-string">'@gitdigital-products/solana-kyc-sdk'</span>;
<span class="code-keyword">import</span> { Connection, clusterApiUrl } <span class="code-keyword">from</span> <span class="code-string">'@solana/web3.js'</span>;

<span class="code-comment">// Create KYC instance</span>
<span class="code-keyword">const</span> kycProvider = <span class="code-keyword">new</span> <span class="code-function">SolanaKYC</span>({
  connection: <span class="code-keyword">new</span> <span class="code-function">Connection</span>(clusterApiUrl(<span class="code-string">'mainnet-beta'</span>)),
  apiKey: <span class="code-string">'YOUR_API_KEY'</span>,
  environment: <span class="code-string">'production'</span>
});

<span class="code-comment">// Start KYC verification for a user</span>
<span class="code-keyword">async</span> <span class="code-keyword">function</span> <span class="code-function">verifyUser</span>(walletAddress) {
  <span class="code-keyword">try</span> {
    <span class="code-comment">// Launch KYC modal and process verification</span>
    <span class="code-keyword">const</span> verificationResult = <span class="code-keyword">await</span> kycProvider.<span class="code-function">startVerification</span>(walletAddress);
    
    <span class="code-keyword">if</span> (verificationResult.<span class="code-function">verified</span>) {
      <span class="code-function">console</span>.log(<span class="code-string">`User </span><span class="code-operator">${</span>walletAddress<span class="code-operator">}</span><span class="code-string"> successfully verified!`</span>);
      <span class="code-function">console</span>.log(<span class="code-string">`Verification Tier: </span><span class="code-operator">${</span>verificationResult.tier<span class="code-operator">}</span><span class="code-string">`</span>);
      <span class="code-keyword">return</span> <span class="code-keyword">true</span>;
    } <span class="code-keyword">else</span> {
      <span class="code-function">console</span>.log(<span class="code-string">`Verification failed: </span><span class="code-operator">${</span>verificationResult.reason<span class="code-operator">}</span><span class="code-string">`</span>);
      <span class="code-keyword">return</span> <span class="code-keyword">false</span>;
    }
  } <span class="code-keyword">catch</span> (error) {
    <span class="code-function">console</span>.error(<span class="code-string">'KYC verification error:'</span>, error);
    <span class="code-keyword">return</span> <span class="code-keyword">false</span>;
  }
}</code></pre>
            </div>
        </div>
    </section>

    <!-- Integration Section -->
    <section class="section" id="integration">
        <div class="container">
            <h2 class="section-title">Seamless <span>Integration</span></h2>
            <p style="text-align: center; max-width: 700px; margin: 0 auto 40px; color: #b0b0b0;">
                Our SDK is designed to work effortlessly with the most popular Solana wallets and frameworks.
            </p>
            <div class="integration-grid">
                <div class="integration-item">
                    <div class="integr
                    
                    
                    
                    
                    
                    
                    
                    # Overview

Provides an on-chain Compliance Registry Program (CRP) tracking KYC-verified wallets and a TypeScript SDK for developers to integrate with the registry.
