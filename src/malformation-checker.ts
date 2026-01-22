import { Token, TokenType, Tokenizer } from './tokenizer.js';
import { WarningCode, WARNING_DEFINITIONS, MalformationIssue } from './types.js';

const validTypes = [
    'object', 'text', 'real', 'any', 'integer', 'collection', 'date', 'time', 'boolean', 'picture', 'blob', 'variant', 'pointer',
    'text array', 'object array', 'boolean array', 'integer array', 'real array', 'time array', 'pointer array', 'array', 'picture array', 'date array',
    'expression', 'table', 'field', 'variable', 'expression', 'operator', 'null', 'undefined', 'comparator'
];


/**
 * Malformation checker for tokens
 */
export class MalformationChecker {
    private issues: MalformationIssue[] = [];

    /**
     * Check tokens for structural malformations
     * @param tokens - Array of tokens to check
     * @returns Array of malformation issues
     */
    checkMalformations(tokens: Token[]): MalformationIssue[] {
        this.issues = [];

        // Since whitespace is not tokenized, we can work directly with the tokens
        this.checkBraceBalance(tokens);
        this.checkEmptyParameters(tokens);
        this.checkUnexpectedTokens(tokens);
        this.checkStructuralIssues(tokens);

        return this.issues;
    }

    /**
     * Brace balance checking
     */
    private checkBraceBalance(tokens: Token[]): void {
        let braceDepth = 0;

        for (const token of tokens) {
            if (token.type === TokenType.OPEN_BRACE) {
                braceDepth++;
            } else if (token.type === TokenType.CLOSE_BRACE) {
                braceDepth--;
                if (braceDepth < 0) {
                    this.addIssue(WarningCode.EXTRA_CLOSING_BRACE);
                    braceDepth = 0; // Reset to prevent cascade errors
                }
            }
        }

        if (braceDepth > 0) {
            this.addIssue(WarningCode.UNCLOSED_OPTIONAL_BLOCK, braceDepth);
        }
    }

    /**
     * Empty parameter checking
     */
    private checkEmptyParameters(tokens: Token[]): void {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];
            const prevToken = tokens[i - 1];

            if (token.type === TokenType.SEMICOLON) {
                // Check for double semicolon
                if (nextToken && nextToken.type === TokenType.SEMICOLON) {
                    this.addIssue(WarningCode.EMPTY_PARAMETER_DOUBLE_SEMICOLON);
                }

                // Check for semicolon at start
                if (!prevToken) {
                    this.addIssue(WarningCode.EMPTY_PARAMETER_AT_START);
                }
            }
        }
    }

    /**
     * Unexpected token checking
     */
    private checkUnexpectedTokens(tokens: Token[]): void {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];
            const prevToken = tokens[i - 1];

            if (token.type === TokenType.COLON) {
                // Check for colon without parameter name
                if (!prevToken || (prevToken.type !== TokenType.PARAMETER_NAME && prevToken.type !== TokenType.SPREAD)) {
                    this.addIssue(WarningCode.UNEXPECTED_COLON_NO_PARAM);
                }

                // Check for double colon
                if (nextToken && nextToken.type === TokenType.COLON) {
                    this.addIssue(WarningCode.DOUBLE_COLON);
                }

                // Check for unexpected semicolon after colon (empty type)
                if (nextToken && nextToken.type === TokenType.SEMICOLON) {
                    this.addIssue(WarningCode.UNEXPECTED_SEMICOLON_AFTER_COLON);
                }

                // Check for unexpected closing brace after colon (empty type)
                if (nextToken && nextToken.type === TokenType.CLOSE_BRACE) {
                    this.addIssue(WarningCode.UNEXPECTED_CLOSING_BRACE_AFTER_COLON);
                }

                // Check for colon at end of parameter list (empty type)
                if (!nextToken) {
                    this.addIssue(WarningCode.PARAMETER_EMPTY_TYPE_AFTER_COLON);
                }
            }
        }
    }

    /**
     * Structural issue checking
     */
    private checkStructuralIssues(tokens: Token[]): void {
        // Check for malformed parameter names and types
        for (const token of tokens) {
            // Check for invalid characters and format in type definitions
            if (token.type === TokenType.TYPE) {

                // Check type format compliance
                if (!this.isValidTypeFormat(token.value)) {
                    this.addIssue(WarningCode.INVALID_TYPE_FORMAT, token.value);
                }
            }
        }

        // No need to call checkEmptyParameters and checkUnexpectedTokens here
        // as they are already called by the main checkMalformations method
    }

    private isValidSingleType(typeName: string): boolean {

        // Pattern 2: 4D. or cs. prefix followed by valid identifier
        const prefixedTypeRegex = /^(4D|cs)(\.([a-zA-Z_$][a-zA-Z0-9_$]*)){1,2}$/;
        if (prefixedTypeRegex.test(typeName)) {
            return true;
        }


        // Convert both the input type and valid types to lowercase for case-insensitive comparison
        const lowerTypeName = typeName.toLowerCase();

        if (validTypes.includes(lowerTypeName)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a type format is valid:
     * - Letters only (e.g., "String", "Number", "Object")
     * - Starting with "4D." or "cs." followed by valid identifier (e.g., "4D.Collection", "cs.MyClass")
     */
    private isValidTypeFormat(typeName: string): boolean {

        for (const type of typeName.split(',')) {
            if (!this.isValidSingleType(type.trim())) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check syntax structure using tokens for parenthesis balance
     * @param syntaxString - The original syntax string to check
     * @returns Object containing parameter string, end position, and any issues found
     */
    checkSyntaxStructure(syntaxString: string): { paramString: string | null, paramEnd: number, issues: MalformationIssue[] } {
        const structuralIssues: MalformationIssue[] = [];

        // Tokenize the entire syntax string to use token-based parsing
        const tokenizer = new Tokenizer();
        const tokens = tokenizer.tokenize(syntaxString);

        // Find the parameters section between parentheses using tokens
        let paramStartIndex = -1;
        let paramEndIndex = -1;
        let parenDepth = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === TokenType.OPEN_PAREN) {
                if (paramStartIndex === -1) {
                    paramStartIndex = i + 1;
                }
                parenDepth++;
            } else if (token.type === TokenType.CLOSE_PAREN) {
                parenDepth--;
                if (parenDepth === 0 && paramStartIndex !== -1) {
                    paramEndIndex = i;
                    break;
                }
            }
        }

        // If no parentheses found, this is a property (valid syntax without parameters)
        if (paramStartIndex === -1) {
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }

        // If opening parenthesis found but no closing parenthesis, that's an error
        if (paramEndIndex === -1) {
            structuralIssues.push({
                id: WarningCode.MISSING_CLOSING_PARENTHESIS,
                message: WARNING_DEFINITIONS[WarningCode.MISSING_CLOSING_PARENTHESIS].message(),
                level: WARNING_DEFINITIONS[WarningCode.MISSING_CLOSING_PARENTHESIS].level
            });
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }

        // Extract parameter string from original syntax string to preserve whitespace
        const openParenToken = tokens.find(t => t.type === TokenType.OPEN_PAREN);
        const closeParenToken = tokens[paramEndIndex];

        if (!openParenToken || !closeParenToken) {
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }

        const paramStart = openParenToken.position + 1;
        const paramEnd = closeParenToken.position;
        const paramString = syntaxString.substring(paramStart, paramEnd).trim();

        return { paramString, paramEnd, issues: structuralIssues };
    }

    /**
     * Add a malformation issue using warning code
     * @param code - Warning code identifier
     * @param args - Arguments for the message template
     */
    private addIssue(code: WarningCode, ...args: unknown[]): void {
        const definition = WARNING_DEFINITIONS[code];
        this.issues.push({
            id: code,
            message: (definition.message as (...args: unknown[]) => string)(...args),
            level: definition.level
        });
    }
}
