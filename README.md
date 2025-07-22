# @4d-docs/syntax-checker

[![CI](https://github.com/doc4d/syntax-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/doc4d/syntax-checker/actions/workflows/ci.yml)

A comprehensive syntax parser and checker for 4D documentation, written in TypeScript.

## Features

- Parse 4D syntax strings with multiple variants
- Tokenizer-based architecture for robust parsing
- Multi-level warning system (structural vs type issues)
- CLI support with configurable warning levels
- Validate parameter types and names
- Check for type mismatches and extra parameters
- Support for optional parameters and spread syntax
- Enhanced type validation with forward-slash and comma-separated types
- Full TypeScript support with type definitions

## Architecture

The parser uses a modern 4-step architecture:

1. **Preprocessing**: Remove markdown formatting (`**bold**` → `bold`)
2. **Tokenization**: Convert text into structured tokens
3. **Malformation Checking**: Detect structural issues (missing braces, parentheses)
4. **Parameter Checking**: Validate parameter types and detect type-related issues

### Warning Levels

- **Level 1**: High priority structural issues (missing parentheses, unmatched braces)
- **Level 2**: Type-related issues (missing types, empty types after colons)

## Project Structure

```
syntax-checker/
├── src/                      # TypeScript source files
│   ├── parser.ts             # Main parser orchestrator
│   ├── tokenizer.ts          # Tokenization logic
│   ├── malformation-checker.ts  # Structural validation
│   ├── parameter-checker.ts  # Parameter type validation
│   ├── checker.ts            # SyntaxChecker class implementation
│   └── types.d.ts            # Type definitions
├── tests/                    # Test files
│   ├── parser.test.ts
│   ├── checker.test.ts
│   └── stress/
│       └── stress.test.ts
├── out/                      # Compiled JavaScript output (generated)
├── index.ts                  # Main library entry point
├── check.ts                  # CLI script
├── tsconfig.json             # TypeScript configuration
└── .gitignore                # Git ignore file
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

## CLI Usage

```bash
# Check syntax with default settings (Level 1 warnings only)
syntax-checker

# Check with all warnings (Level 1 + Level 2)
syntax-checker --warning-level 2

# Check specific documentation folder
syntax-checker ./docs --warning-level 2

# Short form
syntax-checker -w 2
```

### CLI Options

- `--warning-level, -w <1|2>`: Set warning level (default: 1)
  - `1`: Show only high priority warnings (structural issues)
  - `2`: Show all warnings (structural + type issues)
- `--help, -h`: Show help message

## API Usage

### Basic Usage

```javascript
import { Parser, SyntaxChecker, WarningLevel } from '@4d-docs/syntax-checker';

// Parse syntax string
const parser = new Parser();
const variants = parser.parseSyntax('**VP SET TIME VALUE** ( *rangeObj* : Object ; *timeValue* : Text { ; *formatPattern* : Text } )');

// Check syntax with specific warning level
const checker = new SyntaxChecker(WarningLevel.LEVEL_2);
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
