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
    OPEN_PAREN = 'open_paren',
    CLOSE_PAREN = 'close_paren',
    ARROW = 'arrow',
    OPERATOR = 'operator',
    SPREAD = 'spread',
    ESCAPED_ASTERISK = 'escaped_asterisk',
    LT = '<',
    GT = '>'
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
    private lastContextToken: TokenType | null = null;
    
    // Pre-computed lookup table for identifier characters (ASCII 0-127)
    private static readonly IDENTIFIER_CHARS = (() => {
        const lookup = new Array(128).fill(false);
        // 0-9
        for (let i = 48; i <= 57; i++) lookup[i] = true;
        // A-Z
        for (let i = 65; i <= 90; i++) lookup[i] = true;
        // a-z  
        for (let i = 97; i <= 122; i++) lookup[i] = true;
        // Special chars
        lookup[95] = true;  // _
        lookup[45] = true;  // -
        lookup[36] = true;  // $
        lookup[46] = true;  // .
        lookup[47] = true;  // /
        lookup[91] = true;  // [
        lookup[93] = true;  // ]
        lookup[60] = true;  // <
        lookup[62] = true;  // >
        return lookup;
    })();

    /**
     * Tokenize a parameter string
     * @param input - The preprocessed parameter string to tokenize
     * @returns Array of tokens
     */
    tokenize(input: string): Token[] {
        this.input = input;
        this.position = 0;
        this.tokens = [];
        this.lastContextToken = null;

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
            this.addToken(TokenType.ESCAPED_ASTERISK, '\\*', this.position);
            this.position += 2;
            return;
        }

        // Handle arrow operator (->)
        if (char === '-' && this.position + 1 < this.input.length && this.input[this.position + 1] === '>') {
            this.addToken(TokenType.ARROW, '->', this.position);
            this.position += 2;
            return;
        }

        // Handle single character tokens
        switch (char) {
            case ':':
                this.addToken(TokenType.COLON, char, this.position);
                this.position++;
                break;
            case ';':
                this.addToken(TokenType.SEMICOLON, char, this.position);
                this.position++;
                break;
            case '{':
                this.addToken(TokenType.OPEN_BRACE, char, this.position);
                this.position++;
                break;
            case '}':
                this.addToken(TokenType.CLOSE_BRACE, char, this.position);
                this.position++;
                break;
            case '(':
                this.addToken(TokenType.OPEN_PAREN, char, this.position);
                this.position++;
                break;
            case ')':
                this.addToken(TokenType.CLOSE_PAREN, char, this.position);
                this.position++;
                break;
            case '*':
                this.addToken(TokenType.OPERATOR, char, this.position);
                this.position++;
                break;
            case '<':
                this.addToken(TokenType.LT, char, this.position);
                this.position++;
                break;
            case '>':
                this.addToken(TokenType.GT, char, this.position);
                this.position++;
                break;
            default:
                // Handle identifiers (parameter names and types)
                this.scanIdentifier();
                break;
        }
    }

    /**
     * Centralized token creation and context tracking
     */
    private addToken(type: TokenType, value: string, position: number): void {
        this.tokens.push({
            type,
            value,
            position
        });
        
        // Update context after token is added
        this.lastContextToken = type;
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
            this.addToken(TokenType.SPREAD, value, start);
            return;
        }

        // Regular identifier
        while (this.position < this.input.length && this.isIdentifierChar(this.input[this.position])) {
            this.position++;
        }

        if (this.position > start) {
            const value = this.input.substring(start, this.position);
            
            // Fast context-based type determination using cached context
            const tokenType = this.determineIdentifierTypeFast();
            this.addToken(tokenType, value, start);
        } else {
            // If no valid identifier characters were found, skip this character to avoid infinite loop
            this.position++;
        }
    }

    /**
     * Optimized identifier character check using lookup table
     */
    private isIdentifierChar(char: string): boolean {
        const code = char.charCodeAt(0);
        
        // Fast lookup for ASCII characters (covers 99% of cases)
        if (code < 128) {
            return Tokenizer.IDENTIFIER_CHARS[code];
        }
        
        // Unicode fallback (slower but necessary for international chars)
        return code > 127;
    }

    /**
     * Fast type determination using cached context (O(1) instead of O(n))
     */
    private determineIdentifierTypeFast(): TokenType {
        // Use cached context for instant determination
        switch (this.lastContextToken) {
            case TokenType.COLON:
                return TokenType.TYPE;
            case TokenType.SEMICOLON:
            case TokenType.OPEN_BRACE:
            case TokenType.OPEN_PAREN:
                return TokenType.PARAMETER_NAME;
            case TokenType.PARAMETER_NAME:
            case TokenType.SPREAD:
            case TokenType.TYPE:
                return TokenType.PARAMETER_NAME;
            default:
                return TokenType.PARAMETER_NAME;
        }
    }
}
