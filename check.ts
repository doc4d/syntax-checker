#!/usr/bin/env node

import { SyntaxChecker } from "./src/checker.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Main entry point for syntax checking
 */
async function main() {
    const checker = new SyntaxChecker();
    
    // Get docs path from command line args or use default
    let docsPath = process.argv[2];
    
    // If no path provided, use default relative to script location
    if (!docsPath) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        docsPath = join(__dirname, "../../docs");
        console.log(`Using default docs path: ${docsPath}`);
    } else {
        console.log(`Using provided docs path: ${docsPath}`);
    }
    
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
