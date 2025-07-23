/**
 * Token types for parameter parsing
 */
export enum TokenType {
    PARAMETER_NAME = 'parameter_name',
    COLON = 'colon',
    TYPE = 'type',
    SEMICOLON = 'semicolon',
    OPEN_BRACE = 'open_brace',
    CLOSE_BRACE = 'close_brace',
    OPERATOR = 'operator',
    WHITESPACE = 'whitespace',
    SPREAD = 'spread',
    ESCAPED_ASTERISK = 'escaped_asterisk'
}

/**
 * Token interface
 */
export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

/**
 * Tokenizer for parameter strings
 */
export class Tokenizer {
    private input: string = '';
    private position: number = 0;
    private tokens: Token[] = [];

    /**
     * Tokenize a parameter string
     * @param input - The preprocessed parameter string to tokenize
     * @returns Array of tokens
     */
    tokenize(input: string): Token[] {
        this.input = input;
        this.position = 0;
        this.tokens = [];

        while (this.position < this.input.length) {
            this.scanToken();
        }

        return this.tokens;
    }

    /**
     * Fast token scanning with minimal method calls
     */
    private scanToken(): void {
        const char = this.input[this.position];

        // Skip whitespace without creating tokens (we don't need them)
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
            this.position++;
            return;
        }

        // Handle escaped asterisks
        if (char === '\\' && this.position + 1 < this.input.length && this.input[this.position + 1] === '*') {
            this.tokens.push({
                type: TokenType.ESCAPED_ASTERISK,
                value: '\\*',
                position: this.position
            });
            this.position += 2;
            return;
        }

        // Handle single character tokens
        switch (char) {
            case ':':
                this.tokens.push({
                    type: TokenType.COLON,
                    value: char,
                    position: this.position
                });
                this.position++;
                break;
            case ';':
                this.tokens.push({
                    type: TokenType.SEMICOLON,
                    value: char,
                    position: this.position
                });
                this.position++;
                break;
            case '{':
                this.tokens.push({
                    type: TokenType.OPEN_BRACE,
                    value: char,
                    position: this.position
                });
                this.position++;
                break;
            case '}':
                this.tokens.push({
                    type: TokenType.CLOSE_BRACE,
                    value: char,
                    position: this.position
                });
                this.position++;
                break;
            case '*':
                this.tokens.push({
                    type: TokenType.OPERATOR,
                    value: char,
                    position: this.position
                });
                this.position++;
                break;
            default:
                // Handle identifiers (parameter names and types)
                this.scanIdentifier();
                break;
        }
    }

    /**
     * Fast identifier scanning
     */
    private scanIdentifier(): void {
        const start = this.position;
        
        // Handle spread operator (...) at the beginning
        if (this.input[this.position] === '.' && 
            this.position + 1 < this.input.length && this.input[this.position + 1] === '.' &&
            this.position + 2 < this.input.length && this.input[this.position + 2] === '.') {
            
            this.position += 3; // Skip the three dots
            
            // Continue reading the identifier after spread
            while (this.position < this.input.length && this.isIdentifierChar(this.input[this.position])) {
                this.position++;
            }
            
            const value = this.input.substring(start, this.position);
            this.tokens.push({
                type: TokenType.SPREAD,
                value,
                position: start
            });
            return;
        }

        // Regular identifier
        while (this.position < this.input.length && this.isIdentifierChar(this.input[this.position])) {
            this.position++;
        }

        if (this.position > start) {
            const value = this.input.substring(start, this.position);
            
            // Simple context-based type determination
            const tokenType = this.determineIdentifierType();
            this.tokens.push({
                type: tokenType,
                value,
                position: start
            });
        } else {
            // If no valid identifier characters were found, skip this character to avoid infinite loop
            this.position++;
        }
    }

    /**
     * Fast identifier character check
     */
    private isIdentifierChar(char: string): boolean {
        const code = char.charCodeAt(0);
        return (code >= 48 && code <= 57) ||   // 0-9
               (code >= 65 && code <= 90) ||   // A-Z
               (code >= 97 && code <= 122) ||  // a-z
               char === '_' || char === '-' || char === '$' || char === '.' || char === '/' || char === '[' || char === ']' || 
               char === '<' || char === '>' || code > 127; // Unicode
    }

    /**
     * Fast type determination based on previous token
     */
    private determineIdentifierType(): TokenType {
        // Look at the last token to determine context
        for (let i = this.tokens.length - 1; i >= 0; i--) {
            const token = this.tokens[i];
            
            switch (token.type) {
                case TokenType.COLON:
                    return TokenType.TYPE;
                case TokenType.SEMICOLON:
                case TokenType.OPEN_BRACE:
                    return TokenType.PARAMETER_NAME;
                case TokenType.PARAMETER_NAME:
                case TokenType.SPREAD:
                case TokenType.TYPE:
                    return TokenType.PARAMETER_NAME;
                default:
                    continue;
            }
        }
        
        // Default to parameter name if no context
        return TokenType.PARAMETER_NAME;
    }
}
