/**
 * State machine states for parameter parsing
 */
const PARSER_STATES = {
    NORMAL: 'normal',
    IN_OPTIONAL: 'in_optional',
    IN_PARAM_NAME: 'in_param_name',
    IN_TYPE: 'in_type'
} as const;

type ParserStateType = typeof PARSER_STATES[keyof typeof PARSER_STATES];

/**
 * Parameter parser state interface
 */
interface ParameterParserState {
    state: ParserStateType;
    optionalDepth: number;
    currentParam: ParsedParameter | null;
    buffer: string;
    parameters: ParsedParameter[];
    malformationIssues: string[];
    lastProcessedChar: string;
}
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
 * Malformation information for parsed syntax
 */
export interface MalformationInfo {
    isMalformed: boolean;
    issues: string[];
}

/**
 * Result of parameter parsing including malformation info
 */
interface ParameterParsingResult {
    parameters: ParsedParameter[];
    malformationInfo: MalformationInfo;
}

/**
 * Variant interface for parsed syntax variants
 */
export interface ParsedVariant {
    variant: string;
    parameters: ParsedParameter[];
    returnType?: ParsedReturnType;
    malformation?: MalformationInfo;
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
                const malformation: MalformationInfo = {
                    isMalformed: true,
                    issues: paramStart === -1 ? ['Missing opening parenthesis'] : ['Missing closing parenthesis']
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

            const cleanedParamString = this.preprocessParameterString(paramString);
            const parsingResult = this.parseParametersWithStateMachine(cleanedParamString);
            
            // The malformation detection is now handled entirely within the state machine
            const finalMalformation: MalformationInfo = parsingResult.malformationInfo;
            
            // Parse return type information after the closing parenthesis
            const returnType = this.parseReturnType(trimmedVariant, paramEnd + 1);
            
            const parsedVariant: ParsedVariant = { 
                variant: trimmedVariant, 
                parameters: parsingResult.parameters
            };
            
            if (returnType) {
                parsedVariant.returnType = returnType;
            }
            
            if (finalMalformation.isMalformed) {
                parsedVariant.malformation = finalMalformation;
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
        const cleanedParamString = this.preprocessParameterString(paramString);
        const result = this.parseParametersWithStateMachine(cleanedParamString);
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
        // This handles patterns like *paramName* and *...paramName*
        // But NOT standalone asterisks (operators/markers)
        // Handle spread patterns first
        cleanedParamString = cleanedParamString.replace(/\*(\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        cleanedParamString = cleanedParamString.replace(/\*([;]\.\.\.[^*:;{}() ]+)\*/gu, '$1');
        // Then handle regular parameters - use more permissive pattern for Unicode
        cleanedParamString = cleanedParamString.replace(/\*([^*:;{}() ]+)\*/gu, '$1');
        
        // Restore escaped asterisks
        cleanedParamString = cleanedParamString.replace(/___ESCAPED_ASTERISK___/g, '\\*');
        
        return cleanedParamString;
    }

    /**
     * Parse parameters using state machine
     * @param cleanedParamString - The preprocessed parameter string
     * @returns Object containing parsed parameters and malformation info
     */
    private parseParametersWithStateMachine(cleanedParamString: string): ParameterParsingResult {
        const parserState: ParameterParserState = {
            state: PARSER_STATES.NORMAL,
            optionalDepth: 0,
            currentParam: null,
            buffer: '',
            parameters: [],
            malformationIssues: [],
            lastProcessedChar: ''
        };
        
        this.resetParam(parserState);
        
        let i = 0;
        while (i < cleanedParamString.length) {
            const char = cleanedParamString[i];
            const nextChar = cleanedParamString[i + 1];
            
            const result = this.processCharacter(parserState, char, nextChar);
            
            // Update last processed character (skip whitespace for tracking)
            if (char !== ' ' && char !== '\t') {
                parserState.lastProcessedChar = char;
            }
            
            if (result.skipNext) {
                i += 2;
            } else {
                i++;
            }
        }
        
        // Handle any remaining parameter and check for final state consistency
        if (parserState.state === PARSER_STATES.IN_TYPE) {
            parserState.currentParam!.type = parserState.buffer.trim() || 'unknown';
        } else if (parserState.state === PARSER_STATES.IN_PARAM_NAME) {
            // We ended in parameter name state - this means no type was provided
            parserState.malformationIssues.push(`Parameter '${parserState.buffer.trim()}' has no type (missing colon)`);
        }
        
        this.finishParam(parserState);
        
        // Check for unclosed optional blocks
        if (parserState.optionalDepth > 0) {
            parserState.malformationIssues.push(`Unclosed optional block (missing ${parserState.optionalDepth} closing brace${parserState.optionalDepth > 1 ? 's' : ''})`);
        } else if (parserState.optionalDepth < 0) {
            parserState.malformationIssues.push(`Extra closing brace (unmatched optional block closure)`);
        }
        
        return {
            parameters: parserState.parameters,
            malformationInfo: {
                isMalformed: parserState.malformationIssues.length > 0,
                issues: parserState.malformationIssues
            }
        };
    }

    /**
     * Reset current parameter in parser state
     * @param parserState - Parser state object
     */
    private resetParam(parserState: ParameterParserState): void {
        parserState.currentParam = {
            name: '',
            type: 'unknown',
            optional: false,
            spread: false
        };
    }

    /**
     * Finish current parameter and add to parameters array
     * @param parserState - Parser state object
     */
    private finishParam(parserState: ParameterParserState): void {
        if (parserState.currentParam && parserState.currentParam.name) {
            // Clean up name and type
            parserState.currentParam.name = parserState.currentParam.name.trim();
            parserState.currentParam.type = parserState.currentParam.type.trim();
            
            // Check for malformed parameter names
            if (parserState.currentParam.name.includes('*')) {
                parserState.malformationIssues.push(`Parameter name '${parserState.currentParam.name}' contains asterisks (likely malformed markup)`);
            }
            
            // Set optional if we're in optional block
            if (parserState.optionalDepth > 0) {
                parserState.currentParam.optional = true;
            }
            
            // Handle spread parameters
            if (parserState.currentParam.name.startsWith('...')) {
                parserState.currentParam.spread = true;
                parserState.currentParam.name = parserState.currentParam.name.slice(3);
            }
            
            // Only add if name is valid
            if (parserState.currentParam.name && 
                parserState.currentParam.name !== '}' && 
                parserState.currentParam.name !== '{' && 
                parserState.currentParam.name !== ';') {
                parserState.parameters.push(parserState.currentParam);
            }
        }
        this.resetParam(parserState);
    }

    /**
     * Process a character based on current state
     * @param parserState - Parser state object
     * @param char - Current character
     * @param nextChar - Next character
     * @returns Object indicating whether to skip the next character
     */
    private processCharacter(parserState: ParameterParserState, char: string, nextChar: string): { skipNext: boolean } {
        switch (parserState.state) {
            case PARSER_STATES.NORMAL:
                return this.handleNormalState(parserState, char, nextChar);
            case PARSER_STATES.IN_OPTIONAL:
                return this.handleOptionalState(parserState, char, nextChar);
            case PARSER_STATES.IN_PARAM_NAME:
                return this.handleParameterNameState(parserState, char);
            case PARSER_STATES.IN_TYPE:
                return this.handleTypeState(parserState, char);
            default:
                return { skipNext: false };
        }
    }

    /**
     * Handle character processing in NORMAL state
     * @param parserState - Parser state object
     * @param char - Current character
     * @param nextChar - Next character
     * @returns Object indicating whether to skip the next character
     */
    private handleNormalState(parserState: ParameterParserState, char: string, nextChar: string): { skipNext: boolean } {
        if (char === '\\' && nextChar === '*') {
            // Escaped asterisk - treat as operator like standalone *
            this.addSpecialParameter(parserState, '*', 'operator');
            return { skipNext: true };
        } else if (char === '{') {
            parserState.optionalDepth++;
            parserState.state = PARSER_STATES.IN_OPTIONAL;
        } else if (char === '}') {
            // Unexpected closing brace in normal state
            parserState.optionalDepth--;
            parserState.malformationIssues.push('Unexpected closing brace (no matching opening brace)');
        } else if (char === '*') {
            // Standalone * operator (since we preprocessed *param* patterns)
            this.addSpecialParameter(parserState, '*', 'operator');
        } else if (char === ';') {
            // Check for empty parameter cases:
            // 1. Double semicolon (previous char was ';')
            // 2. Semicolon at start (no current param, no previous non-whitespace content)
            // 3. Current param exists but has no name
            const isDoubleSeq = parserState.lastProcessedChar === ';';
            const isValidOptionalStart = parserState.lastProcessedChar === '{';
            const hasEmptyCurrentParam = parserState.currentParam && parserState.currentParam.name === '';
            const isAtStart = parserState.parameters.length === 0 && parserState.buffer.trim() === '';
            
            if (isDoubleSeq && !isValidOptionalStart) {
                parserState.malformationIssues.push('Empty parameter found (double semicolon)');
            } else if (isAtStart && !isValidOptionalStart) {
                parserState.malformationIssues.push('Empty parameter found (semicolon at start)');
            } else if (hasEmptyCurrentParam && parserState.buffer.trim() === '') {
                parserState.malformationIssues.push('Empty parameter found (double semicolon)');
            }
            
            this.finishParam(parserState);
        } else if (char === ':') {
            // Colon without parameter name
            parserState.malformationIssues.push('Unexpected colon (missing parameter name)');
        } else if (char !== ' ' && char !== '\t') {
            // Start collecting parameter name
            parserState.buffer = char;
            parserState.state = PARSER_STATES.IN_PARAM_NAME;
        }
        return { skipNext: false };
    }

    /**
     * Handle character processing in IN_OPTIONAL state
     * @param parserState - Parser state object
     * @param char - Current character
     * @param nextChar - Next character
     * @returns Object indicating whether to skip the next character
     */
    private handleOptionalState(parserState: ParameterParserState, char: string, nextChar: string): { skipNext: boolean } {
        if (char === '\\' && nextChar === '*') {
            // Escaped asterisk in optional block - treat as operator like standalone *
            this.addSpecialParameter(parserState, '*', 'operator', true);
            return { skipNext: true };
        } else if (char === '{') {
            parserState.optionalDepth++;
        } else if (char === '}') {
            parserState.optionalDepth--;
            if (parserState.optionalDepth === 0) {
                parserState.state = PARSER_STATES.NORMAL;
            } else if (parserState.optionalDepth < 0) {
                // This shouldn't happen, but let's handle it
                parserState.malformationIssues.push('Extra closing brace in optional block');
                parserState.optionalDepth = 0;
                parserState.state = PARSER_STATES.NORMAL;
            }
        } else if (char === '*') {
            // Standalone * operator in optional block
            this.addSpecialParameter(parserState, '*', 'operator', true);
        } else if (char === ';') {
            // Check if this is an empty parameter (double semicolon)
            // But NOT when we just entered the optional block (semicolon right after '{')
            const isEmpty = parserState.buffer.trim() === '' && 
                           parserState.currentParam && 
                           parserState.currentParam.name === '';
            const isDoubleSeq = parserState.lastProcessedChar === ';';
            const isValidOptionalStart = parserState.lastProcessedChar === '{';
            
            if (isEmpty && isDoubleSeq && !isValidOptionalStart) {
                parserState.malformationIssues.push('Empty parameter found (double semicolon)');
            }
            this.finishParam(parserState);
        } else if (char === ':') {
            // Colon without parameter name in optional block
            parserState.malformationIssues.push('Unexpected colon in optional block (missing parameter name)');
        } else if (char !== ' ' && char !== '\t') {
            // Start collecting parameter name
            parserState.buffer = char;
            parserState.state = PARSER_STATES.IN_PARAM_NAME;
        }
        return { skipNext: false };
    }

    /**
     * Handle character processing in IN_PARAM_NAME state
     * @param parserState - Parser state object
     * @param char - Current character
     * @returns Object indicating whether to skip the next character
     */
    private handleParameterNameState(parserState: ParameterParserState, char: string): { skipNext: boolean } {
        if (char === ':') {
            // Valid transition to type
            parserState.currentParam!.name = parserState.buffer.trim();
            parserState.buffer = '';
            parserState.state = PARSER_STATES.IN_TYPE;
        } else if (char === ';') {
            // End of parameter without type - this is a malformation
            const paramName = parserState.buffer.trim();
            parserState.currentParam!.name = paramName;
            parserState.malformationIssues.push(`Parameter '${paramName}' has no type (missing colon and type)`);
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.state = parserState.optionalDepth > 0 ? PARSER_STATES.IN_OPTIONAL : PARSER_STATES.NORMAL;
        } else if (char === '{') {
            // Optional block starts - finish current param first (without type)
            const paramName = parserState.buffer.trim();
            parserState.currentParam!.name = paramName;
            parserState.malformationIssues.push(`Parameter '${paramName}' has no type (missing colon and type before optional block)`);
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.optionalDepth++;
            parserState.state = PARSER_STATES.IN_OPTIONAL;
        } else if (char === '}') {
            // Optional block ends - finish current param first (without type)
            const paramName = parserState.buffer.trim();
            parserState.currentParam!.name = paramName;
            parserState.malformationIssues.push(`Parameter '${paramName}' has no type (missing colon and type before optional block end)`);
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.optionalDepth--;
            if (parserState.optionalDepth < 0) {
                parserState.malformationIssues.push('Extra closing brace (unmatched optional block closure)');
                parserState.optionalDepth = 0;
            }
            parserState.state = parserState.optionalDepth > 0 ? PARSER_STATES.IN_OPTIONAL : PARSER_STATES.NORMAL;
        } else {
            parserState.buffer += char;
        }
        return { skipNext: false };
    }

    /**
     * Handle character processing in IN_TYPE state
     * @param parserState - Parser state object
     * @param char - Current character
     * @returns Object indicating whether to skip the next character
     */
    private handleTypeState(parserState: ParameterParserState, char: string): { skipNext: boolean } {
        if (char === ';') {
            // Valid end of type
            parserState.currentParam!.type = parserState.buffer.trim() || 'unknown';
            if (!parserState.buffer.trim()) {
                parserState.malformationIssues.push(`Parameter '${parserState.currentParam!.name}' has empty type after colon`);
            }
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.state = parserState.optionalDepth > 0 ? PARSER_STATES.IN_OPTIONAL : PARSER_STATES.NORMAL;
        } else if (char === ':') {
            // Double colon - this is a malformation
            parserState.malformationIssues.push(`Double colon found in parameter '${parserState.currentParam!.name}' type definition`);
            parserState.buffer += char;
        } else if (char === '{') {
            // Optional block starts - finish current param first
            parserState.currentParam!.type = parserState.buffer.trim() || 'unknown';
            if (!parserState.buffer.trim()) {
                parserState.malformationIssues.push(`Parameter '${parserState.currentParam!.name}' has empty type before optional block`);
            }
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.optionalDepth++;
            parserState.state = PARSER_STATES.IN_OPTIONAL;
        } else if (char === '}') {
            // Optional block ends - finish current param first, then decrement depth
            parserState.currentParam!.type = parserState.buffer.trim() || 'unknown';
            if (!parserState.buffer.trim()) {
                parserState.malformationIssues.push(`Parameter '${parserState.currentParam!.name}' has empty type before optional block end`);
            }
            parserState.buffer = '';
            this.finishParam(parserState);
            parserState.optionalDepth--;
            if (parserState.optionalDepth < 0) {
                parserState.malformationIssues.push('Extra closing brace (unmatched optional block closure)');
                parserState.optionalDepth = 0;
            }
            parserState.state = parserState.optionalDepth > 0 ? PARSER_STATES.IN_OPTIONAL : PARSER_STATES.NORMAL;
        } else {
            parserState.buffer += char;
        }
        return { skipNext: false };
    }

    /**
     * Add a special parameter (like * operator or marker)
     * @param parserState - Parser state object
     * @param name - Parameter name
     * @param type - Parameter type
     * @param forceOptional - Force parameter to be optional
     */
    private addSpecialParameter(parserState: ParameterParserState, name: string, type: string, forceOptional: boolean = false): void {
        const param: ParsedParameter = {
            name: name,
            type: type,
            optional: forceOptional || parserState.optionalDepth > 0,
            spread: false
        };
        parserState.parameters.push(param);
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
