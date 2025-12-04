#!/usr/bin/env ts-node
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { SolanaKYCClient } from '../../src/client';
import { Environment } from '../../src/utils/env';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface HealthCheckResult {
  timestamp: string;
  network: string;
  checks: {
    rpc: boolean;
    programs: Record<string, boolean>;
    api?: boolean;
    database?: boolean;
    redis?: boolean;
  };
  metrics: {
    rpcLatency: number;
    slot: number;
    epoch: number;
    version: string;
  };
  issues: string[];
}

class HealthChecker {
  private connection: Connection;
  private kycClient: SolanaKYCClient;
  private network: string;

  constructor() {
    this.network = Environment.getSolanaNetwork();
    const rpcUrl = Environment.getSolanaRpcUrl();
    
    this.connection = new Connection(rpcUrl, Environment.getCommitment());
    this.kycClient = new SolanaKYCClient({
      rpcUrl,
      network: this.network,
      commitment: Environment.getCommitment()
    });
  }

  async runFullCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const issues: string[] = [];

    console.log('🏥 Running Health Check...');
    console.log(`📡 Network: ${this.network}`);
    console.log(`🔗 RPC: ${Environment.getSolanaRpcUrl()}`);

    // Check RPC connectivity
    const rpcCheck = await this.checkRPC();
    if (!rpcCheck.healthy) {
      issues.push(`RPC Connection: ${rpcCheck.error}`);
    }

    // Check programs
    const programChecks = await this.checkPrograms();

    // Check API if running
    const apiCheck = await this.checkAPI();

    // Check database if configured
    const dbCheck = await this.checkDatabase();

    // Check Redis if configured
    const redisCheck = await this.checkRedis();

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      network: this.network,
      checks: {
        rpc: rpcCheck.healthy,
        programs: programChecks,
        api: apiCheck.healthy,
        database: dbCheck.healthy,
        redis: redisCheck.healthy
      },
      metrics: {
        rpcLatency: rpcCheck.latency,
        slot: rpcCheck.slot,
        epoch: rpcCheck.epoch,
        version: rpcCheck.version
      },
      issues: [...issues, ...rpcCheck.issues, ...apiCheck.issues, ...dbCheck.issues, ...redisCheck.issues]
    };

    // Log results
    console.log('\n📊 Health Check Results:');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📡 RPC: ${rpcCheck.healthy ? '✅' : '❌'} (${rpcCheck.latency}ms)`);
    
    Object.entries(programChecks).forEach(([program, healthy]) => {
      console.log(`🛠️  ${program}: ${healthy ? '✅' : '❌'}`);
    });

    if (apiCheck.healthy !== undefined) {
      console.log(`🌐 API: ${apiCheck.healthy ? '✅' : '❌'}`);
    }

    if (dbCheck.healthy !== undefined) {
      console.log(`🗄️  Database: ${dbCheck.healthy ? '✅' : '❌'}`);
    }

    if (redisCheck.healthy !== undefined) {
      console.log(`🔴 Redis: ${redisCheck.healthy ? '✅' : '❌'}`);
    }

    if (result.issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      result.issues.forEach(issue => console.log(`  • ${issue}`));
    } else {
      console.log('\n✅ All systems operational!');
    }

    // Save report
    await this.saveReport(result);

    return result;
  }

  private async checkRPC(): Promise<{
    healthy: boolean;
    latency: number;
    slot: number;
    epoch: number;
    version: string;
    error?: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const start = Date.now();
      const [version, slot, epochInfo] = await Promise.all([
        this.connection.getVersion(),
        this.connection.getSlot(),
        this.connection.getEpochInfo()
      ]);
      const latency = Date.now() - start;

      // Check latency
      if (latency > 5000) {
        issues.push(`High RPC latency: ${latency}ms`);
      }

      // Check slot progression
      const slotTime = await this.connection.getBlockTime(slot);
      if (slotTime) {
        const age = Date.now() / 1000 - slotTime;
        if (age > 30) {
          issues.push(`Stale slot: ${age.toFixed(1)} seconds old`);
        }
      }

      return {
        healthy: true,
        latency,
        slot,
        epoch: epochInfo.epoch,
        version: version['solana-core'],
        issues
      };

    } catch (error) {
      return {
        healthy: false,
        latency: -1,
        slot: -1,
        epoch: -1,
        version: '',
        error: error.message,
        issues: [`RPC Connection failed: ${error.message}`]
      };
    }
  }

  private async checkPrograms(): Promise<Record<string, boolean>> {
    const programIds = Environment.getProgramIds();
    const results: Record<string, boolean> = {};

    for (const [name, programId] of Object.entries(programIds)) {
      if (!programId) {
        results[name] = false;
        continue;
      }

      try {
        const accountInfo = await this.connection.getAccountInfo(
          new PublicKey(programId)
        );

        results[name] = !!(accountInfo && accountInfo.executable);
        
        if (!results[name]) {
          console.warn(`⚠️ Program ${name} (${programId}) is not executable`);
        }
      } catch (error) {
        results[name] = false;
        console.warn(`⚠️ Failed to check program ${name}: ${error.message}`);
      }
    }

    return results;
  }

  private async checkAPI(): Promise<{
    healthy?: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const response = await axios.get('http://localhost:3000/health', {
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          healthy: true,
          issues
        };
      } else {
        issues.push(`API returned status ${response.status}`);
        return {
          healthy: false,
          issues
        };
      }
    } catch (error) {
      // API might not be running, which is OK for some checks
      return {
        healthy: undefined,
        issues: [`API check skipped: ${error.message}`]
      };
    }
  }

  private async checkDatabase(): Promise<{
    healthy?: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Database check would require database client
    // For now, just check if DATABASE_URL is set
    const dbUrl = Environment.getDatabaseUrl();
    
    if (!dbUrl) {
      issues.push('DATABASE_URL not configured');
      return { healthy: undefined, issues };
    }

    // In a real implementation, you would connect to the database
    // and run a simple query like "SELECT 1"
    
    return {
      healthy: undefined, // Would be true/false after actual check
      issues: ['Database check not implemented']
    };
  }

  private async checkRedis(): Promise<{
    healthy?: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const redisUrl = Environment.getRedisUrl();
    
    if (!redisUrl) {
      issues.push('REDIS_URL not configured');
      return { healthy: undefined, issues };
    }

    // In a real implementation, you would connect to Redis
    // and run a simple command like "PING"
    
    return {
      healthy: undefined, // Would be true/false after actual check
      issues: ['Redis check not implemented']
    };
  }

  private async saveReport(result: HealthCheckResult): Promise<void> {
    const reportsDir = path.join(__dirname, '..', '..', 'reports', 'health');
    fs.mkdirSync(reportsDir, { recursive: true });

    const filename = `health-check-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`📄 Report saved to: ${filepath}`);
  }

  async runContinuousCheck(intervalMs: number = 60000): Promise<void> {
    console.log(`🔁 Starting continuous health checks every ${intervalMs / 1000} seconds`);
    console.log('Press Ctrl+C to stop\n');

    while (true) {
      await this.runFullCheck();
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

// Run health check
async function main() {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  const interval = args.find(arg => arg.startsWith('--interval='))?.split('=')[1];

  const checker = new HealthChecker();

  if (continuous) {
    const intervalMs = interval ? parseInt(interval) : 60000;
    await checker.runContinuousCheck(intervalMs);
  } else {
    await checker.runFullCheck();
  }
}

main().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});