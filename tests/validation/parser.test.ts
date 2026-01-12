import { describe, test, expect, beforeEach } from 'vitest';
import { Parser, WarningLevel } from '../../src/parser.js';

describe('Parser', () => {
    let parser: Parser;

    beforeEach(() => {
        parser = new Parser();
    });

    describe('Basic Syntax Parsing', () => {
        test('should parse simple property syntax', () => {
            const result = parser.parseSyntax('**.root** : 4D.ZipFolder');

            expect(result).toHaveLength(1);
            expect(result[0].variant).toBe('**.root** : 4D.ZipFolder');
            expect(result[0].parameters).toHaveLength(0);
            expect(result[0].malformation).toBeUndefined();
        });

        test('should parse function syntax with parameters', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].variant).toBe('**myFunction** ( param : Type )');
            expect(result[0].parameters).toHaveLength(1);
            expect(result[0].parameters[0].name).toBe('param');
            expect(result[0].parameters[0].type).toBe('Type');
        });

        test('should parse multiple parameters', () => {
            const result = parser.parseSyntax('**myFunction** ( param1 : Type1 ; param2 : Type2 )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(2);
            expect(result[0].parameters[0].name).toBe('param1');
            expect(result[0].parameters[1].name).toBe('param2');
        });

        test('should handle optional parameters', () => {
            const result = parser.parseSyntax('**myFunction** ( param1 : Type1 ; { param2 : Type2 } )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(2);
            expect(result[0].parameters[0].optional).toBe(false);
            expect(result[0].parameters[1].optional).toBe(true);
        });
    });

    describe('Multiple Variants', () => {
        test('should parse multiple syntax variants separated by <br/>', () => {
            const syntax = '**func** ( param1 : Type1 )<br/>**func** ( param1 : Type1 ; param2 : Type2 )';
            const result = parser.parseSyntax(syntax);

            expect(result).toHaveLength(2);
            expect(result[0].parameters).toHaveLength(1);
            expect(result[1].parameters).toHaveLength(2);
        });

        test('should handle empty variants in multi-variant syntax', () => {
            const syntax = '**func** ( param : Type )<br/><br/>**func** ( param1 : Type1 ; param2 : Type2 )';
            const result = parser.parseSyntax(syntax);

            expect(result).toHaveLength(2);
            expect(result[0].parameters).toHaveLength(1);
            expect(result[1].parameters).toHaveLength(2);
        });

        test('should trim whitespace from variants', () => {
            const syntax = '  **func** ( param : Type )  <br/>  **func** ( )  ';
            const result = parser.parseSyntax(syntax);

            expect(result).toHaveLength(2);
            expect(result[0].variant).toBe('**func** ( param : Type )');
            expect(result[1].variant).toBe('**func** ( )');
        });
    });

    describe('Return Type Parsing', () => {
        test('should parse return type in function syntax', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type ) -> ReturnType');

            expect(result).toHaveLength(1);
            expect(result[0].returnType).toBeDefined();
            expect(result[0].returnType?.name).toBe('ReturnType');
        });

        test('should parse named return type', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type ) -> result : ReturnType');

            expect(result).toHaveLength(1);
            expect(result[0].returnType).toBeDefined();
            expect(result[0].returnType?.name).toBe('result');
            expect(result[0].returnType?.type).toBe('ReturnType');
        });

        test('should handle function without return type', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].returnType).toBeUndefined();
        });
    });

    describe('Malformation Detection', () => {
        test('should detect missing closing parenthesis', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type');

            expect(result).toHaveLength(1);
            expect(result[0].malformation?.isMalformed).toBe(true);
            expect(result[0].malformation?.issues).toContainEqual(
                expect.objectContaining({
                    message: 'Missing closing parenthesis',
                    level: WarningLevel.LEVEL_1
                })
            );
        });

        test('should detect unclosed optional blocks', () => {
            const result = parser.parseSyntax('**myFunction** ( param1 : Type1 ; { param2 : Type2 )');

            expect(result).toHaveLength(1);
            expect(result[0].malformation?.isMalformed).toBe(true);
            expect(result[0].malformation?.issues.some(issue =>
                issue.message.includes('Unclosed optional block')
            )).toBe(true);
        });

        test('should handle well-formed syntax without malformations', () => {
            const result = parser.parseSyntax('**myFunction** ( param : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].malformation?.issues[0].id).contain('MAL013');
        });
    });

    describe('Complex Parameter Scenarios', () => {
        test('should handle spread parameters', () => {
            const result = parser.parseSyntax('**myFunction** ( ...params : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(1);
            expect(result[0].parameters[0].spread).toBe(0);
            expect(result[0].parameters[0].name).toBe('params');
        });

        test('should handle nested optional parameters', () => {
            const result = parser.parseSyntax('**myFunction** ( param1 : Type1 ; { param2 : Type2 ; { param3 : Type3 } } )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(3);
            expect(result[0].parameters[0].optional).toBe(false);
            expect(result[0].parameters[1].optional).toBe(true);
            expect(result[0].parameters[2].optional).toBe(true);
        });

        test('should handle parameters without types', () => {
            const result = parser.parseSyntax('**myFunction** ( param1 ; param2 : Type2 )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(2);
            expect(result[0].parameters[0].type).toBe('unknown');
            expect(result[0].parameters[1].type).toBe('Type2');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty syntax', () => {
            const result = parser.parseSyntax('');

            expect(result).toHaveLength(0);
        });

        test('should handle whitespace-only syntax', () => {
            const result = parser.parseSyntax('   \t  \n  ');

            expect(result).toHaveLength(0);
        });

        test('should handle syntax with only command name', () => {
            const result = parser.parseSyntax('**commandName**');

            expect(result).toHaveLength(1);
            expect(result[0].variant).toBe('**commandName**');
            expect(result[0].parameters).toHaveLength(0);
        });

        test('should handle empty parameter list', () => {
            const result = parser.parseSyntax('**myFunction** ( )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(0);
        });

        test('should handle parameter list with only whitespace', () => {
            const result = parser.parseSyntax('**myFunction** (   \t  )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(0);
        });
    });

    describe('Complex Type Names', () => {
        test('should handle generic types', () => {
            const result = parser.parseSyntax('**myFunction** ( collection : Collection<Object> )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].type).toBe('Collection<Object>');
        });

        test('should handle array types', () => {
            const result = parser.parseSyntax('**myFunction** ( items : [String] )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].type).toBe('[String]');
        });

        test('should handle namespace types', () => {
            const result = parser.parseSyntax('**myFunction** ( obj : 4D.Class )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].type).toBe('4D.Class');
        });
    });

    describe('Special Characters in Parameter Names', () => {
        test('should handle hyphens in parameter names', () => {
            const result = parser.parseSyntax('**myFunction** ( param-name : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].name).toBe('param-name');
        });

        test('should handle underscores in parameter names', () => {
            const result = parser.parseSyntax('**myFunction** ( param_name : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].name).toBe('param_name');
        });

        test('should handle dots in parameter names', () => {
            const result = parser.parseSyntax('**myFunction** ( param.name : Type )');

            expect(result).toHaveLength(1);
            expect(result[0].parameters[0].name).toBe('param.name');
        });
    });

    describe('Performance', () => {
        test('should handle large syntax definitions efficiently', () => {
            const params = Array.from({ length: 50 }, (_, i) => `param${i} : Type${i}`).join(' ; ');
            const syntax = `**largeFunction** ( ${params} )`;

            const start = performance.now();
            const result = parser.parseSyntax(syntax);
            const end = performance.now();

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(50);
            expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
        });

        test('should handle many variants efficiently', () => {
            const variants = Array.from({ length: 20 }, (_, i) =>
                `**func** ( param${i} : Type${i} )`
            ).join('<br/>');

            const start = performance.now();
            const result = parser.parseSyntax(variants);
            const end = performance.now();

            expect(result).toHaveLength(20);
            expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
        });
    });

    describe('Real-world Examples', () => {
        test('should parse WebSocket.send() style syntax', () => {
            const syntax = '**WebSocket.send** ( message : Text ; { callback : 4D.Function } )';
            const result = parser.parseSyntax(syntax);

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(2);
            expect(result[0].parameters[0].name).toBe('message');
            expect(result[0].parameters[0].type).toBe('Text');
            expect(result[0].parameters[1].name).toBe('callback');
            expect(result[0].parameters[1].type).toBe('4D.Function');
            expect(result[0].parameters[1].optional).toBe(true);
        });

        test('should parse Collection.concat() style syntax', () => {
            const syntax = '**Collection.concat** ( ...collections : Collection ) -> Collection';
            const result = parser.parseSyntax(syntax);

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(1);
            expect(result[0].parameters[0].spread).toBe(0);
            expect(result[0].returnType?.name).toBe('Collection');
        });
    });
});
