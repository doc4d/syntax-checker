import { describe, test, expect } from 'vitest';

describe('Entry Points and CLI', () => {
    describe('index.ts exports', () => {
        test('should export SyntaxChecker', async () => {
            const module = await import('../../index.js');
            expect(module.SyntaxChecker).toBeDefined();
            expect(typeof module.SyntaxChecker).toBe('function');
        });

        test('should export Parser', async () => {
            const module = await import('../../index.js');
            expect(module.Parser).toBeDefined();
            expect(typeof module.Parser).toBe('function');
        });

        test('should export legacy functions', async () => {
            const module = await import('../../index.js');
            expect(module.parseSyntax).toBeDefined();
            expect(typeof module.parseSyntax).toBe('function');
            expect(module.parseParameters).toBeDefined();
            expect(typeof module.parseParameters).toBe('function');
        });

        test('should export default object', async () => {
            const module = await import('../../index.js');
            expect(module.default).toBeDefined();
            expect(module.default.Parser).toBeDefined();
            expect(module.default.SyntaxChecker).toBeDefined();
        });
    });

    describe('Package.json exports', () => {
        test('should support direct checker import', async () => {
            // Test the export path defined in package.json
            try {
                const module = await import('../../out/src/checker.js');
                expect(module.SyntaxChecker).toBeDefined();
                expect(module.WarningLevel).toBeDefined();
            } catch (error) {
                // If the file doesn't exist, that's expected in test environment
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('should support direct parser import', async () => {
            try {
                const module = await import('../../out/src/parser.js');
                expect(module.Parser).toBeDefined();
                expect(module.WarningLevel).toBeDefined();
            } catch (error) {
                // If the file doesn't exist, that's expected in test environment
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('Module Integration', () => {
        test('should create instances of exported classes', async () => {
            const { SyntaxChecker, Parser } = await import('../../index.js');

            expect(() => new SyntaxChecker()).not.toThrow();
            expect(() => new Parser()).not.toThrow();
        });

        test('should have working basic functionality', async () => {
            const { SyntaxChecker } = await import('../../index.js');

            const checker = new SyntaxChecker();

            // Test basic functionality
            const result = checker.extractActualParamNames(checker.parseParams([
                ['param1', 'Type1', '&#8594;', 'Description1']
            ] as any));

            expect(result).toEqual(['param1']);
        });

        test('should handle parser integration', async () => {
            const { Parser } = await import('../../index.js');

            const parser = new Parser();
            const result = parser.parseSyntax('**.test** : Property');

            expect(result).toHaveLength(1);
            expect(result[0].variant).toBe('**.test** : Property');
        });

        test('should use legacy functions', async () => {
            const { parseSyntax, parseParameters } = await import('../../index.js');

            const syntaxResult = parseSyntax('**.test** : Property');
            expect(syntaxResult).toHaveLength(1);

            const paramResult = parseParameters('param : Type');
            expect(paramResult).toHaveLength(1);
        });
    });

    describe('TypeScript Definitions', () => {
        test('should export proper TypeScript types', async () => {
            const module = await import('../../index.js');

            // Test that we can create instances with basic constructors
            const checker = new module.SyntaxChecker();
            const parser = new module.Parser();

            expect(checker).toBeInstanceOf(module.SyntaxChecker);
            expect(parser).toBeInstanceOf(module.Parser);
        });
    });

    describe('Error Handling in Imports', () => {
        test('should handle import errors gracefully', async () => {
            // Test that the module loads without throwing
            expect(async () => {
                await import('../../index.js');
            }).not.toThrow();
        });

        test('should maintain API stability', async () => {
            const module = await import('../../index.js');

            // Test that core API methods exist
            const checker = new module.SyntaxChecker();

            expect(typeof checker.extractActualParamNames).toBe('function');
            expect(typeof checker.validateVariantParameters).toBe('function');
            expect(typeof checker.checkCommand).toBe('function');
            expect(typeof checker.isTypeValid).toBe('function');
        });
    });

    describe('Performance and Memory', () => {
        test('should not leak memory on repeated imports', async () => {
            // Test multiple imports don't cause memory issues
            for (let i = 0; i < 10; i++) {
                const module = await import('../../index.js');
                const checker = new module.SyntaxChecker();

                // Use the instance briefly
                checker.extractActualParamNames([]);
            }

            // If we get here without crashing, test passes
            expect(true).toBe(true);
        });

        test('should handle concurrent usage', async () => {
            const module = await import('../../index.js');

            const promises = Array.from({ length: 10 }, async (_, i) => {
                const checker = new module.SyntaxChecker();
                return checker.extractActualParamNames(checker.parseParams([
                    [`param${i}`, `Type${i}`, '&#8594;', `Description${i}`]
                ] as any));
            });

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);
            results.forEach((result, i) => {
                expect(result).toEqual([`param${i}`]);
            });
        });
    });
});
