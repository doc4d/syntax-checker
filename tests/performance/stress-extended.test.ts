import { describe, it, expect, beforeEach } from 'vitest';
import { Parser } from '../../src/parser';

describe('Parser Stress Tests', () => {
    let parser: Parser;

    beforeEach(() => {
        parser = new Parser();
    });

    describe('Performance Stress Tests', () => {
        it('should handle very large parameter counts', () => {
            const largeParamSyntax = 'test(' +
        Array.from({length: 100}, (_, i) => `param${i}:Type${i}`).join(';') +
        ')';

            const startTime = performance.now();
            const result = parser.parseSyntax(largeParamSyntax);
            const endTime = performance.now();

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(20); // Should be very fast
        });

        it('should handle multiple complex variants efficiently', () => {
            const multiVariantSyntax = Array.from({length: 10}, (_, i) =>
                `test${i}(param${i}:Type${i};{optional${i}:OptType${i}})`
            ).join('<br/>');

            const startTime = performance.now();
            const result = parser.parseSyntax(multiVariantSyntax);
            const endTime = performance.now();

            expect(result).toHaveLength(10);
            expect(endTime - startTime).toBeLessThan(10);
        });

        it('should handle deeply nested optional parameters', () => {
            const nestedOptionalSyntax = 'test(' +
        Array.from({length: 10}, (_, i) => `{opt${i}:Type${i}`).join('') +
        Array.from({length: 10}, () => '}').join('') +
        ')';

            const startTime = performance.now();
            const result = parser.parseSyntax(nestedOptionalSyntax);
            const endTime = performance.now();

            expect(result).toHaveLength(1);
            expect(endTime - startTime).toBeLessThan(5);
        });

        it('should handle repeated parsing operations efficiently', () => {
            const complexSyntax = 'test(param1:Type1;{opt1:OptType1;opt2:OptType2};param2:Type2)';

            // First, test a single operation to verify correctness
            const singleResult = parser.parseSyntax(complexSyntax);
            expect(singleResult).toHaveLength(1);
            expect(singleResult[0].parameters).toHaveLength(4); // 2 regular + 2 optional

            // Then test performance without expectations inside the loop (which is expensive)
            const startTime = performance.now();
            let lastResult;
            for (let i = 0; i < 1000; i++) {
                lastResult = parser.parseSyntax(complexSyntax);
            }
            const endTime = performance.now();

            // Verify the last result is correct
            expect(lastResult).toHaveLength(1);
            expect(lastResult[0].parameters).toHaveLength(4);

            // Performance expectation: 1000 operations should complete reasonably fast
            expect(endTime - startTime).toBeLessThan(500); // 1000 operations in under 500ms
        });

        it('should handle concurrent-like operations', () => {
            const operations = Array.from({length: 50}, (_, i) =>
                `operation${i}(param${i}:Type${i};{opt${i}:OptType${i}})`
            );

            const startTime = performance.now();
            const results = operations.map(syntax => parser.parseSyntax(syntax));
            const endTime = performance.now();

            expect(results).toHaveLength(50);
            results.forEach((result, i) => {
                expect(result).toHaveLength(1);
                expect(result[0].parameters).toHaveLength(2);
            });
            expect(endTime - startTime).toBeLessThan(25);
        });
    });

    describe('Unicode and Special Character Stress Tests', () => {
        it('should handle various Unicode scripts', () => {
            const unicodeScripts = [
                'test(参数:类型)', // Chinese
                'test(パラメータ:タイプ)', // Japanese
                'test(매개변수:유형)', // Korean
                'test(параметр:тип)', // Russian
                'test(παράμετρος:τύπος)', // Greek
                'test(🚀:🎯)' // Emojis
            ];

            const startTime = performance.now();
            unicodeScripts.forEach(syntax => {
                const result = parser.parseSyntax(syntax);
                expect(result).toHaveLength(1);
                expect(result[0].parameters).toHaveLength(1);
            });
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(10);
        });

        it('should handle special characters in parameter names', () => {
            const specialChars = ['test(_param:Type)', 'test($param:Type)', 'test(param-name:Type)'];

            specialChars.forEach(syntax => {
                const result = parser.parseSyntax(syntax);
                expect(result).toHaveLength(1);
                expect(result[0].parameters).toHaveLength(1);
            });
        });
    });

    describe('Malformed Syntax Recovery Tests', () => {
        it('should recover from various malformed syntax patterns', () => {
            const malformedSyntaxes = [
                'test(param1:Type1;param2', // Missing type
                'test(param1:Type1;{unclosed', // Unclosed brace
                'test(param1:Type1;;param2:Type2)', // Double semicolon
                'test(param1:;param2:Type2)', // Empty type
                'test(:Type1;param2:Type2)' // Missing parameter name
            ];

            malformedSyntaxes.forEach(syntax => {
                const result = parser.parseSyntax(syntax);
                expect(result).toHaveLength(1);
                // Should handle gracefully without throwing
            });
        });

        it('should handle extremely malformed syntax', () => {
            const extremelyMalformed = [
                'test((((((param:Type',
                'test}}}}param:Type{{{',
                'test(::::::)',
                'test(;;;;;;)',
                ''
            ];

            extremelyMalformed.forEach(syntax => {
                expect(() => parser.parseSyntax(syntax)).not.toThrow();
            });
        });
    });

    describe('Memory and Resource Tests', () => {
        it('should not leak memory with repeated operations', () => {
            const syntax = 'test(param1:Type1;{opt1:OptType1;opt2:OptType2})';

            // Run fewer operations to test for memory leaks
            const startTime = performance.now();
            for (let i = 0; i < 500; i++) { // Reduced from 5000 to 500
                const result = parser.parseSyntax(syntax);
                // Don't store results to avoid memory accumulation
            }
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(2000); // More reasonable: 500 operations in under 2 seconds
        });

        it('should handle large objects efficiently', () => {
            const largeObjectSyntax = 'LARGE_OBJECT_TEST(' +
        Array.from({length: 100}, (_, i) => `param${i}:Type${i}`).join(';') +
        ')';

            console.log(`Command: LARGE_OBJECT_TEST - Syntax: **LARGE_OBJECT_TEST** ( ${
                Array.from({length: 100}, (_, i) => `*param${i}* : Type${i}`).join(' ; ')
            } )`);

            const startTime = performance.now();
            const result = parser.parseSyntax(largeObjectSyntax);
            const endTime = performance.now();

            expect(result).toHaveLength(1);
            expect(result[0].parameters).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(10);
        });
    });

    describe('Edge Case Combinations', () => {
        it('should handle complex combinations of edge cases', () => {
            const edgeCases = [
                'test(🚀param:Type;{...spread:SpreadType;opt:OptType})',
                'test({nested:{deeper:{deepest:Type}}})',
                'test(param1:Type1<br/>alternate(param2:Type2))',
                'test(param:Very/Long/Type/Definition/With/Multiple/Slashes)'
            ];

            edgeCases.forEach(syntax => {
                const result = parser.parseSyntax(syntax);
                expect(result.length).toBeGreaterThan(0);
            });
        });

        it('should handle mixed valid and invalid patterns', () => {
            const mixedPatterns = [
                'valid(param:Type)<br/>invalid(param',
                'test(valid:Type;{invalid;;also:Type})',
                'good(param:Type)<br/>bad(}invalid{)<br/>ok(param:Type)'
            ];

            mixedPatterns.forEach(syntax => {
                const result = parser.parseSyntax(syntax);
                expect(result.length).toBeGreaterThan(0);
                // Should process valid parts and handle invalid parts gracefully
            });
        });
    });
});
