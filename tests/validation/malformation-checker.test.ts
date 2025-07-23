import { describe, test, expect, beforeEach } from 'vitest';
import { MalformationChecker } from '../../src/malformation-checker.js';
import { Tokenizer, TokenType } from '../../src/tokenizer.js';
import { WarningLevel } from '../../src/types.js';

describe('MalformationChecker', () => {
    let checker: MalformationChecker;
    let tokenizer: Tokenizer;

    beforeEach(() => {
        checker = new MalformationChecker();
        tokenizer = new Tokenizer();
    });

    describe('Brace Balance Checking', () => {
        test('should detect unclosed optional blocks', () => {
            const tokens = tokenizer.tokenize('param : Type { optional');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Unclosed optional block');
            expect(issues[0].level).toBe(WarningLevel.LEVEL_1);
        });

        test('should detect extra closing braces', () => {
            const tokens = tokenizer.tokenize('param : Type }');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Extra closing brace');
            expect(issues[0].level).toBe(WarningLevel.LEVEL_1);
        });

        test('should handle properly balanced braces', () => {
            const tokens = tokenizer.tokenize('param : Type { optional }');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(0);
        });

        test('should detect multiple unclosed braces', () => {
            const tokens = tokenizer.tokenize('param : Type { optional { nested');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('missing 2 closing braces');
            expect(issues[0].level).toBe(WarningLevel.LEVEL_1);
        });
    });

    describe('Empty Parameters Checking', () => {
        test('should detect empty parameter after semicolon', () => {
            const tokens = tokenizer.tokenize('param1 : Type ;; param2 : Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.message.includes('Empty parameter found (double semicolon)'))).toBe(true);
        });

        test('should detect empty parameter after open brace', () => {
            const tokens = tokenizer.tokenize('; param1 : Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.message.includes('Empty parameter found (semicolon at start)'))).toBe(true);
        });

        test('should not flag valid parameters', () => {
            const tokens = tokenizer.tokenize('param1 : Type ; param2 : Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.filter(issue => issue.message.includes('Empty parameter'))).toHaveLength(0);
        });
    });

    describe('Unexpected Tokens Checking', () => {
        test('should detect unexpected semicolon after colon', () => {
            const tokens = tokenizer.tokenize('param : ; Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.message.includes('Unexpected semicolon after colon'))).toBe(true);
        });

        test('should detect unexpected closing brace after colon', () => {
            const tokens = tokenizer.tokenize('param : } Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.message.includes('Unexpected closing brace after colon'))).toBe(true);
        });

        test('should not flag valid token sequences', () => {
            const tokens = tokenizer.tokenize('param : Type');
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.filter(issue => 
                issue.message.includes('Unexpected semicolon') || 
                issue.message.includes('Unexpected closing brace')
            )).toHaveLength(0);
        });
    });

    describe('Type Definition Validation', () => {
        test('should detect invalid forward slash in type definition', () => {
            const tokens = [
                { type: TokenType.PARAMETER_NAME, value: 'param', position: 0 },
                { type: TokenType.COLON, value: ':', position: 5 },
                { type: TokenType.TYPE, value: 'Type/Invalid/Slash', position: 7 }
            ];
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.some(issue => 
                issue.message.includes('Type definition') && 
                issue.message.includes('invalid forward slash characters')
            )).toBe(true);
        });

        test('should allow valid type definitions', () => {
            const tokens = [
                { type: TokenType.PARAMETER_NAME, value: 'param', position: 0 },
                { type: TokenType.COLON, value: ':', position: 5 },
                { type: TokenType.TYPE, value: 'ValidType', position: 7 }
            ];
            const issues = checker.checkMalformations(tokens);
            
            expect(issues.filter(issue => 
                issue.message.includes('Type definition') && 
                issue.message.includes('invalid forward slash characters')
            )).toHaveLength(0);
        });
    });

    describe('Syntax Structure Checking', () => {
        test('should handle property syntax without parentheses', () => {
            const result = checker.checkSyntaxStructure('**.root** : 4D.ZipFolder');
            
            expect(result.paramString).toBeNull();
            expect(result.paramEnd).toBe(-1);
            expect(result.issues).toHaveLength(0);
        });

        test('should handle function syntax with parentheses', () => {
            const result = checker.checkSyntaxStructure('**myFunction** ( param : Type )');
            
            expect(result.paramString).toBe('param : Type');
            expect(result.paramEnd).toBe(30);
            expect(result.issues).toHaveLength(0);
        });

        test('should detect missing closing parenthesis', () => {
            const result = checker.checkSyntaxStructure('**myFunction** ( param : Type');
            
            expect(result.paramString).toBeNull();
            expect(result.paramEnd).toBe(-1);
            expect(result.issues).toHaveLength(1);
            expect(result.issues[0].message).toBe('Missing closing parenthesis');
            expect(result.issues[0].level).toBe(WarningLevel.LEVEL_1);
        });

        test('should handle empty parameter string', () => {
            const result = checker.checkSyntaxStructure('**myFunction** (  )');
            
            expect(result.paramString).toBe('');
            expect(result.paramEnd).toBe(18);
            expect(result.issues).toHaveLength(0);
        });

        test('should handle nested parentheses', () => {
            const result = checker.checkSyntaxStructure('**myFunction** ( param : Type(SubType) )');
            
            expect(result.paramString).toBe('param : Type(SubType)');
            expect(result.paramEnd).toBe(39);
            expect(result.issues).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty token array', () => {
            const tokens: any[] = [];
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(0);
        });

        test('should handle tokens with only whitespace', () => {
            const tokens = [
                { type: TokenType.WHITESPACE, value: ' ', position: 0 },
                { type: TokenType.WHITESPACE, value: '\t', position: 1 },
                { type: TokenType.WHITESPACE, value: '\n', position: 2 }
            ];
            const issues = checker.checkMalformations(tokens);
            
            expect(issues).toHaveLength(0);
        });

        test('should handle complex malformed syntax', () => {
            const tokens = tokenizer.tokenize('param1 : Type { { ; } param2 : ; }');
            const issues = checker.checkMalformations(tokens);
            
            // Should detect multiple issues
            expect(issues.length).toBeGreaterThan(0);
        });
    });

    describe('Warning Levels', () => {
        test('should assign appropriate warning levels to different issues', () => {
            const tokens = tokenizer.tokenize('param : Type { unclosed');
            const issues = checker.checkMalformations(tokens);
            
            // All structural issues should be LEVEL_1
            issues.forEach(issue => {
                expect(issue.level).toBe(WarningLevel.LEVEL_1);
            });
        });
    });
});
