/**
 * Parameter interface for parsed syntax parameters
 */
export interface ParsedParameter {
    name: string;
    type: string;
    optional: boolean;
    spread: boolean;
}

/**
 * Return type information for parsed syntax variants
 */
export interface ParsedReturnType {
    name?: string;  // Return parameter name (from -> returnName)
    type?: string;  // Return type (from : Type)
}

/**
 * Variant interface for parsed syntax variants
 */
export interface ParsedVariant {
    variant: string;
    parameters: ParsedParameter[];
    returnType?: ParsedReturnType;
}

/**
 * Parser class for 4D documentation syntax strings
 * Handles parsing of syntax definitions and parameter strings
 */
export class Parser {
    constructor() {
        // Parser-specific initialization
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

            // Find the parameters section between parentheses without regex
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
                allVariants.push({ variant: trimmedVariant, parameters: [] });
                continue;
            }

            const paramString = trimmedVariant.substring(paramStart, paramEnd).trim();
            if (!paramString) {
                allVariants.push({ variant: trimmedVariant, parameters: [] });
                continue;
            }

            const parameters = this.parseParameters(paramString);
            
            // Parse return type information after the closing parenthesis
            const returnType = this.parseReturnType(trimmedVariant, paramEnd + 1);
            
            const parsedVariant: ParsedVariant = { 
                variant: trimmedVariant, 
                parameters: parameters
            };
            
            if (returnType) {
                parsedVariant.returnType = returnType;
            }
            
            allVariants.push(parsedVariant);
        }

        return allVariants;
    }

    /**
     * Parse parameter string using state machine
     * @param paramString - The parameter string to parse
     * @returns Array of parsed parameters
     */
    parseParameters(paramString: string): ParsedParameter[] {
        const parameters: ParsedParameter[] = [];
        
        // Preprocess: Remove markdown asterisks around parameter names
        // Transform *paramName* to paramName, but keep \* as literal asterisk
        let cleanedParamString = paramString;
        
        // First, protect escaped asterisks by temporarily replacing them
        cleanedParamString = cleanedParamString.replace(/\\\*/g, '___ESCAPED_ASTERISK___');
        
        // Remove pairs of asterisks around parameter names and special patterns
        // This handles patterns like *paramName* and *...paramName*
        // But NOT standalone asterisks (operators/markers)
        // Handle spread patterns first
        cleanedParamString = cleanedParamString.replace(/\*(\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        cleanedParamString = cleanedParamString.replace(/\*([;]\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        // Then handle regular parameters - use more permissive pattern for Unicode
        cleanedParamString = cleanedParamString.replace(/\*([^*:;{}() ]+)\*/gu, '$1');
        
        // Restore escaped asterisks
        cleanedParamString = cleanedParamString.replace(/___ESCAPED_ASTERISK___/g, '\\*');
        
        // State machine states
        const STATES = {
            NORMAL: 'normal',
            IN_OPTIONAL: 'in_optional',
            IN_PARAM_NAME: 'in_param_name',
            IN_TYPE: 'in_type'
        } as const;
        
        type StateType = typeof STATES[keyof typeof STATES];
        
        let state: StateType = STATES.NORMAL;
        let optionalDepth = 0;
        let currentParam: ParsedParameter | null = null;
        let buffer = '';
        let i = 0;
    
        function resetParam(): void {
            currentParam = {
                name: '',
                type: 'unknown',
                optional: false,
                spread: false
            };
        }
    
        function finishParam(): void {
            if (currentParam && currentParam.name) {
                // Clean up name and type
                currentParam.name = currentParam.name.trim();
                currentParam.type = currentParam.type.trim();
                
                // Set optional if we're in optional block
                if (optionalDepth > 0) {
                    currentParam.optional = true;
                }
                
                // Handle spread parameters
                if (currentParam.name.startsWith('...')) {
                    currentParam.spread = true;
                    currentParam.name = currentParam.name.slice(3);
                }
                
                // Only add if name is valid
                if (currentParam.name && currentParam.name !== '}' && currentParam.name !== '{' && currentParam.name !== ';') {
                    parameters.push(currentParam);
                }
            }
            resetParam();
        }
    
        resetParam();
    
        while (i < cleanedParamString.length) {
            const char = cleanedParamString[i];
            const nextChar = cleanedParamString[i + 1];
            
            switch (state) {
                case STATES.NORMAL:
                    if (char === '\\' && nextChar === '*') {
                        // Escaped asterisk - add as marker parameter
                        parameters.push({
                            name: '*',
                            type: 'marker',
                            optional: optionalDepth > 0,
                            spread: false
                        });
                        i += 2; // Skip \*
                        continue;
                    } else if (char === '{') {
                        optionalDepth++;
                        state = STATES.IN_OPTIONAL;
                    } else if (char === '*') {
                        // Standalone * operator (since we preprocessed *param* patterns)
                        parameters.push({
                            name: '*',
                            type: 'operator',
                            optional: optionalDepth > 0,
                            spread: false
                        });
                    } else if (char === ';') {
                        finishParam();
                    } else if (char !== ' ' && char !== '\t') {
                        // Start collecting parameter name
                        buffer = char;
                        state = STATES.IN_PARAM_NAME;
                    }
                    break;
                    
                case STATES.IN_OPTIONAL:
                    if (char === '\\' && nextChar === '*') {
                        // Escaped asterisk in optional block
                        parameters.push({
                            name: '*',
                            type: 'marker',
                            optional: true,
                            spread: false
                        });
                        i += 2; // Skip \*
                        continue;
                    } else if (char === '{') {
                        optionalDepth++;
                    } else if (char === '}') {
                        optionalDepth--;
                        if (optionalDepth === 0) {
                            state = STATES.NORMAL;
                        }
                    } else if (char === '*') {
                        // Standalone * operator in optional block
                        parameters.push({
                            name: '*',
                            type: 'operator',
                            optional: true,
                            spread: false
                        });
                    } else if (char === ';') {
                        finishParam();
                    } else if (char !== ' ' && char !== '\t') {
                        // Start collecting parameter name
                        buffer = char;
                        state = STATES.IN_PARAM_NAME;
                    }
                    break;
                    
                case STATES.IN_PARAM_NAME:
                    if (char === ':') {
                        // Direct transition to type
                        currentParam!.name = buffer.trim();
                        buffer = '';
                        state = STATES.IN_TYPE;
                    } else if (char === ';') {
                        // End of parameter
                        currentParam!.name = buffer.trim();
                        buffer = '';
                        finishParam();
                        state = optionalDepth > 0 ? STATES.IN_OPTIONAL : STATES.NORMAL;
                    } else if (char === '{') {
                        // Optional block starts - finish current param first
                        currentParam!.name = buffer.trim();
                        buffer = '';
                        finishParam();
                        optionalDepth++;
                        state = STATES.IN_OPTIONAL;
                    } else if (char === '}') {
                        // Optional block ends - finish current param first, then decrement depth
                        currentParam!.name = buffer.trim();
                        buffer = '';
                        finishParam();
                        optionalDepth--;
                        state = optionalDepth > 0 ? STATES.IN_OPTIONAL : STATES.NORMAL;
                    } else {
                        buffer += char;
                    }
                    break;
                    
                case STATES.IN_TYPE:
                    if (char === ';') {
                        // End of type
                        currentParam!.type = buffer.trim() || 'unknown';
                        buffer = '';
                        finishParam();
                        state = optionalDepth > 0 ? STATES.IN_OPTIONAL : STATES.NORMAL;
                    } else if (char === '{') {
                        // Optional block starts - finish current param first
                        currentParam!.type = buffer.trim() || 'unknown';
                        buffer = '';
                        finishParam();
                        optionalDepth++;
                        state = STATES.IN_OPTIONAL;
                    } else if (char === '}') {
                        // Optional block ends - finish current param first, then decrement depth
                        currentParam!.type = buffer.trim() || 'unknown';
                        buffer = '';
                        finishParam();
                        optionalDepth--;
                        state = optionalDepth > 0 ? STATES.IN_OPTIONAL : STATES.NORMAL;
                    } else {
                        buffer += char;
                    }
                    break;
            }
            
            i++;
        }
    
        // Handle any remaining parameter
        if (state === STATES.IN_TYPE) {
            currentParam!.type = buffer.trim() || 'unknown';
        }
        finishParam();
    
        return parameters;
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
