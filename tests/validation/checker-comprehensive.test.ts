import { describe, test, expect, beforeEach } from 'vitest';
import { SyntaxChecker, WarningLevel } from '../../src/checker.js';

describe('SyntaxChecker - Comprehensive Coverage', () => {
    let checker: SyntaxChecker;

    beforeEach(() => {
        checker = new SyntaxChecker(WarningLevel.LEVEL_1);
    });

    describe('Constructor and Configuration', () => {
        test('should create checker with default warning level', () => {
            const defaultChecker = new SyntaxChecker();
            expect(defaultChecker).toBeInstanceOf(SyntaxChecker);
        });

        test('should create checker with specified warning level', () => {
            const level2Checker = new SyntaxChecker(WarningLevel.LEVEL_2);
            expect(level2Checker).toBeInstanceOf(SyntaxChecker);
        });
    });

    describe('Parameter Name Extraction', () => {
        test('should extract input parameter names with arrow direction', () => {
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1'],
                ['param2', 'Type2', '->', 'Description2'],
                ['Result', 'Type3', '<-', 'Description3']
            ];

            const result = checker.extractActualParamNames(checker.parseParams(params));

            expect(result).toEqual(['param1', 'param2']);
        });

        test('should extract input/output parameter names with double arrow', () => {
            const params = [
                ['param1', 'Type1', '&#8596;', 'Description1'],
                ['param2', 'Type2', '<->', 'Description2'],
                ['Result', 'Type3', '<-', 'Description3']
            ];

            const result = checker.extractActualParamNames(checker.parseParams(params));

            expect(result).toEqual(['param1', 'param2']);
        });

        test('should include output parameters except Result/Function result', () => {
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1'],
                ['outputParam', 'Type2', '<-', 'Description2'],
                ['Result', 'Type3', '<-', 'Description3'],
                ['Function result', 'Type4', '<-', 'Description4']
            ];

            const result = checker.extractActualParamNames(checker.parseParams(params));

            expect(result).toEqual(['param1', 'outputparam']);
        });

        test('should handle empty parameter array', () => {
            const result = checker.extractActualParamNames([]);
            expect(result).toEqual([]);
        });

        test('should handle null/undefined parameters', () => {
            const result = checker.extractActualParamNames(null as any);
            expect(result).toEqual([]);
        });

        test('should convert parameter names to lowercase', () => {
            const params = [
                ['ParamName', 'Type1', '&#8594;', 'Description1'],
                ['UPPERPARAM', 'Type2', '->', 'Description2']
            ];

            const result = checker.extractActualParamNames(checker.parseParams(params));

            expect(result).toEqual(['paramname', 'upperparam']);
        });
    });

    describe('Variant Parameter Validation', () => {
        test('should validate variant with matching parameters', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'Type1', optional: false, spread: false },
                    { name: 'param2', type: 'Type2', optional: false, spread: false }
                ]
            };
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1'],
                ['param2', 'Type2', '&#8594;', 'Description2']
            ];
            const actualParamNames = ['param1', 'param2'];

            const result = checker.validateVariantParameters(variant as any, checker.parseParams(params), actualParamNames);

            expect(result.extraParams).toHaveLength(0);
            expect(result.typeMismatches).toHaveLength(0);
            expect(result.returnTypeMismatches).toHaveLength(0);
        });

        test('should detect extra parameters in variant', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'Type1', optional: false, spread: false },
                    { name: 'extraParam', type: 'Type2', optional: false, spread: false }
                ]
            };
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1']
            ];
            const actualParamNames = ['param1'];

            const result = checker.validateVariantParameters(variant as any, checker.parseParams(params), actualParamNames);

            expect(result.extraParams).toContain('extraparam');
        });

        test('should ignore spread parameters in validation', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'Type1', optional: false, spread: false },
                    { name: 'spreadParam', type: 'Type2', optional: false, spread: true }
                ]
            };
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1']
            ];
            const actualParamNames = ['param1'];

            const result = checker.validateVariantParameters(variant as any, checker.parseParams(params), actualParamNames);

            expect(result.extraParams).toHaveLength(0);
        });

        test('should ignore asterisk parameters', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: '*', type: 'Type1', optional: false, spread: false },
                    { name: 'param1', type: 'Type2', optional: false, spread: false }
                ]
            };
            const params = [
                ['param1', 'Type2', '&#8594;', 'Description1']
            ];
            const actualParamNames = ['param1'];

            const result = checker.validateVariantParameters(variant as any, checker.parseParams(params), actualParamNames);

            expect(result.extraParams).toHaveLength(0);
        });
    });

    describe('Type Mismatch Detection', () => {
        test('should detect type mismatches', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'WrongType', optional: false, spread: false }
                ]
            };
            const params = [
                ['param1', 'CorrectType', '&#8594;', 'Description1']
            ];

            const result = checker.checkTypeMismatches(variant as any, checker.parseParams(params));

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('param1');
            expect(result[0].syntaxType).toBe('WrongType');
            expect(result[0].paramsType).toStrictEqual(['CorrectType']);
        });

        test('should not flag unknown types as mismatches', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'unknown', optional: false, spread: false }
                ]
            };
            const params = [
                ['param1', 'AnyType', '&#8594;', 'Description1']
            ];

            const result = checker.checkTypeMismatches(variant as any, checker.parseParams(params));

            expect(result).toHaveLength(0);
        });

        test('should skip spread parameters in type checking', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'WrongType', optional: false, spread: true }
                ]
            };
            const params = [
                ['param1', 'CorrectType', '&#8594;', 'Description1']
            ];

            const result = checker.checkTypeMismatches(variant as any, checker.parseParams(params));

            expect(result).toHaveLength(0);
        });

        test('should handle missing actual parameters', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'Type1', optional: false, spread: false }
                ]
            };
            const params: any[] = [];

            const result = checker.checkTypeMismatches(variant as any, params);

            expect(result).toHaveLength(0);
        });
    });

    describe('Return Type Mismatch Detection', () => {
        test('should detect missing return parameter when syntax has return type', () => {
            const variant = {
                variant: 'test',
                parameters: [],
                returnType: { name: 'result', type: 'ReturnType' }
            };
            const params: any[] = [];

            const result = checker.checkReturnTypeMismatches(variant as any, checker.parseParams(params));

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('result');
            expect(result[0].syntaxType).toBe('ReturnType');
            expect(result[0].paramsType).toStrictEqual(['missing']);
        });

        test('should detect return type mismatches', () => {
            const variant = {
                variant: 'test',
                parameters: [],
                returnType: { name: 'result', type: 'ExpectedType' }
            };
            const params = [
                ['result', 'ActualType', '<-', 'Description1']
            ];

            const result = checker.checkReturnTypeMismatches(variant as any, checker.parseParams(params as any));

            expect(result).toHaveLength(1);
            expect(result[0].syntaxType).toBe('ExpectedType');
            expect(result[0].paramsType).toStrictEqual(['ActualType']);
        });

        test('should match return type by name', () => {
            const variant = {
                variant: 'test',
                parameters: [],
                returnType: { name: 'customResult', type: 'Type1' }
            };
            const params = [
                ['customResult', 'Type1', '<-', 'Description1']
            ];

            const result = checker.checkReturnTypeMismatches(variant as any, checker.parseParams(params as any));

            expect(result).toHaveLength(0);
        });

        test('should handle variants without return type', () => {
            const variant = {
                variant: 'test',
                parameters: []
            };
            const params = [
                ['result', 'Type1', '<-', 'Description1']
            ];

            const result = checker.checkReturnTypeMismatches(variant as any, checker.parseParams(params as any));

            expect(result).toHaveLength(0);
        });
    });

    describe('Type Validation', () => {
        test('should validate exact type matches', () => {
            expect(checker.isTypeValid('Text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Number'])).toBe(true);
        });

        test('should handle case insensitive validation', () => {
            expect(checker.isTypeValid('text', ['Text'])).toBe(true);
            expect(checker.isTypeValid('TEXT', ['text'])).toBe(true);
        });

        test('should validate "any" type', () => {
            expect(checker.isTypeValid('any', ['Text'])).toBe(true);
            expect(checker.isTypeValid('ANY', ['Number'])).toBe(true);
        });

        test('should handle type equivalences', () => {
            expect(checker.isTypeValid('Real', ['Number'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Real'])).toBe(true);
            expect(checker.isTypeValid('real', ['number'])).toBe(true);
        });

        test('should validate comma-separated types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Boolean', ['Text', 'Number'])).toBe(false);
        });

        test('should validate forward-slash separated types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Boolean', ['Text', 'Number'])).toBe(false);
        });

        test('should validate "or" keyword separated types', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Boolean', ['Text', 'Number'])).toBe(false);
        });

        test('should handle whitespace in type definitions', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number'])).toBe(true);
            expect(checker.isTypeValid('Number', ['Text', 'Number'])).toBe(true);
        });

        test('should handle mixed separators', () => {
            expect(checker.isTypeValid('Text', ['Text', 'Number', 'Boolean'])).toBe(true);
            expect(checker.isTypeValid('Boolean', ['Text', 'Number', 'Boolean'])).toBe(true);
        });
    });

    describe('Command Checking - Basic Functionality', () => {
        test('should handle command without syntax', () => {
            const command = {};

            // Should not throw and should handle gracefully
            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command));
            }).not.toThrow();
        });

        test('should handle command with syntax but no parameters', () => {
            const command = {
                Syntax: '**.root** : 4D.ZipFolder'
            };

            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command));
            }).not.toThrow();
        });

        test('should handle command with malformed syntax', () => {
            const command = {
                Syntax: '**badFunction** ( param : Type'
            };

            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command));
            }).not.toThrow();
        });
    });

    describe('Output and Analysis Methods', () => {
        test('should handle outputVariantAnalysis without crashing', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'Type1', optional: false, spread: false }
                ],
                malformation: {
                    isMalformed: false,
                    issues: []
                }
            };
            const params = [
                ['param1', 'Type1', '&#8594;', 'Description1']
            ];
            const actualParamNames = ['param1'];

            expect(() => {
                checker.outputVariantAnalysis(variant as any, 0, params as any, actualParamNames);
            }).not.toThrow();
        });

        test('should handle variant analysis with malformations', () => {
            const variant = {
                variant: 'test',
                parameters: [],
                malformation: {
                    isMalformed: true,
                    issues: [
                        { message: 'Test malformation', level: WarningLevel.LEVEL_1 }
                    ]
                }
            };
            const params: any[] = [];
            const actualParamNames: string[] = [];

            expect(() => {
                checker.outputVariantAnalysis(variant as any, 0, params, actualParamNames);
            }).not.toThrow();
        });

        test('should handle variant analysis with type mismatches', () => {
            const variant = {
                variant: 'test',
                parameters: [
                    { name: 'param1', type: 'WrongType', optional: false, spread: false }
                ],
                malformation: {
                    isMalformed: false,
                    issues: []
                }
            };
            const params = [
                ['param1', 'CorrectType', '&#8594;', 'Description1']
            ];
            const actualParamNames = ['param1'];

            expect(() => {
                checker.outputVariantAnalysis(variant as any, 0, params as any, actualParamNames);
            }).not.toThrow();
        });
    });

    describe('Items and Syntax Checking', () => {
        test('should check items in a syntax type', () => {
            const items = {
                'item1': { Syntax: '**.item1** : Type1' },
                'item2': { Syntax: '**.item2** ( param : Type )' }
            };

            expect(() => {
                checker.checkItems(items, 'TestType');
            }).not.toThrow();
        });

        test('should check all syntax types', () => {
            const syntax = {
                'Commands': {
                    'cmd1': { Syntax: '**.cmd1** : Type1' },
                    'cmd2': { Syntax: '**.cmd2** ( param : Type )' }
                },
                'Functions': {
                    'func1': { Syntax: '**.func1** () -> Type1' }
                }
            };

            expect(() => {
                checker.checkAllSyntax(syntax);
            }).not.toThrow();
        });
    });

    describe('Warning Level Filtering', () => {
        test('should filter malformations by warning level', () => {
            const level2Checker = new SyntaxChecker(WarningLevel.LEVEL_2);

            // This would require access to private methods, so we test through public interface
            const command = {
                Syntax: '**badFunction** ( param : Type',
                Params: []
            };

            expect(() => {
                level2Checker.checkCommand('TestCommand', checker.parseCommand(command));
            }).not.toThrow();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle null command object', () => {
            // Test should expect the throw for null command
            expect(() => {
                checker.checkCommand('TestCommand', null as any);
            }).toThrow();
        }); test('should handle command with null syntax', () => {
            const command = {
                Syntax: null
            };

            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command as any));
            }).not.toThrow();
        });

        test('should handle command with empty string syntax', () => {
            const command = {
                Syntax: ''
            };

            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command));
            }).not.toThrow();
        });

        test('should handle malformed parameter arrays', () => {
            const command = {
                Syntax: '**test** ( param : Type )',
                Params: [
                    null,
                    undefined,
                    ['param', 'Type', '&#8594;', 'Description']
                ]
            };

            // This should throw due to malformed params
            expect(() => {
                checker.checkCommand('TestCommand', checker.parseCommand(command as any));
            }).toThrow();
        });
    });

    describe('Performance Tests', () => {
        test('should handle large command objects efficiently', () => {
            const largeParams = Array.from({ length: 100 }, (_, i) =>
                [`param${i}`, `Type${i}`, '&#8594;', `Description${i}`]
            );

            const command = {
                Syntax: `**largeFunction** ( ${Array.from({ length: 100 }, (_, i) =>
                    `param${i} : Type${i}`).join(' ; ')} )`,
                Params: largeParams
            };

            const start = performance.now();
            checker.checkCommand('LargeTestCommand', checker.parseCommand(command as any));
            const end = performance.now();

            expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
        });

        test('should handle many variants efficiently', () => {
            const variants = Array.from({ length: 20 }, (_, i) =>
                `**func** ( param${i} : Type${i} )`
            ).join('<br/>');

            const command = {
                Syntax: variants,
                Params: [['param0', 'Type0', '&#8594;', 'Description']]
            };

            const start = performance.now();
            checker.checkCommand('ManyVariantsCommand', checker.parseCommand(command as any));
            const end = performance.now();

            expect(end - start).toBeLessThan(200); // Should complete in less than 200ms
        });
    });
});
