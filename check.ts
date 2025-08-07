#!/usr/bin/env node

import { SyntaxChecker, WarningLevel } from "./src/checker.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let docsPath: string | undefined;
    let outputFile: string | undefined;
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
        } else if (arg === '--output' || arg === '-o') {
            outputFile = args[i + 1];
            if (!outputFile) {
                console.error('Output file path is required after --output');
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
    
    return { docsPath, outputFile, warningLevel };
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
  -o, --output <file>        Output results to file instead of console
  -h, --help                 Show this help message

Examples:
  syntax-checker                           # Use default path, show only high priority warnings
  syntax-checker ./docs                    # Use ./docs path, show only high priority warnings  
  syntax-checker ./docs --warning-level 2 # Use ./docs path, show all warnings
  syntax-checker -w 2                     # Use default path, show all warnings
  syntax-checker -o results.txt           # Output to results.txt file
  syntax-checker ./docs -w 2 -o report.md # Full report to markdown file
`);
}

/**
 * Main entry point for syntax checking
 */
async function main() {
    const { docsPath: argDocsPath, outputFile, warningLevel } = parseArgs();
    
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
    
    if (outputFile) {
        console.log(`Output will be written to: ${outputFile}`);
    }
    
    console.log(`Starting syntax check for: ${docsPath}`);
    console.log('=' .repeat(50));
    
    // Capture console output if writing to file
    let capturedOutput = '';
    let originalConsoleLog: typeof console.log | undefined;
    let originalConsoleError: typeof console.error | undefined;
    
    if (outputFile) {
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        
        console.log = (...args: any[]) => {
            const message = args.join(' ') + '\n';
            capturedOutput += message;
            originalConsoleLog!(...args);
        };
        
        console.error = (...args: any[]) => {
            const message = 'ERROR: ' + args.join(' ') + '\n';
            capturedOutput += message;
            originalConsoleError!(...args);
        };
    }
    
    try {
        await checker.run(docsPath);
        console.log('\n' + '='.repeat(50));
        console.log('Syntax check completed!');
    } catch (error) {
        console.error('Error during syntax check:', error);
        
        // Write partial output to file if specified, even on error
        if (outputFile && capturedOutput) {
            try {
                // Restore original console functions first
                if (originalConsoleLog) console.log = originalConsoleLog;
                if (originalConsoleError) console.error = originalConsoleError;
                
                writeFileSync(outputFile, capturedOutput + `\nERROR: ${error}\n`, 'utf8');
                console.log(`Partial results written to: ${outputFile}`);
            } catch (writeError) {
                console.error(`Error writing to file ${outputFile}:`, writeError);
            }
        } else {
            // Restore original console functions if there was an error but no output to write
            if (outputFile) {
                if (originalConsoleLog) console.log = originalConsoleLog;
                if (originalConsoleError) console.error = originalConsoleError;
            }
        }
        
        process.exit(1);
    }
    
    // Write output to file if specified
    if (outputFile) {
        // Restore original console functions
        if (originalConsoleLog) console.log = originalConsoleLog;
        if (originalConsoleError) console.error = originalConsoleError;
        
        try {
            writeFileSync(outputFile, capturedOutput, 'utf8');
            console.log(`\nResults written to: ${outputFile}`);
        } catch (writeError) {
            console.error(`Error writing to file ${outputFile}:`, writeError);
            process.exit(1);
        }
    }
}

// Run if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('check.js') || process.argv[1].endsWith('check.ts'))) {
    main();
}
