# @4d-docs/syntax-checker

[![CI](https://github.com/doc4d/syntax-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/doc4d/syntax-checker/actions/workflows/ci.yml)

A comprehensive syntax parser and checker for 4D documentation, written in TypeScript.

## Features

- Parse 4D syntax strings with multiple variants
- Validate parameter types and names
- Check for type mismatches and extra parameters
- Support for optional parameters and spread syntax
- Enhanced type validation with forward-slash and comma-separated types
- Full TypeScript support with type definitions

## Project Structure

```
syntax-checker/
├── src/               # TypeScript source files
│   ├── parser.ts      # Parser class implementation
│   ├── checker.ts     # SyntaxChecker class implementation
│   └── types.d.ts     # Type definitions
├── tests/             # Test files
│   ├── parser.test.ts
│   ├── checker.test.ts
│   └── stress/
│       └── stress.test.ts
├── out/               # Compiled JavaScript output (generated)
├── index.ts           # Main library entry point
├── check.ts           # CLI script
├── tsconfig.json      # TypeScript configuration
└── .gitignore         # Git ignore file
```

## Development

### Building

```bash
npm run build          # Compile TypeScript to JavaScript
npm run build:watch    # Watch mode for development
```

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for tests
npm run test:coverage # Run tests with coverage
```

## Installation

```bash
npm install @4d-docs/syntax-checker
```

## Usage

### Basic Usage

```javascript
import { Parser, SyntaxChecker } from '@4d-docs/syntax-checker';

// Parse syntax string
const parser = new Parser();
const variants = parser.parseSyntax('**VP SET TIME VALUE** ( *rangeObj* : Object ; *timeValue* : Text { ; *formatPattern* : Text } )');

// Check syntax
const checker = new SyntaxChecker();
await checker.run();
```

### Individual Components

```javascript
// Use just the parser
import { Parser } from '@4d-docs/syntax-checker/parser';

const parser = new Parser();
const variants = parser.parseSyntax(syntaxString);

// Use just the checker
import { SyntaxChecker } from '@4d-docs/syntax-checker/checker';

const checker = new SyntaxChecker();
checker.checkCommand(name, command);
```

## Project Structure

```
syntax-checker/
├── src/                    # Source code
│   ├── checker.js         # Main SyntaxChecker class
│   └── parser.js          # Parser class for syntax parsing
├── index.js               # Main entry point and exports
├── package.json           # Package configuration
├── vitest.config.js       # Vitest test configuration
├── syntax-checker.test.js # Main test suite
├── stress.test.js         # Stress and performance tests
├── test.js                # Legacy manual test runner
└── README.md              # This file
```

### Legacy Functions

```javascript
// Legacy compatibility functions
import { parseSyntax, parseParameters } from '@4d-docs/syntax-checker';

const variants = parseSyntax(syntaxString);
const params = parseParameters(paramString);
```

## Classes

### Parser

Handles syntax parsing operations:

- `parseSyntax(syntax)` - Parse syntax string into variants
- `parseParameters(paramString)` - Parse parameter string

### SyntaxChecker

Handles syntax validation:

- `checkCommand(name, command)` - Validate command syntax
- `run()` - Run full syntax check
- Various validation helper methods

## API Reference

See the individual class files for detailed API documentation.

## License

MIT
