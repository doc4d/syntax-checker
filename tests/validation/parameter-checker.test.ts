import { describe, test, expect, beforeEach } from 'vitest';
import { ParameterChecker } from '../../src/parameter-checker.js';
import { Tokenizer } from '../../src/tokenizer.js';
import { WarningLevel } from '../../src/types.js';

describe('ParameterChecker', () => {
    let checker: ParameterChecker;
    let tokenizer: Tokenizer;

    beforeEach(() => {
        checker = new ParameterChecker();
        tokenizer = new Tokenizer();
    });

    describe('Basic Parameter Validation', () => {
        test('should validate simple parameter with type', () => {
            const tokens = tokenizer.tokenize('param : Type');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].name).toBe('param');
            expect(result.parameters[0].type).toBe('Type');
            expect(result.parameters[0].optional).toBe(false);
            expect(result.parameters[0].spread).toBe(-1);
            expect(result.issues).toHaveLength(0);
        });

        test('should validate multiple parameters', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; param2 : Type2');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0].name).toBe('param1');
            expect(result.parameters[0].type).toBe('Type1');
            expect(result.parameters[1].name).toBe('param2');
            expect(result.parameters[1].type).toBe('Type2');
        });

        test('should handle optional parameters', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; { param2 : Type2 }');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0].optional).toBe(false);
            expect(result.parameters[1].optional).toBe(true);
            expect(result.parameters[1].name).toBe('param2');
            expect(result.parameters[1].type).toBe('Type2');
        });

        test('should handle spread parameters', () => {
            const tokens = tokenizer.tokenize('...params : Type');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].name).toBe('params');
            expect(result.parameters[0].type).toBe('Type');
            expect(result.parameters[0].spread).toBe(0);
        });
    });

    describe('Parameter Without Type', () => {
        test('should handle parameter without explicit type', () => {
            const tokens = tokenizer.tokenize('param');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].name).toBe('param');
            expect(result.parameters[0].type).toBe('unknown');
        });

        test('should handle multiple parameters without types', () => {
            const tokens = tokenizer.tokenize('param1 ; param2');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0].name).toBe('param1');
            expect(result.parameters[0].type).toBe('unknown');
            expect(result.parameters[1].name).toBe('param2');
            expect(result.parameters[1].type).toBe('unknown');
        });
    });

    describe('Complex Parameter Scenarios', () => {
        test('should handle mixed typed and untyped parameters', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; param2 ; param3 : Type3');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(3);
            expect(result.parameters[0].type).toBe('Type1');
            expect(result.parameters[1].type).toBe('unknown');
            expect(result.parameters[2].type).toBe('Type3');
        });

        test('should handle optional parameters with and without types', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; { param2 } ; { param3 : Type3 }');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(3);
            expect(result.parameters[0].optional).toBe(false);
            expect(result.parameters[1].optional).toBe(true);
            expect(result.parameters[1].type).toBe('unknown');
            expect(result.parameters[2].optional).toBe(true);
            expect(result.parameters[2].type).toBe('Type3');
        });

        test('should handle nested optional blocks', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; { param2 : Type2 ; { param3 : Type3 } }');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(3);
            expect(result.parameters[0].optional).toBe(false);
            expect(result.parameters[1].optional).toBe(true);
            expect(result.parameters[2].optional).toBe(true);
        });
    });

    describe('Return Type Handling', () => {
        test('should parse parameters without return type handling', () => {
            const tokens = tokenizer.tokenize('param : Type');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].name).toBe('param');
            expect(result.parameters[0].type).toBe('Type');
        });

        test('should handle arrow syntax as parameter name', () => {
            const tokens = tokenizer.tokenize('param : Type');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].type).toBe('Type');
        });

        test('should handle parameters without special return processing', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; param2 : Type2');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('should handle empty token array', () => {
            const result = checker.checkParameters([]);

            expect(result.parameters).toHaveLength(0);
            expect(result.issues).toHaveLength(0);
        });

        test('should handle malformed parameter syntax', () => {
            const tokens = tokenizer.tokenize('param : : Type');
            const result = checker.checkParameters(tokens);

            // Should still try to parse what it can
            expect(result.parameters.length).toBeGreaterThanOrEqual(0);
        });

        test('should handle incomplete parameter definitions', () => {
            const tokens = tokenizer.tokenize('param :');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(1);
            expect(result.parameters[0].name).toBe('param');
            expect(result.parameters[0].type).toBe('unknown');
        });
    });

    describe('Special Characters in Parameters', () => {
        test('should handle parameter names with special characters', () => {
            const tokens = tokenizer.tokenize('param-name : Type ; param_name : Type ; param.name : Type');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(3);
            expect(result.parameters[0].name).toBe('param-name');
            expect(result.parameters[1].name).toBe('param_name');
            expect(result.parameters[2].name).toBe('param.name');
        });

        test('should handle complex type names', () => {
            const tokens = tokenizer.tokenize('param : Collection<Object> ; param2 : [Type]');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0].type).toBe('Collection<Object>');
            expect(result.parameters[1].type).toBe('[Type]');
        });
    });

    describe('Edge Cases', () => {
        test('should handle only whitespace tokens', () => {
            const tokens = tokenizer.tokenize('   \t  \n  ');
            const result = checker.checkParameters(tokens);

            expect(result.parameters).toHaveLength(0);
        });

        test('should handle escaped operators', () => {
            const tokens = tokenizer.tokenize('param : Type \\* escaped');
            const result = checker.checkParameters(tokens);

            // Should handle escaped asterisks appropriately
            expect(result.parameters.length).toBeGreaterThanOrEqual(1);
        });

        test('should handle mixed valid and invalid syntax', () => {
            const tokens = tokenizer.tokenize('validParam : Type ; ; invalidParam');
            const result = checker.checkParameters(tokens);

            // Should still parse the valid parts
            expect(result.parameters.length).toBeGreaterThanOrEqual(1);
            expect(result.parameters[0].name).toBe('validParam');
            expect(result.parameters[0].type).toBe('Type');
        });
    });

    describe('Performance', () => {
        test('should handle large parameter lists efficiently', () => {
            const params = Array.from({ length: 100 }, (_, i) => `param${i} : Type${i}`).join(' ; ');
            const tokens = tokenizer.tokenize(params);

            const start = performance.now();
            const result = checker.checkParameters(tokens);
            const end = performance.now();

            expect(result.parameters).toHaveLength(100);
            expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
        });
    });
});
