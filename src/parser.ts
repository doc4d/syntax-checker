import { 
    ParsedParameter, 
    ParsedReturnType, 
    WarningLevel, 
    MalformationInfo, 
    ParsedVariant 
} from './types.js';
import { Tokenizer } from './tokenizer.js';
import { MalformationChecker } from './malformation-checker.js';
import { ParameterChecker } from './parameter-checker.js';

// Re-export types for backward compatibility
export type { 
    ParsedParameter, 
    ParsedReturnType, 
    MalformationInfo, 
    ParsedVariant 
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

            // Find the parameters section between parentheses
            let paramStart = -1;
            let paramEnd = -1;
            let parenDepth = 0;
            
            for (let i = 0; i < trimmedVariant.length; i++) {
                const char = trimmedVariant[i];
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

            if (paramStart === -1 || paramEnd === -1) {
                const malformation: MalformationInfo = {
                    isMalformed: true,
                    issues: paramStart === -1 ? 
                        [{ message: 'Missing opening parenthesis', level: WarningLevel.LEVEL_1 }] : 
                        [{ message: 'Missing closing parenthesis', level: WarningLevel.LEVEL_1 }]
                };
                allVariants.push({ 
                    variant: trimmedVariant, 
                    parameters: [],
                    malformation: malformation
                });
                continue;
            }

            const paramString = trimmedVariant.substring(paramStart, paramEnd).trim();
            if (!paramString) {
                allVariants.push({ variant: trimmedVariant, parameters: [] });
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
            
            // Parse return type information after the closing parenthesis
            const returnType = this.parseReturnType(trimmedVariant, paramEnd + 1);
            
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
     * Parse return type information from syntax string
     * @param syntaxString - The full syntax string
     * @param startIndex - Index after the closing parenthesis
     * @returns ParsedReturnType object or undefined
     */
    parseReturnType(syntaxString: string, startIndex: number): ParsedReturnType | undefined {
        if (startIndex >= syntaxString.length) return undefined;
        
        const remainingString = syntaxString.substring(startIndex).trim();
        if (!remainingString) return undefined;
        
        const returnType: ParsedReturnType = {};
        
        // Check for arrow syntax: -> returnName : Type or -> returnName
        if (remainingString.startsWith('->')) {
            const afterArrow = remainingString.substring(2).trim();
            
            // Look for colon to separate name and type
            const colonIndex = afterArrow.indexOf(':');
            if (colonIndex !== -1) {
                // Format: -> returnName : Type
                returnType.name = afterArrow.substring(0, colonIndex).trim();
                returnType.type = afterArrow.substring(colonIndex + 1).trim();
            } else {
                // Format: -> returnName
                returnType.name = afterArrow.trim();
            }
        } else if (remainingString.startsWith(':')) {
            // Format: : Type
            returnType.type = remainingString.substring(1).trim();
        }
        
        // Return undefined if no meaningful return type information was found
        if (!returnType.name && !returnType.type) {
            return undefined;
        }
        
        return returnType;
    }
}
