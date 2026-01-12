import { describe, it, expect, beforeEach } from 'vitest';
import { SyntaxChecker } from '../../src/checker';

describe('SyntaxChecker Type Validation Bug Fix', () => {
    let checker: SyntaxChecker;

    beforeEach(() => {
        checker = new SyntaxChecker();
    });

    describe('Type Validation - Forward Slash Separated Types', () => {
        it('should correctly validate single types against multiple allowed types', () => {
            // Exact match - parsed types must equal actual types
            expect(checker.isTypeValid('Text,Blob,Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Blob,Object,Text', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('Text', ['Text', 'Blob', 'Object'])).toBe(false);
        });

        it('should handle complex type combinations with forward slashes', () => {
            expect(checker.isTypeValid('Text,Integer,Boolean', ['Text', 'Integer', 'Boolean'])).toBe(true);
            expect(checker.isTypeValid('Integer', ['Integer'])).toBe(true);
            expect(checker.isTypeValid('Collection', ['Text', 'Integer', 'Boolean'])).toBe(false);
        });

        it('should handle whitespace variations in forward slash types', () => {
            expect(checker.isTypeValid('Text , Blob , Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text,Blob,Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text, Blob, Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Blob', ['Blob'])).toBe(true);
        });
    });

    describe('Type Validation - Comma Separated Types', () => {
        it('should correctly validate single types against comma-separated types', () => {
            expect(checker.isTypeValid('Text,Number,Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Number'])).toBe(true);
            expect(checker.isTypeValid('Text,Array', ['Text', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Object', ['Text', 'Number', 'Array'])).toBe(false);
        });

        it('should handle whitespace variations in comma-separated types', () => {
            expect(checker.isTypeValid('Text , Number , Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Number'])).toBe(true);
            expect(checker.isTypeValid('Array,Text', ['Text', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number, Text', ['Text', 'Number'])).toBe(true);
        });
    });

    describe('Type Validation - "or" Keyword Support', () => {
        it('should handle "or" keyword in type definitions', () => {
            expect(checker.isTypeValid('Text,Number,Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Number'])).toBe(true);
            expect(checker.isTypeValid('Array,Text', ['Text', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Object', ['Text', 'Number', 'Array'])).toBe(false);
        });
    });

    describe('Type Validation - Mixed Separators', () => {
        it('should handle mixed separators in type definitions', () => {
            // Test exact matching with multiple types
            expect(checker.isTypeValid('Text,Number,Array', ['Text', 'Number', 'Array'])).toBe(true);
            expect(checker.isTypeValid('Number,Text', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Array,Number', ['Number', 'Array'])).toBe(true);
        });
    });

    describe('Case Insensitive Validation', () => {
        it('should handle case variations correctly', () => {
            expect(checker.isTypeValid('text,blob,object', ['TEXT', 'BLOB', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('TEXT', ['text'])).toBe(true);
            expect(checker.isTypeValid('Blob,text,object', ['TEXT', 'blob', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('object', ['Object'])).toBe(true);
        });
    });

    describe('Case multiple types', () => {
        it('should handle case multiple types', () => {
            expect(checker.isTypeValid('text,object', ['TEXT', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('TEXT', ['text'])).toBe(true);
            expect(checker.isTypeValid('Blob,object,text', ['TEXT', 'blob', 'OBJECT'])).toBe(true);
            expect(checker.isTypeValid('object', ['Object'])).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings and invalid input gracefully', () => {
            expect(checker.isTypeValid('', ['Text'])).toBe(false);
            expect(checker.isTypeValid('Text', [''])).toBe(false);
            expect(checker.isTypeValid('', [''])).toBe(true);
        });

        it('should handle types with extra whitespace', () => {
            expect(checker.isTypeValid('Text , Blob , Object', ['Text', 'Blob', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Text,Blob,Object', ['Text', 'Blob', 'Object'])).toBe(true);
        });

        it('should handle single type definitions', () => {
            expect(checker.isTypeValid('Text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text'])).toBe(false);
        });
    });

    describe('Real-world Examples', () => {
        it('should handle the WebSocket.send() method example correctly', () => {
            // Testing exact type matching
            const testCases = [
                { syntaxType: 'Text,Blob,Object', paramTypes: ['Text', 'Blob', 'Object'], expected: true },
                { syntaxType: 'Blob', paramTypes: ['Blob'], expected: true },
                { syntaxType: 'Object,Text', paramTypes: ['Text', 'Object'], expected: true },
                { syntaxType: 'Number', paramTypes: ['Text', 'Blob', 'Object'], expected: false }
            ];

            testCases.forEach(({ syntaxType, paramTypes, expected }) => {
                expect(checker.isTypeValid(syntaxType, paramTypes)).toBe(expected);
            });
        });

        it('should handle Collection.concat() method example', () => {
            // Testing exact type matching with full type list
            const paramTypes = ['Number', 'Text', 'Object', 'Collection', 'Date', 'Time', 'Boolean', 'Picture'];
            const allTypesString = 'Number,Text,Object,Collection,Date,Time,Boolean,Picture';

            expect(checker.isTypeValid(allTypesString, paramTypes)).toBe(true);
            expect(checker.isTypeValid('Text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('Object,Text', ['Text', 'Object'])).toBe(true);
            expect(checker.isTypeValid('Collection,Number', ['Number', 'Collection'])).toBe(true);
            expect(checker.isTypeValid('Date,Time,Boolean', ['Date', 'Time', 'Boolean'])).toBe(true);
            expect(checker.isTypeValid('Picture', ['Picture'])).toBe(true);
            expect(checker.isTypeValid('Array', paramTypes)).toBe(false);
        });
    });

    describe('Performance', () => {
        it('should handle type validation efficiently', () => {
            const startTime = performance.now();

            // Test 1000 validations
            for (let i = 0; i < 1000; i++) {
                checker.isTypeValid('Text,Blob,Object,Number,Integer,Boolean,Array,Collection', ['Text', 'Blob', 'Object', 'Number', 'Integer', 'Boolean', 'Array', 'Collection']);
                checker.isTypeValid('Number,Text', ['Text', 'Number']);
                checker.isTypeValid('Real', ['Real']);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(100);
        });
    });
});
