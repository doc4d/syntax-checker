import { describe, test, expect } from 'vitest';
import { Tokenizer, TokenType } from '../../src/tokenizer.js';
import { MalformationChecker } from '../../src/malformation-checker.js';
import { ParameterChecker } from '../../src/parameter-checker.js';
import { WarningCode } from '../../src/types.js';

describe('Warning ID System', () => {
    const tokenizer = new Tokenizer();
    const malformationChecker = new MalformationChecker();
    const parameterChecker = new ParameterChecker();

    describe('MalformationChecker Warning IDs', () => {
        test('should assign UNCLOSED_OPTIONAL_BLOCK ID for unclosed braces', () => {
            const tokens = tokenizer.tokenize('{ param : Type');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.UNCLOSED_OPTIONAL_BLOCK)).toBe(true);
        });

        test('should assign EXTRA_CLOSING_BRACE ID for extra closing braces', () => {
            const tokens = tokenizer.tokenize('param : Type }');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.EXTRA_CLOSING_BRACE)).toBe(true);
        });

        test('should assign EMPTY_PARAMETER_DOUBLE_SEMICOLON ID for double semicolons', () => {
            const tokens = tokenizer.tokenize('param1 : Type1 ; ; param2 : Type2');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.EMPTY_PARAMETER_DOUBLE_SEMICOLON)).toBe(true);
        });

        test('should assign UNEXPECTED_SEMICOLON_AFTER_COLON ID for empty types', () => {
            const tokens = tokenizer.tokenize('param : ; Type');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.UNEXPECTED_SEMICOLON_AFTER_COLON)).toBe(true);
        });

        test('should assign UNEXPECTED_CLOSING_BRACE_AFTER_COLON ID for empty types', () => {
            const tokens = tokenizer.tokenize('param : } Type');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.UNEXPECTED_CLOSING_BRACE_AFTER_COLON)).toBe(true);
        });

        test('should assign DOUBLE_COLON ID for double colons', () => {
            const tokens = tokenizer.tokenize('param :: Type');
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.DOUBLE_COLON)).toBe(true);
        });

        test('should assign MALFORMED_PARAMETER_NAME ID for parameter names with asterisks', () => {
            // Create a token manually since the tokenizer splits asterisks
            const tokens = [
                { type: TokenType.PARAMETER_NAME, value: 'param*name', position: 0 },
                { type: TokenType.COLON, value: ':', position: 10 },
                { type: TokenType.TYPE, value: 'Type', position: 12 }
            ];
            const issues = malformationChecker.checkMalformations(tokens);
            
            expect(issues.some(issue => issue.id === WarningCode.MALFORMED_PARAMETER_NAME)).toBe(true);
        });
    });

    describe('ParameterChecker Warning IDs', () => {
        test('should assign PARAMETER_MISSING_TYPE ID for parameters without types', () => {
            const tokens = tokenizer.tokenize('param1 ; param2 : Type2');
            const result = parameterChecker.checkParameters(tokens);
            
            expect(result.issues.some(issue => issue.id === WarningCode.PARAMETER_MISSING_TYPE)).toBe(true);
        });

        test('should assign PARAMETER_MISSING_TYPE ID for spread parameters without types', () => {
            const tokens = tokenizer.tokenize('...restParam ; param2 : Type2');
            const result = parameterChecker.checkParameters(tokens);
            
            expect(result.issues.some(issue => issue.id === WarningCode.PARAMETER_MISSING_TYPE)).toBe(true);
        });
    });

    describe('Warning ID Uniqueness', () => {
        test('each warning should have a unique ID', () => {
            const allCodes = Object.values(WarningCode);
            const uniqueCodes = new Set(allCodes);
            
            expect(uniqueCodes.size).toBe(allCodes.length);
        });

        test('warning IDs should follow naming convention', () => {
            const malformationCodes = Object.values(WarningCode).filter(code => code.startsWith('MAL'));
            const parameterCodes = Object.values(WarningCode).filter(code => code.startsWith('PAR'));
            
            expect(malformationCodes.length).toBeGreaterThan(0);
            expect(parameterCodes.length).toBeGreaterThan(0);
        });
    });

    describe('Issue Structure Validation', () => {
        test('all issues should have required fields', () => {
            const tokens = tokenizer.tokenize('{ param : ; }');
            const malformationIssues = malformationChecker.checkMalformations(tokens);
            const parameterResult = parameterChecker.checkParameters(tokens);
            
            const allIssues = [...malformationIssues, ...parameterResult.issues];
            
            for (const issue of allIssues) {
                expect(issue).toHaveProperty('id');
                expect(issue).toHaveProperty('message');
                expect(issue).toHaveProperty('level');
                expect(typeof issue.id).toBe('string');
                expect(typeof issue.message).toBe('string');
                expect(typeof issue.level).toBe('number');
            }
        });
    });
});
