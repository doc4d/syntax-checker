#!/usr/bin/env node

import { SyntaxChecker, WarningLevel } from "./src/checker.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let docsPath: string | undefined;
    let warningLevel = WarningLevel.LEVEL_1; // Default to LEVEL_1 (high priority only)
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--warning-level' || arg === '-w') {
            const levelArg = args[i + 1];
            if (levelArg === '1') {
                warningLevel = WarningLevel.LEVEL_1;
            } else if (levelArg === '2') {
                warningLevel = WarningLevel.LEVEL_2;
            } else {
                console.error(`Invalid warning level: ${levelArg}. Use 1 for high priority only, 2 for all warnings.`);
                process.exit(1);
            }
            i++; // Skip the next argument since we consumed it
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else if (!docsPath) {
            docsPath = arg;
        }
    }
    
    return { docsPath, warningLevel };
}

/**
 * Show help message
 */
function showHelp() {
    console.log(`
4D Documentation Syntax Checker

Usage: syntax-checker [docs-path] [options]

Arguments:
  docs-path                Path to documentation folder (default: "../../docs")

Options:
  -w, --warning-level <1|2>  Set warning level (default: 1)
                              1: Show only high priority warnings (structural issues)
                              2: Show all warnings (structural + type issues)
  -h, --help                 Show this help message

Examples:
  syntax-checker                           # Use default path, show only high priority warnings
  syntax-checker ./docs                    # Use ./docs path, show only high priority warnings  
  syntax-checker ./docs --warning-level 2 # Use ./docs path, show all warnings
  syntax-checker -w 2                     # Use default path, show all warnings
`);
}

/**
 * Main entry point for syntax checking
 */
async function main() {
    const { docsPath: argDocsPath, warningLevel } = parseArgs();
    
    const checker = new SyntaxChecker(warningLevel);
    
    // Get docs path from command line args or use default
    let docsPath = argDocsPath;
    
    // If no path provided, use default relative to script location
    if (!docsPath) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        docsPath = join(__dirname, "../../docs");
        console.log(`Using default docs path: ${docsPath}`);
    } else {
        console.log(`Using provided docs path: ${docsPath}`);
    }
    
    const warningLevelStr = warningLevel === WarningLevel.LEVEL_1 ? 'Level 1 (High Priority)' : 'Level 2 (All Warnings)';
    console.log(`Warning level: ${warningLevelStr}`);
    console.log(`Starting syntax check for: ${docsPath}`);
    console.log('=' .repeat(50));
    
    try {
        await checker.run(docsPath);
        console.log('\n' + '='.repeat(50));
        console.log('Syntax check completed!');
    } catch (error) {
        console.error('Error during syntax check:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('check.js') || process.argv[1].endsWith('check.ts'))) {
    main();
}
