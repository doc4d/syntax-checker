import { describe, it, expect, beforeEach } from 'vitest';
import { Tokenizer, TokenType, Token } from '../../src/tokenizer';

describe('Tokenizer', () => {
    let tokenizer: Tokenizer;

    beforeEach(() => {
        tokenizer = new Tokenizer();
    });

    describe('Basic Token Types', () => {
        it('should tokenize a simple parameter with colon and type', () => {
            const result = tokenizer.tokenize('param : Text');

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param',
                position: 0
            });
            expect(result[1]).toEqual({
                type: TokenType.COLON,
                value: ':',
                position: 6
            });
            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Text',
                position: 8
            });
        });

        it('should tokenize semicolons correctly', () => {
            const result = tokenizer.tokenize('param1 : Text ; param2 : Integer');

            const semicolonToken = result.find(token => token.type === TokenType.SEMICOLON);
            expect(semicolonToken).toEqual({
                type: TokenType.SEMICOLON,
                value: ';',
                position: 14
            });
        });

        it('should tokenize braces correctly', () => {
            const result = tokenizer.tokenize('{ param : Text }');

            expect(result[0]).toEqual({
                type: TokenType.OPEN_BRACE,
                value: '{',
                position: 0
            });
            expect(result[result.length - 1]).toEqual({
                type: TokenType.CLOSE_BRACE,
                value: '}',
                position: 15
            });
        });

        it('should tokenize operators (asterisks) correctly', () => {
            const result = tokenizer.tokenize('param : Text ; *');

            const operatorToken = result.find(token => token.type === TokenType.OPERATOR);
            expect(operatorToken).toEqual({
                type: TokenType.OPERATOR,
                value: '*',
                position: 15
            });
        });

        it('should tokenize escaped asterisks correctly', () => {
            const result = tokenizer.tokenize('param : Text ; \\*');

            const escapedToken = result.find(token => token.type === TokenType.ESCAPED_ASTERISK);
            expect(escapedToken).toEqual({
                type: TokenType.ESCAPED_ASTERISK,
                value: '\\*',
                position: 15
            });
        });
    });

    describe('Spread Parameters', () => {
        it('should tokenize spread parameters correctly', () => {
            const result = tokenizer.tokenize('...spreadParam : Collection');

            expect(result[0]).toEqual({
                type: TokenType.SPREAD,
                value: '...spreadParam',
                position: 0
            });
            expect(result[1]).toEqual({
                type: TokenType.COLON,
                value: ':',
                position: 15
            });
            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Collection',
                position: 17
            });
        });

        it('should handle spread with complex parameter names', () => {
            const result = tokenizer.tokenize('...param_name : Text');

            expect(result[0]).toEqual({
                type: TokenType.SPREAD,
                value: '...param_name',
                position: 0
            });
        });

        it('should handle spread parameters with special characters', () => {
            const result = tokenizer.tokenize('...param-name.test : Object');

            expect(result[0]).toEqual({
                type: TokenType.SPREAD,
                value: '...param-name.test',
                position: 0
            });
        });
    });

    describe('Complex Parameter Names', () => {
        it('should handle parameter names with underscores', () => {
            const result = tokenizer.tokenize('param_name : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param_name',
                position: 0
            });
        });

        it('should handle parameter names with hyphens', () => {
            const result = tokenizer.tokenize('param-name : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param-name',
                position: 0
            });
        });

        it('should handle parameter names with dots', () => {
            const result = tokenizer.tokenize('param.name : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param.name',
                position: 0
            });
        });

        it('should handle parameter names with numbers', () => {
            const result = tokenizer.tokenize('param123 : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param123',
                position: 0
            });
        });

        it('should handle parameter names with special characters', () => {
            const result = tokenizer.tokenize('param$name : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param$name',
                position: 0
            });
        });
    });

    describe('Complex Types', () => {
        it('should handle types with forward slashes', () => {
            const result = tokenizer.tokenize('param : Text/Object/Number');

            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Text/Object/Number',
                position: 8
            });
        });

        it('should handle types with brackets', () => {
            const result = tokenizer.tokenize('param : Array[Text]');

            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Array[Text]',
                position: 8
            });
        });

        it('should handle types with angle brackets', () => {
            const result = tokenizer.tokenize('param : Generic<Type>');

            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Generic<Type>',
                position: 8
            });
        });

        it('should handle complex namespace types', () => {
            const result = tokenizer.tokenize('param : cs.ViewPro.TableTheme');

            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'cs.ViewPro.TableTheme',
                position: 8
            });
        });
    });

    describe('Context-Based Type Detection', () => {
        it('should detect parameter names after semicolons', () => {
            const result = tokenizer.tokenize('param1 : Text ; param2 : Integer');

            expect(result[4]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param2',
                position: 16
            });
        });

        it('should detect parameter names after open braces', () => {
            const result = tokenizer.tokenize('{ param : Text }');

            expect(result[1]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param',
                position: 2
            });
        });

        it('should detect types after colons', () => {
            const result = tokenizer.tokenize('param1 : Text ; param2 : Integer');

            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Text',
                position: 9
            });
            expect(result[6]).toEqual({
                type: TokenType.TYPE,
                value: 'Integer',
                position: 25
            });
        });

        it('should default to parameter name when no context', () => {
            const result = tokenizer.tokenize('standalone');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'standalone',
                position: 0
            });
        });
    });

    describe('Whitespace Handling', () => {
        it('should skip whitespace without creating tokens', () => {
            const result = tokenizer.tokenize('  param   :   Text  ');

            expect(result).toHaveLength(3);
            expect(result.map(t => t.value)).toEqual(['param', ':', 'Text']);
        });

        it('should handle tabs and newlines', () => {
            const result = tokenizer.tokenize('\tparam\n:\rText\n');

            expect(result).toHaveLength(3);
            expect(result.map(t => t.value)).toEqual(['param', ':', 'Text']);
        });

        it('should maintain correct positions despite whitespace', () => {
            const result = tokenizer.tokenize('  param  :  Text');

            expect(result[0].position).toBe(2);  // 'param' starts at position 2
            expect(result[1].position).toBe(9);  // ':' at position 9
            expect(result[2].position).toBe(12); // 'Text' starts at position 12
        });
    });

    describe('Unicode Support', () => {
        it('should handle Unicode parameter names', () => {
            const result = tokenizer.tokenize('paramètre : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'paramètre',
                position: 0
            });
        });

        it('should handle Chinese characters', () => {
            const result = tokenizer.tokenize('参数 : Text');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: '参数',
                position: 0
            });
        });

        it('should handle mixed Unicode and ASCII', () => {
            const result = tokenizer.tokenize('paramétreABC123 : Texte');

            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'paramétreABC123',
                position: 0
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings', () => {
            const result = tokenizer.tokenize('');

            expect(result).toHaveLength(0);
        });

        it('should handle strings with only whitespace', () => {
            const result = tokenizer.tokenize('   \t\n  ');

            expect(result).toHaveLength(0);
        });

        it('should handle consecutive operators', () => {
            const result = tokenizer.tokenize('param : Text ; * ; *');

            const operators = result.filter(token => token.type === TokenType.OPERATOR);
            expect(operators).toHaveLength(2);
            expect(operators[0].value).toBe('*');
            expect(operators[1].value).toBe('*');
        });

        it('should handle consecutive escaped asterisks', () => {
            const result = tokenizer.tokenize('param : Text ; \\* ; \\*');

            const escaped = result.filter(token => token.type === TokenType.ESCAPED_ASTERISK);
            expect(escaped).toHaveLength(2);
            expect(escaped[0].value).toBe('\\*');
            expect(escaped[1].value).toBe('\\*');
        });

        it('should handle malformed spread operators', () => {
            const result = tokenizer.tokenize('..param : Text');

            // Should treat as regular parameter name, not spread
            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: '..param',
                position: 0
            });
        });

        it('should handle incomplete escaped asterisks at end', () => {
            const result = tokenizer.tokenize('param : Text \\');

            // The backslash should be skipped as it's not a valid identifier character or escaped asterisk
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                type: TokenType.PARAMETER_NAME,
                value: 'param',
                position: 0
            });
            expect(result[1]).toEqual({
                type: TokenType.COLON,
                value: ':',
                position: 6
            });
            expect(result[2]).toEqual({
                type: TokenType.TYPE,
                value: 'Text',
                position: 8
            });
        });
    });

    describe('Complex Real-World Examples', () => {
        it('should tokenize WebSocket.send() style parameters', () => {
            const result = tokenizer.tokenize('url : Text { ; data : Text/Blob/Object } { ; options : Object }');

            expect(result.length).toBeGreaterThan(10);
            expect(result[0].value).toBe('url');
            expect(result[1].value).toBe(':');
            expect(result[2].value).toBe('Text');
            expect(result[3].value).toBe('{');
        });

        it('should tokenize spread parameters with optional blocks', () => {
            const result = tokenizer.tokenize('value : any { ; ...valueN : any }');

            const spreadToken = result.find(token => token.type === TokenType.SPREAD);
            expect(spreadToken?.value).toBe('...valueN');
        });

        it('should tokenize complex namespace types', () => {
            const result = tokenizer.tokenize('theme : cs.ViewPro.TableTheme ; callback : Function');

            expect(result[2].value).toBe('cs.ViewPro.TableTheme');
            expect(result[4].value).toBe('callback');
            expect(result[6].value).toBe('Function');
        });

        it('should handle mixed operators and escaped asterisks', () => {
            const result = tokenizer.tokenize('param : Text ; * ; \\* ; otherParam : Integer');

            const tokens = result.map(t => ({ type: t.type, value: t.value }));
            expect(tokens).toContainEqual({ type: TokenType.OPERATOR, value: '*' });
            expect(tokens).toContainEqual({ type: TokenType.ESCAPED_ASTERISK, value: '\\*' });
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large parameter strings efficiently', () => {
            // Create a moderately large parameter string
            const params = Array.from({ length: 10 }, (_, i) => `param${i} : Type${i}`).join(' ; ');

            const result = tokenizer.tokenize(params);

            expect(result.length).toBe(39); // 10 params * 3 tokens each (name, colon, type) + 9 semicolons = 39
            expect(result[0].value).toBe('param0');
            expect(result[38].value).toBe('Type9');
        });

        it('should maintain accurate positions in large strings', () => {
            const params = Array.from({ length: 5 }, (_, i) => `param${i} : Type${i}`).join(' ; ');
            const result = tokenizer.tokenize(params);

            // Check that positions are monotonically increasing
            for (let i = 1; i < result.length; i++) {
                expect(result[i].position).toBeGreaterThanOrEqual(result[i - 1].position);
            }
        });
    });
});
