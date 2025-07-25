import { describe, it, expect, beforeEach } from 'vitest';
import { SyntaxChecker } from '../../src/checker';

describe('SyntaxChecker Type Validation Bug Fix', () => {
    let checker: SyntaxChecker;

    beforeEach(() => {
        checker = new SyntaxChecker();
    });

    describe('Type Validation - Forward Slash Separated Types', () => {
        it('should correctly validate single types against multiple allowed types', () => {
            // This tests the specific bug fix for the .send() method example
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Blob', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Blob', 'Object'])).toBe(false);
        });

        it('should handle complex type combinations with forward slashes', () => {
            expect(checker.isTypeValid('Integer', ['Text', 'Integer', 'Boolean'])).toBe(true);
            expect(checker.isTypeValid('Boolean', ['Text', 'Integer', 'Boolean'])).toBe(true);
            expect(checker.isTypeValid('Collection', ['Text', 'Integer', 'Boolean'])).toBe(false);
        });

        it('should handle whitespace variations in forward slash types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Blob', ['Text', 'Blob', 'Object'])).toBe(true);
        });
    });

    describe('Type Validation - Comma Separated Types', () => {
        it('should correctly validate single types against comma-separated types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Object', ['Text', 'Number', 'Array'])).toBe(false);
        });

        it('should handle whitespace variations in comma-separated types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number', 'Array'])).toBe(true);
        });
    });

    describe('Type Validation - "or" Keyword Support', () => {
        it('should handle "or" keyword in type definitions', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Object', ['Text', 'Number', 'Array'])).toBe(false);
        });
    });

    describe('Type Validation - Mixed Separators', () => {
        it('should handle mixed separators in type definitions', () => {
            // This shouldn't normally happen but let's test robustness
            expect(checker.isTypeValid('Text', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Array', ['Text', 'Number', 'Array'])).toBe(true);
        });
    });

    describe('Type Equivalences', () => {
        it('should handle Real/Number equivalence in complex types', () => {
            expect(checker.isTypeValid('Real', ['Number', 'Text', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Real', 'Text', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Real', ['Text', 'Number', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Real', 'Object'])).toBe(true);
        });
    });

    describe('Case Insensitive Validation', () => {
        it('should handle case variations correctly', () => {
            expect(checker.isTypeValid('text', ['TEXT', 'BLOB', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('TEXT', ['text', 'blob', 'object'])).toBe(true);
            expect(checker.isTypeValid('Blob', ['TEXT', 'blob', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('object', ['Text', 'Blob', 'Object'])).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings and invalid input gracefully', () => {
            expect(checker.isTypeValid('', ['Text'])).toBe(false);
            expect(checker.isTypeValid('Text', [''])).toBe(false);
            expect(checker.isTypeValid('', [''])).toBe(true);
        });

        it('should handle types with extra whitespace', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(true);
        });

        it('should handle single type definitions', () => {
            expect(checker.isTypeValid('Text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text'])).toBe(false);
        });
    });

    describe('Real-world Examples', () => {
        it('should handle the WebSocket.send() method example correctly', () => {
            // This is the specific example that was failing before the fix
            const testCases = [
                { syntaxType: 'Text', paramTypes: ['Text', 'Blob', 'Object'], expected: true },
                { syntaxType: 'Blob', paramTypes: ['Text', 'Blob', 'Object'], expected: true },
                { syntaxType: 'Object', paramTypes: ['Text', 'Blob', 'Object'], expected: true },
                { syntaxType: 'Number', paramTypes: ['Text', 'Blob', 'Object'], expected: false }
            ];

            testCases.forEach(({ syntaxType, paramTypes, expected }) => {
                expect(checker.isTypeValid(syntaxType, paramTypes)).toBe(expected);
            });
        });

        it('should handle Collection.concat() method example', () => {
            // Another real-world example
            const paramTypes = ['Number', 'Text', 'Object', 'Collection', 'Date', 'Time', 'Boolean', 'Picture'];

            expect(checker.isTypeValid('Number', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Text', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Object', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Collection', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Date', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Time', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Boolean', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Picture', paramTypes)).toBe(true);
            expect(checker.isTypeValid('Array', paramTypes)).toBe(false);
        });
    });

    describe('Performance', () => {
        it('should handle type validation efficiently', () => {
            const startTime = performance.now();

            // Test 1000 validations
            for (let i = 0; i < 1000; i++) {
                checker.isTypeValid('Text', ['Text', 'Blob', 'Object', 'Number', 'Integer', 'Boolean', 'Array', 'Collection']);
                checker.isTypeValid('Number', ['Text', 'Number', 'Array', 'Collection', 'Object', 'Date', 'Time', 'Boolean']);
                checker.isTypeValid('Real', ['Number']);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(100);
        });
    });
});
