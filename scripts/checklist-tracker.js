
### **4. `/scripts/checklist-tracker.js` - Progress Tracking Utility**

```javascript
#!/usr/bin/env node

/**
 * Solana KYC SDK Checklist Tracker
 * 
 * Tracks progress across multiple checklists and generates reports
 * Usage: node scripts/checklist-tracker.js [checklist-files...]
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ChecklistTracker {
  constructor(options = {}) {
    this.project = options.project || 'Solana KYC SDK';
    this.team = options.team || [];
    this.checklists = [];
    this.report = {
      generated: new Date().toISOString(),
      summary: {},
      details: [],
      recommendations: []
    };
  }

  /**
   * Load and parse checklist files
   */
  async loadChecklists(filepaths) {
    for (const filepath of filepaths) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const checklist = this.parseChecklist(content, filepath);
        this.checklists.push(checklist);
        console.log(chalk.green(`✓ Loaded: ${checklist.name}`));
      } catch (error) {
        console.log(chalk.red(`✗ Failed to load: ${filepath}`));
        console.log(chalk.gray(`  Error: ${error.message}`));
      }
    }
  }

  /**
   * Parse checklist content
   */
  parseChecklist(content, filepath) {
    const lines = content.split('\n');
    const checklist = {
      name: path.basename(filepath, '.md'),
      filepath,
      phases: [],
      items: [],
      stats: {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0
      }
    };

    let currentPhase = null;

    for (const line of lines) {
      // Extract checklist name from first heading
      if (line.startsWith('# ') && !checklist.title) {
        checklist.title = line.replace('# ', '').trim();
        continue;
      }

      // Detect phases
      const phaseMatch = line.match(/^## 📋 PHASE (\d+): (.+)$/);
      if (phaseMatch) {
        currentPhase = {
          number: parseInt(phaseMatch[1]),
          title: phaseMatch[2],
          items: []
        };
        checklist.phases.push(currentPhase);
        continue;
      }

      // Detect checklist items
      const itemMatch = line.match(/^- \[( |x)\]\s*(.+)$/);
      if (itemMatch && currentPhase) {
        const item = {
          completed: itemMatch[1] === 'x',
          text: itemMatch[2].trim(),
          phase: currentPhase.number
        };

        // Extract owner if specified
        const ownerMatch = item.text.match(/Owner:\s*(\w+)/i);
        if (ownerMatch) {
          item.owner = ownerMatch[1];
          item.text = item.text.replace(/Owner:\s*\w+/i, '').trim();
        }

        // Extract due date if specified
        const dateMatch = item.text.match(/Due:\s*(\d{4}-\d{2}-\d{2})/i);
        if (dateMatch) {
          item.dueDate = dateMatch[1];
          item.text = item.text.replace(/Due:\s*\d{4}-\d{2}-\d{2}/i, '').trim();
        }

        checklist.items.push(item);
        currentPhase.items.push(item);

        // Update stats
        checklist.stats.total++;
        if (item.completed) checklist.stats.completed++;
        else if (item.text.includes('(in progress)')) checklist.stats.inProgress++;
        else checklist.stats.notStarted++;
      }
    }

    // Calculate percentages
    checklist.stats.percentage = checklist.stats.total > 0 
      ? Math.round((checklist.stats.completed / checklist.stats.total) * 100)
      : 0;

    return checklist;
  }

  /**
   * Generate comprehensive analysis
   */
  analyze() {
    this.report.summary = {
      totalChecklists: this.checklists.length,
      totalItems: 0,
      completedItems: 0,
      overallPercentage: 0,
      byPhase: {},
      byOwner: {}
    };

    // Aggregate stats
    for (const checklist of this.checklists) {
      this.report.summary.totalItems += checklist.stats.total;
      this.report.summary.completedItems += checklist.stats.completed;

      // Track by phase
      for (const phase of checklist.phases) {
        if (!this.report.summary.byPhase[phase.number]) {
          this.report.summary.byPhase[phase.number] = {
            title: phase.title,
            total: 0,
            completed: 0
          };
        }
        this.report.summary.byPhase[phase.number].total += phase.items.length;
        this.report.summary.byPhase[phase.number].completed += 
          phase.items.filter(item => item.completed).length;
      }

      // Track by owner
      for (const item of checklist.items) {
        if (item.owner) {
          if (!this.report.summary.byOwner[item.owner]) {
            this.report.summary.byOwner[item.owner] = {
              total: 0,
              completed: 0,
              overdue: 0
            };
          }
          this.report.summary.byOwner[item.owner].total++;
          if (item.completed) {
            this.report.summary.byOwner[item.owner].completed++;
          }
          if (item.dueDate && new Date(item.dueDate) < new Date() && !item.completed) {
            this.report.summary.byOwner[item.owner].overdue++;
          }
        }
      }
    }

    // Calculate overall percentage
    this.report.summary.overallPercentage = this.report.summary.totalItems > 0
      ? Math.round((this.report.summary.completedItems / this.report.summary.totalItems) * 100)
      : 0;

    // Generate recommendations
    this.generateRecommendations();

    return this.report;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for blocked phases
    for (const [phaseNum, phase] of Object.entries(this.report.summary.byPhase)) {
      const completion = phase.total > 0 
        ? Math.round((phase.completed / phase.total) * 100)
        : 0;
      
      if (completion < 30 && parseInt(phaseNum) <= 3) {
        recommendations.push({
          type: 'blocker',
          message: `Phase ${phaseNum} (${phase.title}) is only ${completion}% complete`,
          action: `Focus on completing Phase ${phaseNum} before moving forward`
        });
      }
    }

    // Check for overdue items
    for (const [owner, stats] of Object.entries(this.report.summary.byOwner)) {
      if (stats.overdue > 0) {
        recommendations.push({
          type: 'overdue',
          message: `${owner} has ${stats.overdue} overdue item(s)`,
          action: `Follow up with ${owner} about overdue tasks`
        });
      }
    }

    // Check for unbalanced workload
    const owners = Object.keys(this.report.summary.byOwner);
    if (owners.length > 1) {
      const avgItems = this.report.summary.totalItems / owners.length;
      for (const [owner, stats] of Object.entries(this.report.summary.byOwner)) {
        if (stats.total > avgItems * 1.5) {
          recommendations.push({
            type: 'workload',
            message: `${owner} has ${stats.total} items (above average)`,
            action: `Consider redistributing tasks from ${owner}`
          });
        }
      }
    }

    // Overall progress check
    if (this.report.summary.overallPercentage < 50) {
      recommendations.push({
        type: 'progress',
        message: `Overall progress is ${this.report.summary.overallPercentage}%`,
        action: 'Accelerate development or adjust timeline'
      });
    }

    this.report.recommendations = recommendations;
  }

  /**
   * Generate formatted report
   */
  generateReport(format = 'text') {
    const analysis = this.analyze();
    
    if (format === 'json') {
      return JSON.stringify(analysis, null, 2);
    }

    // Text format (default)
    let report = '='.repeat(60) + '\n';
    report += `SOLANA KYC SDK - CHECKLIST PROGRESS REPORT\n`;
    report += `Generated: ${new Date(analysis.generated).toLocaleString()}\n`;
    report += '='.repeat(60) + '\n\n';

    // Summary section
    report += '📊 SUMMARY\n';
    report += '-' .repeat(40) + '\n';
    report += `Total Checklists: ${analysis.summary.totalChecklists}\n`;
    report += `Total Items: ${analysis.summary.totalItems}\n`;
    report += `Completed: ${analysis.summary.completedItems}\n`;
    report += `Overall Progress: ${analysis.summary.overallPercentage}%\n\n`;

    // Phase breakdown
    report += '📋 PHASE BREAKDOWN\n';
    report += '-' .repeat(40) + '\n';
    for (const [phaseNum, phase] of Object.entries(analysis.summary.byPhase)) {
      const percentage = phase.total > 0 
        ? Math.round((phase.completed / phase.total) * 100)
        : 0;
      const progressBar = this.createProgressBar(percentage, 20);
      
      report += `Phase ${phaseNum}: ${phase.title}\n`;
      report += `  ${progressBar} ${percentage}% (${phase.completed}/${phase.total})\n`;
    }
    report += '\n';

    // Owner breakdown
    if (Object.keys(analysis.summary.byOwner).length > 0) {
      report += '👥 OWNER BREAKDOWN\n';
      report += '-' .repeat(40) + '\n';
      for (const [owner, stats] of Object.entries(analysis.summary.byOwner)) {
        const percentage = stats.total > 0 
          ? Math.round((stats.completed / stats.total) * 100)
          : 0;
        
        report += `${owner}:\n`;
        report += `  Completed: ${stats.completed}/${stats.total} (${percentage}%)\n`;
        if (stats.overdue > 0) {
          report += `  ⚠️  Overdue: ${stats.overdue} item(s)\n`;
        }
      }
      report += '\n';
    }

    // Checklist details
    report += '📝 CHECKLIST DETAILS\n';
    report += '-' .repeat(40) + '\n';
    for (const checklist of this.checklists) {
      const progressBar = this.createProgressBar(checklist.stats.percentage, 20);
      
      report += `${checklist.title}\n`;
      report += `  ${progressBar} ${checklist.stats.percentage}%\n`;
      report += `  📍 ${checklist.stats.completed} done, ${checklist.stats.inProgress} in progress, ${checklist.stats.notStarted} pending\n`;
      
      // Show next 3 pending items
      const pendingItems = checklist.items
      


        .filter(item => !item.completed)
        .slice(0, 3);
      
      if (pendingItems.length > 0) {
        report += `  Next items:\n`;
        for (const item of pendingItems) {
          report += `    • ${item.text}\n`;
        }
      }
      report += '\n';
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += '🎯 RECOMMENDATIONS\n';
      report += '-' .repeat(40) + '\n';
      for (const rec of analysis.recommendations) {
        const icon = {
          blocker: '🔴',
          overdue: '🟡',
          workload: '🟠',
          progress: '🔵'
        }[rec.type] || '⚪';
        
        report += `${icon} ${rec.message}\n`;
        report += `   → ${rec.action}\n`;
      }
      report += '\n';
    }

    // Next steps
    report += '🚀 NEXT STEPS\n';
    report += '-' .repeat(40) + '\n';
    
    // Find lowest completion phase
    let lowestPhase = null;
    let lowestPercentage = 100;
    
    for (const [phaseNum, phase] of Object.entries(analysis.summary.byPhase)) {
      const percentage = phase.total > 0 
        ? Math.round((phase.completed / phase.total) * 100)
        : 0;
      
      if (percentage < lowestPercentage) {
        lowestPercentage = percentage;
        lowestPhase = { number: phaseNum, ...phase };
      }
    }
    
    if (lowestPhase && lowestPercentage < 100) {
      report += `1. Focus on Phase ${lowestPhase.number}: ${lowestPhase.title}\n`;
      report += `   ${lowestPhase.completed}/${lowestPhase.total} items complete (${lowestPercentage}%)\n`;
    }
    
    // Find overdue items
    const overdueOwners = Object.entries(analysis.summary.byOwner)
      .filter(([_, stats]) => stats.overdue > 0)
      .map(([owner, _]) => owner);
    
    if (overdueOwners.length > 0) {
      report += `2. Follow up with: ${overdueOwners.join(', ')}\n`;
    }
    
    // General next steps
    if (analysis.summary.overallPercentage < 80) {
      report += `3. Overall progress: ${analysis.summary.overallPercentage}% - accelerate if needed\n`;
    }
    
    if (analysis.summary.overallPercentage >= 80) {
      report += `3. Prepare for security review\n`;
    }
    
    if (analysis.summary.overallPercentage >= 95) {
      report += `4. Schedule production deployment\n`;
    }
    
    report += '\n' + '='.repeat(60) + '\n';
    report += 'Report complete. Use this to guide your development process.\n';
    report += '='.repeat(60);

    return report;
  }

  /**
   * Create ASCII progress bar
   */
  createProgressBar(percentage, width) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Save report to file
   */
  saveReport(filepath, format = 'text') {
    const report = this.generateReport(format);
    fs.writeFileSync(filepath, report);
    console.log(chalk.green(`✓ Report saved to: ${filepath}`));
  }

  /**
   * Display report in console
   */
  displayReport() {
    const report = this.generateReport();
    console.log(report);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(chalk.blue('Solana KYC SDK Checklist Tracker'));
    console.log(chalk.gray('Usage: node checklist-tracker.js <checklist-files...> [options]'));
    console.log('\nOptions:');
    console.log('  --output <file>    Save report to file');
    console.log('  --format <format>  Output format (text|json)');
    console.log('  --display          Display report in console');
    console.log('\nExamples:');
    console.log('  node checklist-tracker.js CHECKLIST.md');
    console.log('  node checklist-tracker.js checklists/*.md --output report.txt');
    console.log('  node checklist-tracker.js checklists/*.md --format json');
    process.exit(0);
  }

  // Parse options
  const options = {
    output: null,
    format: 'text',
    display: false
  };

  const checklists = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') {
      options.output = args[++i];
    } else if (args[i] === '--format') {
      options.format = args[++i];
    } else if (args[i] === '--display') {
      options.display = true;
    } else if (!args[i].startsWith('--')) {
      checklists.push(args[i]);
    }
  }

  if (checklists.length === 0) {
    console.log(chalk.red('Error: No checklist files specified'));
    process.exit(1);
  }

  // Check if files exist
  for (const checklist of checklists) {
    if (!fs.existsSync(checklist)) {
      console.log(chalk.red(`Error: File not found - ${checklist}`));
      process.exit(1);
    }
  }

  try {
    // Load and analyze checklists
    const tracker = new ChecklistTracker({
      project: 'Solana KYC SDK',
      team: ['alice@example.com', 'bob@example.com'] // Update with actual team
    });

    await tracker.loadChecklists(checklists);
    
    // Display report
    if (options.display) {
      tracker.displayReport();
    }
    
    // Save to file if requested
    if (options.output) {
      tracker.saveReport(options.output, options.format);
    }
    
    // Exit with code based on progress
    const analysis = tracker.analyze();
    if (analysis.summary.overallPercentage < 50) {
      console.log(chalk.yellow('⚠️  Progress below 50% - consider adjusting timeline'));
      process.exit(1);
    }
    
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
```

module.exports = ChecklistTracker;
