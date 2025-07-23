import { Token, TokenType } from './tokenizer.js';
import { WarningLevel, MalformationIssue } from './types.js';

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
                    this.addIssue('Extra closing brace (unmatched optional block closure)', WarningLevel.LEVEL_1);
                    braceDepth = 0; // Reset to prevent cascade errors
                }
            }
        }

        if (braceDepth > 0) {
            this.addIssue(`Unclosed optional block (missing ${braceDepth} closing brace${braceDepth > 1 ? 's' : ''})`, WarningLevel.LEVEL_1);
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
                    this.addIssue('Empty parameter found (double semicolon)', WarningLevel.LEVEL_1);
                }
                
                // Check for semicolon at start
                if (!prevToken) {
                    this.addIssue('Empty parameter found (semicolon at start)', WarningLevel.LEVEL_1);
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
                    this.addIssue('Unexpected colon (missing parameter name)', WarningLevel.LEVEL_1);
                }
                
                // Check for double colon
                if (nextToken && nextToken.type === TokenType.COLON) {
                    this.addIssue('Double colon found in parameter definition', WarningLevel.LEVEL_1);
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
                this.addIssue(`Parameter name '${token.value}' contains asterisks (likely malformed markup)`, WarningLevel.LEVEL_1);
            }
            
            // Check for invalid characters in type definitions
            if (token.type === TokenType.TYPE && token.value.includes('/')) {
                this.addIssue(`Type definition '${token.value}' contains invalid forward slash characters`, WarningLevel.LEVEL_1);
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

        if (paramStart === -1) {
            structuralIssues.push({
                message: 'Missing opening parenthesis',
                level: WarningLevel.LEVEL_1
            });
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }
        
        if (paramEnd === -1) {
            structuralIssues.push({
                message: 'Missing closing parenthesis',
                level: WarningLevel.LEVEL_1
            });
            return { paramString: null, paramEnd: -1, issues: structuralIssues };
        }

        const paramString = syntaxString.substring(paramStart, paramEnd).trim();
        return { paramString, paramEnd, issues: structuralIssues };
    }

    /**
     * Add a malformation issue
     * @param message - Error message
     * @param level - Warning level
     */
    private addIssue(message: string, level: WarningLevel): void {
        this.issues.push({
            message,
            level
        });
    }
}
