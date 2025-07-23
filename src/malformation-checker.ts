import { Token, TokenType } from './tokenizer.js';
import { WarningCode, WARNING_DEFINITIONS, MalformationIssue } from './types.js';

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

        // Skip whitespace tokens upfront for faster processing
        const nonWhitespaceTokens = tokens.filter(token => token.type !== TokenType.WHITESPACE);

        this.checkBraceBalanceFast(nonWhitespaceTokens);
        this.checkEmptyParametersFast(nonWhitespaceTokens);
        this.checkUnexpectedTokensFast(nonWhitespaceTokens);
        this.checkStructuralIssuesFast(nonWhitespaceTokens);

        return this.issues;
    }

    /**
     * Fast brace balance checking
     */
    private checkBraceBalanceFast(nonWhitespaceTokens: Token[]): void {
        let braceDepth = 0;

        for (const token of nonWhitespaceTokens) {
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
     * Fast empty parameter checking
     */
    private checkEmptyParametersFast(nonWhitespaceTokens: Token[]): void {
        for (let i = 0; i < nonWhitespaceTokens.length; i++) {
            const token = nonWhitespaceTokens[i];
            const nextToken = nonWhitespaceTokens[i + 1];
            const prevToken = nonWhitespaceTokens[i - 1];

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
     * Fast unexpected token checking
     */
    private checkUnexpectedTokensFast(nonWhitespaceTokens: Token[]): void {
        for (let i = 0; i < nonWhitespaceTokens.length; i++) {
            const token = nonWhitespaceTokens[i];
            const nextToken = nonWhitespaceTokens[i + 1];
            const prevToken = nonWhitespaceTokens[i - 1];

            if (token.type === TokenType.COLON) {
                // Check for colon without parameter name
                if (!prevToken || (prevToken.type !== TokenType.PARAMETER_NAME && prevToken.type !== TokenType.SPREAD)) {
                    this.addIssue(WarningCode.UNEXPECTED_COLON_NO_PARAM);
                }
                
                // Check for double colon
                if (nextToken && nextToken.type === TokenType.COLON) {
                    this.addIssue(WarningCode.DOUBLE_COLON);
                }
            }
        }
    }

    /**
     * Fast structural issue checking
     */
    private checkStructuralIssuesFast(nonWhitespaceTokens: Token[]): void {
        // Check for malformed parameter names (containing asterisks)
        for (const token of nonWhitespaceTokens) {
            if (token.type === TokenType.PARAMETER_NAME && token.value.includes('*')) {
                this.addIssue(WarningCode.MALFORMED_PARAMETER_NAME, token.value);
            }
            
            // Check for invalid characters in type definitions
            if (token.type === TokenType.TYPE && token.value.includes('/')) {
                this.addIssue(WarningCode.INVALID_TYPE_FORWARD_SLASH, token.value);
            }
        }

        // Check for empty parameters and unexpected tokens
        this.checkEmptyParameters(nonWhitespaceTokens);
        this.checkUnexpectedTokens(nonWhitespaceTokens);
    }

    /**
     * Check for empty parameter patterns
     */
    private checkEmptyParameters(tokens: Token[]): void {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];

            // Check for semicolon at start (empty parameter at beginning)
            if (i === 0 && token.type === TokenType.SEMICOLON) {
                this.addIssue(WarningCode.EMPTY_PARAMETER_AT_START);
            }

            // Check for double semicolon (empty parameter between semicolons)
            if (token.type === TokenType.SEMICOLON && nextToken && nextToken.type === TokenType.SEMICOLON) {
                this.addIssue(WarningCode.EMPTY_PARAMETER_DOUBLE_SEMICOLON);
            }
        }
    }

    /**
     * Check for unexpected token sequences
     */
    private checkUnexpectedTokens(tokens: Token[]): void {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];

            if (token.type === TokenType.COLON && nextToken) {
                // Check for unexpected semicolon after colon (empty type)
                if (nextToken.type === TokenType.SEMICOLON) {
                    this.addIssue(WarningCode.UNEXPECTED_SEMICOLON_AFTER_COLON);
                }

                // Check for unexpected closing brace after colon (empty type)
                if (nextToken.type === TokenType.CLOSE_BRACE) {
                    this.addIssue(WarningCode.UNEXPECTED_CLOSING_BRACE_AFTER_COLON);
                }
            }
            
            // Check for colon at end of parameter list (empty type)
            if (token.type === TokenType.COLON && !nextToken) {
                this.addIssue(WarningCode.PARAMETER_EMPTY_TYPE_AFTER_COLON);
            }
        }
    }

    /**
     * Check syntax string for parenthesis balance
     * @param syntaxString - The original syntax string to check
     * @returns Object containing parameter string, end position, and any issues found
     */
    checkSyntaxStructure(syntaxString: string): { paramString: string | null, paramEnd: number, issues: MalformationIssue[] } {
        const structuralIssues: MalformationIssue[] = [];
        
        // Find the parameters section between parentheses
        let paramStart = -1;
        let paramEnd = -1;
        let parenDepth = 0;
        
        for (let i = 0; i < syntaxString.length; i++) {
            const char = syntaxString[i];
            if (char === '(') {
                if (paramStart === -1) {
                    paramStart = i + 1;
                }
                parenDepth++;
            } else if (char === ')') {
                parenDepth--;
                if (parenDepth === 0 && paramStart !== -1) {
                    paramEnd = i;
                    break;
                }
            }
        }

        // If no parentheses found, this is a property (valid syntax without parameters)
        if (paramStart === -1) {
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }
        
        // If opening parenthesis found but no closing parenthesis, that's an error
        if (paramEnd === -1) {
            structuralIssues.push({
                id: WarningCode.MISSING_CLOSING_PARENTHESIS,
                message: WARNING_DEFINITIONS[WarningCode.MISSING_CLOSING_PARENTHESIS].message(),
                level: WARNING_DEFINITIONS[WarningCode.MISSING_CLOSING_PARENTHESIS].level
            });
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }

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
