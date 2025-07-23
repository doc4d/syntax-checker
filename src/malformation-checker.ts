import { Token, TokenType, Tokenizer } from './tokenizer.js';
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

        this.checkBraceBalance(nonWhitespaceTokens);
        this.checkEmptyParameters(nonWhitespaceTokens);
        this.checkUnexpectedTokens(nonWhitespaceTokens);
        this.checkStructuralIssues(nonWhitespaceTokens);

        return this.issues;
    }

    /**
     * Brace balance checking
     */
    private checkBraceBalance(nonWhitespaceTokens: Token[]): void {
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
     * Empty parameter checking
     */
    private checkEmptyParameters(nonWhitespaceTokens: Token[]): void {
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
     * Unexpected token checking
     */
    private checkUnexpectedTokens(nonWhitespaceTokens: Token[]): void {
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
    private checkStructuralIssues(nonWhitespaceTokens: Token[]): void {
        // Check for malformed parameter names and types
        for (const token of nonWhitespaceTokens) {
            if (token.type === TokenType.PARAMETER_NAME) {
                // Check ECMA compliance for parameter names
                if (!this.isEcmaCompliantIdentifier(token.value)) {
                    this.addIssue(WarningCode.NON_ECMA_PARAMETER_NAME, token.value);
                }
            }
            
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

    /**
     * Check if a parameter name is ECMA-compliant (valid JavaScript identifier)
     */
    private isEcmaCompliantIdentifier(name: string): boolean {
        // Basic check: must start with letter, $, or _, followed by letters, digits, $, or _
        const ecmaIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
        
        return ecmaIdentifierRegex.test(name);
    }

    /**
     * Check if a type format is valid:
     * - Letters only (e.g., "String", "Number", "Object")
     * - Starting with "4D." or "cs." followed by valid identifier (e.g., "4D.Collection", "cs.MyClass")
     */
    private isValidTypeFormat(typeName: string): boolean {
        // Pattern 1: Letters only (basic types)
        const lettersOnlyRegex = /^[a-zA-Z]+$/;
        if (lettersOnlyRegex.test(typeName)) {
            return true;
        }
        
        // Pattern 2: 4D. or cs. prefix followed by valid identifier
        const prefixedTypeRegex = /^(4D\.|cs\.)([a-zA-Z_$][a-zA-Z0-9_$]*)$/;
        const match = typeName.match(prefixedTypeRegex);
        if (match) {
            const identifier = match[2];
            return this.isEcmaCompliantIdentifier(identifier);
        }
        
        // Pattern 3: Allow common generic types like Array<Type>, Object<Key, Value>, etc.
        const genericTypeRegex = /^[a-zA-Z]+(<[a-zA-Z0-9_$,\s.]+>)?(\[\])?$/;
        if (genericTypeRegex.test(typeName)) {
            return true;
        }
        
        return false;
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
