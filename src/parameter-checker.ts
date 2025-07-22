import { Token, TokenType } from './tokenizer.js';
import { WarningLevel, MalformationIssue, ParsedParameter } from './types.js';

/**
 * Parameter checker for type-related issues
 */
export class ParameterChecker {
    private tokens: Token[] = [];
    private issues: MalformationIssue[] = [];

    /**
     * Check tokens for parameter-specific issues and build parameter list
     * @param tokens - Array of tokens to check
     * @returns Object containing parameters and issues
     */
    checkParameters(tokens: Token[]): { parameters: ParsedParameter[], issues: MalformationIssue[] } {
        this.tokens = tokens;
        this.issues = [];

        // Skip whitespace tokens upfront for faster processing
        const nonWhitespaceTokens = tokens.filter(token => token.type !== TokenType.WHITESPACE);
        const parameters = this.buildParametersFast(nonWhitespaceTokens);
        
        return {
            parameters,
            issues: this.issues
        };
    }

    /**
     * Fast parameter building from tokens
     * @returns Array of parsed parameters
     */
    private buildParametersFast(nonWhitespaceTokens: Token[]): ParsedParameter[] {
        const parameters: ParsedParameter[] = [];
        let currentParam: Partial<ParsedParameter> | null = null;
        let optionalDepth = 0;
        
        for (let i = 0; i < nonWhitespaceTokens.length; i++) {
            const token = nonWhitespaceTokens[i];
            const nextToken = nonWhitespaceTokens[i + 1];
            
            switch (token.type) {
                case TokenType.OPEN_BRACE:
                    optionalDepth++;
                    break;
                    
                case TokenType.CLOSE_BRACE:
                    optionalDepth--;
                    break;
                    
                case TokenType.PARAMETER_NAME:
                    // Start new parameter
                    if (currentParam && currentParam.name) {
                        this.finishParameterFast(currentParam, parameters, optionalDepth);
                    }
                    
                    currentParam = {
                        name: token.value,
                        type: 'unknown',
                        optional: optionalDepth > 0,
                        spread: false
                    };
                    
                    // Quick check for missing type
                    if (nextToken && nextToken.type !== TokenType.COLON) {
                        if (nextToken.type === TokenType.SEMICOLON || 
                            nextToken.type === TokenType.OPEN_BRACE || 
                            nextToken.type === TokenType.CLOSE_BRACE ||
                            i === nonWhitespaceTokens.length - 1) {
                            this.addIssue(`Parameter '${token.value}' has no type (missing colon and type)`, WarningLevel.LEVEL_2);
                        }
                    }
                    break;
                    
                case TokenType.SPREAD:
                    const paramName = token.value.startsWith('...') ? token.value.slice(3) : token.value;
                    
                    if (currentParam && currentParam.name) {
                        this.finishParameterFast(currentParam, parameters, optionalDepth);
                    }
                    
                    currentParam = {
                        name: paramName,
                        type: 'unknown',
                        optional: optionalDepth > 0,
                        spread: true
                    };
                    
                    if (nextToken && nextToken.type !== TokenType.COLON) {
                        if (nextToken.type === TokenType.SEMICOLON || 
                            nextToken.type === TokenType.OPEN_BRACE || 
                            nextToken.type === TokenType.CLOSE_BRACE ||
                            i === nonWhitespaceTokens.length - 1) {
                            this.addIssue(`Parameter '${paramName}' has no type (missing colon and type)`, WarningLevel.LEVEL_2);
                        }
                    }
                    break;
                    
                case TokenType.TYPE:
                    if (currentParam) {
                        const prevToken = nonWhitespaceTokens[i - 1];
                        if (prevToken && prevToken.type === TokenType.COLON) {
                            currentParam.type = token.value;
                        }
                    }
                    break;
                    
                case TokenType.SEMICOLON:
                    if (currentParam && currentParam.name) {
                        this.finishParameterFast(currentParam, parameters, optionalDepth);
                        currentParam = null;
                    }
                    break;
                    
                case TokenType.OPERATOR:
                case TokenType.ESCAPED_ASTERISK:
                    parameters.push({
                        name: token.value,
                        type: 'operator',
                        optional: optionalDepth > 0,
                        spread: false
                    });
                    break;
            }
        }
        
        // Finish last parameter if exists
        if (currentParam && currentParam.name) {
            this.finishParameterFast(currentParam, parameters, optionalDepth);
        }
        
        return parameters;
    }

    /**
     * Fast parameter finishing
     */
    private finishParameterFast(param: Partial<ParsedParameter>, parameters: ParsedParameter[], optionalDepth: number): void {
        if (!param.name) return;
        
        // Check for empty type after colon
        if (param.type === 'unknown' && this.parameterHasColonFast(param.name)) {
            this.addIssue(`Parameter '${param.name}' has empty type after colon`, WarningLevel.LEVEL_2);
        }
        
        const finalParam: ParsedParameter = {
            name: param.name,
            type: param.type || 'unknown',
            optional: param.optional || optionalDepth > 0,
            spread: param.spread || false
        };
        
        // Only add valid parameters
        if (finalParam.name && 
            finalParam.name !== '}' && 
            finalParam.name !== '{' && 
            finalParam.name !== ';') {
            parameters.push(finalParam);
        }
    }

    /**
     * Fast check if parameter has colon
     */
    private parameterHasColonFast(paramName: string): boolean {
        const nonWhitespaceTokens = this.tokens.filter(token => token.type !== TokenType.WHITESPACE);
        
        for (let i = 0; i < nonWhitespaceTokens.length - 1; i++) {
            const token = nonWhitespaceTokens[i];
            const nextToken = nonWhitespaceTokens[i + 1];
            
            if ((token.type === TokenType.PARAMETER_NAME || token.type === TokenType.SPREAD) && 
                token.value === paramName && nextToken.type === TokenType.COLON) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Add a parameter issue
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
