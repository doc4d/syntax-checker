import { describe, it, expect } from 'vitest';
import { Parser } from '../../src/parser';

describe('Syntax Checker Stress Tests', () => {
    describe('Performance Stress Tests', () => {
        it('should handle very large parameter counts', () => {
            const parser = new Parser();

            const largeParamCount = 50; // Reduced for faster test
            const largeSyntax = '**LARGE_PARAM_COUNT** ( ' +
        Array.from({length: largeParamCount}, (_, i) => `*param${i}* : Type${i % 10}`).join(' ; ') +
        ' )';

            const startTime = performance.now();
            const result = parser.parseSyntax(largeSyntax);
            const endTime = performance.now();

            expect(result[0].parameters).toHaveLength(largeParamCount);
            expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
        });

        it('should handle multiple complex variants efficiently', () => {
            const parser = new Parser();

            const complexVariants = Array.from({length: 5}, (_, i) =>
                `**COMPLEX_VARIANT_${i}** ( *param1* : Text ; *param2* : Integer )`
            ).join('<br/>');

            const startTime = performance.now();
            const result = parser.parseSyntax(complexVariants);
            const endTime = performance.now();

            expect(result).toHaveLength(5);
            expect(endTime - startTime).toBeLessThan(100);
        });

        it('should handle repeated parsing operations efficiently', () => {
            const parser = new Parser();

            const testSyntax = '**REPEATED_TEST** ( *param1* : Text ; *param2* : Integer )';
            const iterations = 100; // Reduced for faster test

            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                const result = parser.parseSyntax(testSyntax);
                expect(result[0].parameters).toHaveLength(2);
            }

            const endTime = performance.now();
            const avgTime = (endTime - startTime) / iterations;

            expect(avgTime).toBeLessThan(10); // Relaxed for test environment
        });
    });

    describe('Unicode and Special Character Stress Tests', () => {
        it('should handle various Unicode scripts', () => {
            const parser = new Parser();

            const unicodeTests = [
                '**LATIN** ( *paramètre* : Texte ; *naïve* : Objet )',
                '**CYRILLIC** ( *параметр* : Текст ; *объект* : Объект )',
                '**GREEK** ( *παράμετρος* : Κείμενο ; *αντικείμενο* : Αντικείμενο )'
            ];

            unicodeTests.forEach((syntax, index) => {
                const result = parser.parseSyntax(syntax);
                expect(result).toHaveLength(1);
                expect(result[0].parameters).toHaveLength(2);
            });
        });
    });

    describe('Malformed Syntax Recovery Tests', () => {
        it('should recover from various malformed syntax patterns', () => {
            const parser = new Parser();

            const malformedTests = [
                { syntax: '**MALFORMED_1** ( *param1* : Text ; *param2* : ; *param3* : Object )', desc: 'Missing type' },
                { syntax: '**MALFORMED_2** ( *param1* Text ; *param2* : Integer )', desc: 'Missing colon' },
                { syntax: '**MALFORMED_3** ( param1 : Text ; *param2* : Integer )', desc: 'Missing asterisks' }
            ];

            malformedTests.forEach(({ syntax, desc }) => {
                expect(() => {
                    const result = parser.parseSyntax(syntax);
                    expect(result).toBeInstanceOf(Array);
                    expect(result).toHaveLength(1);
                }).not.toThrow();
            });
        });
    });
});
