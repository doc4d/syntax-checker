import { 
    ParsedParameter, 
    ParsedReturnType, 
    ParsedVariant 
} from './types.js';
import { Tokenizer, Token, TokenType } from './tokenizer.js';
import { MalformationChecker } from './malformation-checker.js';
import { ParameterChecker } from './parameter-checker.js';

// Re-export types for backward compatibility
export type { 
    ParsedParameter, 
    ParsedReturnType, 
    ParsedVariant,
    MalformationInfo
} from './types.js';

// Re-export enum as value
export { WarningLevel } from './types.js';

/**
 * Parser class for 4D documentation syntax strings
 * Handles parsing of syntax definitions and parameter strings using 4-step architecture:
 * 1. Preprocessing (remove markdown asterisks)
 * 2. Tokenization (convert to tokens)
 * 3. Malformation checking (structural validation)
 * 4. Parameter checking (type validation)
 */
export class Parser {
    private tokenizer: Tokenizer;
    private malformationChecker: MalformationChecker;
    private parameterChecker: ParameterChecker;

    constructor() {
        this.tokenizer = new Tokenizer();
        this.malformationChecker = new MalformationChecker();
        this.parameterChecker = new ParameterChecker();
    }

    /**
     * Parse a syntax string into variants with their parameters
     * @param syntax - The syntax string to parse
     * @returns Array of parsed variants
     */
    parseSyntax(syntax: string): ParsedVariant[] {
        if (!syntax || typeof syntax !== 'string') {
            return [];
        }

        // Split by <br/> to handle multiple syntax variants
        const syntaxVariants = syntax.split('<br/>');
        const allVariants: ParsedVariant[] = [];

        for (const syntaxVariant of syntaxVariants) {
            const trimmedVariant = syntaxVariant.trim();
            if (!trimmedVariant) continue;

            // Use malformation checker to validate syntax structure and extract parameters
            const tokenizer = new Tokenizer();
            const syntaxTokens = tokenizer.tokenize(trimmedVariant);
            const syntaxStructure = this.malformationChecker.checkSyntaxStructure(trimmedVariant);
            
            // If structural issues found, add variant with malformation
            if (syntaxStructure.issues.length > 0) {
                allVariants.push({ 
                    variant: trimmedVariant, 
                    parameters: [],
                    malformation: {
                        isMalformed: true,
                        issues: syntaxStructure.issues
                    }
                });
                continue;
            }

            const paramString = syntaxStructure.paramString;
            if (!paramString) {
                // Parse return type information using already computed tokens
                const returnType = this.parseReturnType(syntaxTokens, syntaxStructure.paramEnd + 1);
                const variant: ParsedVariant = { variant: trimmedVariant, parameters: [] };
                if (returnType) {
                    variant.returnType = returnType;
                }
                allVariants.push(variant);
                continue;
            }

            // 4-step parsing architecture:
            
            // Step 1: Preprocessing (remove markdown asterisks)
            const preprocessedString = this.preprocessParameterString(paramString);
            
            // Step 2: Tokenization
            const tokens = this.tokenizer.tokenize(preprocessedString);
            
            // Step 3: Malformation checking
            const malformationIssues = this.malformationChecker.checkMalformations(tokens);
            
            // Step 4: Parameter checking
            const parameterResult = this.parameterChecker.checkParameters(tokens);
            
            // Combine all issues
            const allIssues = [...malformationIssues, ...parameterResult.issues];
            
            // Parse return type information using already computed tokens
            const returnType = this.parseReturnType(syntaxTokens, syntaxStructure.paramEnd + 1);
            
            const parsedVariant: ParsedVariant = { 
                variant: trimmedVariant, 
                parameters: parameterResult.parameters
            };
            
            if (returnType) {
                parsedVariant.returnType = returnType;
            }
            
            if (allIssues.length > 0) {
                parsedVariant.malformation = {
                    isMalformed: true,
                    issues: allIssues
                };
            }
            
            allVariants.push(parsedVariant);
        }

        return allVariants;
    }

    /**
     * Parse parameter string using the 4-step architecture
     * @param paramString - The parameter string to parse
     * @returns Array of parsed parameters
     */
    parseParameters(paramString: string): ParsedParameter[] {
        // Step 1: Preprocessing
        const preprocessedString = this.preprocessParameterString(paramString);
        
        // Step 2: Tokenization
        const tokens = this.tokenizer.tokenize(preprocessedString);
        
        // Step 4: Parameter extraction (skip malformation checking for this method)
        const result = this.parameterChecker.checkParameters(tokens);
        
        return result.parameters;
    }

    /**
     * Preprocess parameter string to handle markdown asterisks
     * @param paramString - The parameter string to preprocess
     * @returns Cleaned parameter string
     */
    private preprocessParameterString(paramString: string): string {
        // Transform *paramName* to paramName, but keep \* as literal asterisk
        let cleanedParamString = paramString;
        
        // First, protect escaped asterisks by temporarily replacing them
        cleanedParamString = cleanedParamString.replace(/\\\*/g, '___ESCAPED_ASTERISK___');
        
        // Remove pairs of asterisks around parameter names and special patterns
        // Handle spread patterns first
        cleanedParamString = cleanedParamString.replace(/\*(\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        cleanedParamString = cleanedParamString.replace(/\*([;]\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        // Then handle regular parameters
        cleanedParamString = cleanedParamString.replace(/\*([^*:;{}() ]+)\*/gu, '$1');
        
        // Restore escaped asterisks
        cleanedParamString = cleanedParamString.replace(/___ESCAPED_ASTERISK___/g, '\\*');
        
        return cleanedParamString;
    }

    /**
     * Parse return type information from syntax tokens
     * @param syntaxTokens - The tokenized syntax string
     * @param startIndex - Index after the closing parenthesis in the original string
     * @returns ParsedReturnType object or undefined
     */
    parseReturnType(syntaxTokens: Token[], startIndex: number): ParsedReturnType | undefined {
        // Find the last closing parenthesis token
        let lastClosingParenIndex = -1;
        for (let i = syntaxTokens.length - 1; i >= 0; i--) {
            if (syntaxTokens[i].type === TokenType.CLOSE_PAREN) {
                lastClosingParenIndex = i;
                break;
            }
        }
        
        if (lastClosingParenIndex === -1) {
            // No closing parenthesis found, look for tokens after startIndex position
            const returnTypeTokens = syntaxTokens.filter(token => token.position >= startIndex);
            if (returnTypeTokens.length === 0) return undefined;
            return this.parseReturnTypeFromTokens(returnTypeTokens);
        }
        
        // Get tokens after the closing parenthesis
        const returnTypeTokens = syntaxTokens.slice(lastClosingParenIndex + 1);
        if (returnTypeTokens.length === 0) return undefined;
        
        return this.parseReturnTypeFromTokens(returnTypeTokens);
    }

    private parseReturnTypeFromTokens(returnTypeTokens: Token[]): ParsedReturnType | undefined {
        const returnType: ParsedReturnType = {};
        
        // Check for arrow syntax using tokens: -> returnName : Type or -> returnName
        if (returnTypeTokens.length >= 1 && returnTypeTokens[0].type === TokenType.ARROW) {
            // Find tokens after the arrow
            const afterArrowTokens = returnTypeTokens.slice(1);
            if (afterArrowTokens.length === 0) return undefined;
            
            // Look for colon token to separate name and type
            const colonTokenIndex = afterArrowTokens.findIndex(token => token.type === TokenType.COLON);
            
            if (colonTokenIndex !== -1) {
                // Format: -> returnName : Type
                const nameTokens = afterArrowTokens.slice(0, colonTokenIndex);
                const typeTokens = afterArrowTokens.slice(colonTokenIndex + 1);
                
                if (nameTokens.length > 0) {
                    // Since whitespace is not tokenized, just take the first token
                    returnType.name = nameTokens[0].value.trim();
                }
                if (typeTokens.length > 0) {
                    // Since whitespace is not tokenized, just take the first token
                    returnType.type = typeTokens[0].value.trim();
                }
            } else {
                // Format: -> returnName
                if (afterArrowTokens.length > 0) {
                    returnType.name = afterArrowTokens[0].value.trim();
                }
            }
        } else if (returnTypeTokens.length >= 1 && returnTypeTokens[0].type === TokenType.COLON) {
            // Format: : Type
            const typeTokens = returnTypeTokens.slice(1);
            if (typeTokens.length > 0) {
                // Since whitespace is not tokenized, just take the first token
                returnType.type = typeTokens[0].value.trim();
            }
        }
        
        // Return undefined if no meaningful return type information was found
        if (!returnType.name && !returnType.type) {
            return undefined;
        }
        
        return returnType;
    }
}
