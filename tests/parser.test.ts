import { describe, it, expect, beforeEach } from 'vitest';
import { Parser, parseSyntax, parseParameters } from '../out/index.js';

describe('Parser Class', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

  describe('Basic Parsing', () => {
    it('should parse basic syntax correctly', () => {
      const testSyntax = "**VP SET TIME VALUE** ( *rangeObj* : Object ; *timeValue* : Text { ; *formatPattern* : Text } )";
      const variants = parser.parseSyntax(testSyntax);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].parameters).toHaveLength(3);
      expect(variants[0].parameters[0]).toEqual({
        name: 'rangeObj',
        type: 'Object',
        optional: false,
        spread: false
      });
      expect(variants[0].parameters[1]).toEqual({
        name: 'timeValue',
        type: 'Text',
        optional: false,
        spread: false
      });
      expect(variants[0].parameters[2]).toEqual({
        name: 'formatPattern',
        type: 'Text',
        optional: true,
        spread: false
      });
    });

    it('should parse multiple variants correctly', () => {
      const multiVariantSyntax = "**VP ADD SHEET** ( *vpAreaName* : Text )<br/>**VP ADD SHEET** ( *vpAreaName* : Text ; *index* : Integer )<br/>**VP ADD SHEET** ( *vpAreaName* : Text ; *sheet* : Integer ; *name* : Text )";
      const variants = parser.parseSyntax(multiVariantSyntax);
      
      expect(variants).toHaveLength(3);
      expect(variants[0].parameters).toHaveLength(1);
      expect(variants[1].parameters).toHaveLength(2);
      expect(variants[2].parameters).toHaveLength(3);
    });

    it('should parse complex parameters with optional and spread', () => {
      const complexSyntax = "**VP Combine ranges** ( *rangeObj* : Object ; *otherRangeObj* : Object {;...*otherRangeObjN* : Object } ) : Object";
      const variants = parser.parseSyntax(complexSyntax);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].parameters).toHaveLength(3);
      expect(variants[0].parameters[1].optional).toBe(false); // otherRangeObj is not in optional block
      expect(variants[0].parameters[2].optional).toBe(true); // otherRangeObjN is in optional block
      expect(variants[0].parameters[2].spread).toBe(true); // otherRangeObjN is spread
    });
  });

  describe('Performance', () => {
    it('should handle performance with large syntax', () => {
      const largeSyntax = "**LARGE_COMMAND** ( " + 
        Array.from({length: 50}, (_, i) => `*param${i}* : Text`).join(' ; ') + 
        " )";
      
      const startTime = performance.now();
      const result = parser.parseSyntax(largeSyntax);
      const endTime = performance.now();
      
      expect(result[0].parameters).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(10); // Should be fast
    });

    it('should handle large parameter counts efficiently', () => {
      const largeSyntax = "**LARGE_PARAMS** ( " + 
        Array.from({length: 100}, (_, i) => `*param${i}* : Type${i}`).join(' ; ') + 
        " )";
      
      const startTime = performance.now();
      const result = parser.parseSyntax(largeSyntax);
      const endTime = performance.now();
      
      expect(result[0].parameters).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple variants efficiently', () => {
      const multiVariantSyntax = Array.from({length: 20}, (_, i) => 
        `**TEST_VARIANT** ( *param${i}* : Text${i > 0 ? ` ; *extraParam${i}* : Integer` : ''} )`
      ).join('<br/>');
      
      const startTime = performance.now();
      const result = parser.parseSyntax(multiVariantSyntax);
      const endTime = performance.now();
      
      expect(result).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(20);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle Unicode and special characters', () => {
      const unicodeSyntax = "**UNICODE_TEST** ( *paramétèr* : Text ; *日本語* : Object )";
      const variants = parser.parseSyntax(unicodeSyntax);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].parameters).toHaveLength(2);
      expect(variants[0].parameters[0].name).toBe('paramétèr');
      expect(variants[0].parameters[1].name).toBe('日本語');
    });

    it('should handle various Unicode scripts', () => {
      const unicodeTests = [
        "**GREEK_TEST** ( *αβγδε* : Text )",
        "**CYRILLIC_TEST** ( *абвгд* : Text )",
        "**ARABIC_TEST** ( *اختبار* : Text )",
        "**CHINESE_TEST** ( *测试参数* : Text )"
      ];
      
      unicodeTests.forEach(syntax => {
        const result = parser.parseSyntax(syntax);
        expect(result).toHaveLength(1);
        expect(result[0].parameters).toHaveLength(1);
      });
    });

    it('should handle special characters in parameter names', () => {
      const specialChars = [
        "**SPECIAL_TEST** ( *param_with_underscore* : Text )",
        "**SPECIAL_TEST2** ( *param-with-dash* : Text )",
        "**SPECIAL_TEST3** ( *param.with.dots* : Text )"
      ];
      
      specialChars.forEach(syntax => {
        const result = parser.parseSyntax(syntax);
        expect(result).toHaveLength(1);
        expect(result[0].parameters).toHaveLength(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed syntax gracefully', () => {
      const malformedTests = [
        "**MALFORMED** ( )",
        "**EMPTY_PARAMS** ( *param* : )",
        "**MISSING_CLOSING** ( *param* : Text",
        "**DOUBLE_OPTIONAL** ( *param* : Text { { ; *param2* : Integer } } )"
      ];
      
      malformedTests.forEach(syntax => {
        expect(() => parser.parseSyntax(syntax)).not.toThrow();
      });
    });

    it('should recover from various malformed syntax patterns', () => {
      const malformedPatterns = [
        "**UNCLOSED_BRACKET** ( *param* : Text {",
        "**EXTRA_BRACKET** ( *param* : Text } )",
        "**MISSING_SEMICOLON** ( *param1* : Text *param2* : Integer )",
        "**INVALID_CHARS** ( *param@#$* : Text )"
      ];
      
      malformedPatterns.forEach(pattern => {
        const result = parser.parseSyntax(pattern);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle extremely malformed syntax', () => {
      const extremelyMalformed = [
        "}{*)(*)}{",
        "**COMMAND",
        "( *param* : )",
        "**CMD** ( *p1* : ; *p2* : Text )"
      ];
      
      extremelyMalformed.forEach(syntax => {
        expect(() => parser.parseSyntax(syntax)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very complex Unicode parameter names', () => {
      const complexUnicode = "**COMPLEX_UNICODE** ( *🚀parameter* : Text ; *测试パラメータ* : Object ; *مَعْلَمة* : Integer )";
      const result = parser.parseSyntax(complexUnicode);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('🚀parameter');
      expect(result[0].parameters[1].name).toBe('测试パラメータ');
      expect(result[0].parameters[2].name).toBe('مَعْلَمة');
    });

    it('should handle very long parameter names', () => {
      const longParamName = 'a'.repeat(100);
      const syntax = `**LONG_PARAM_TEST** ( *${longParamName}* : Text )`;
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters[0].name).toBe(longParamName);
    });

    it('should handle deeply nested optional parameters', () => {
      const deepNested = "**DEEP_NESTED** ( *param1* : Text { ; *param2* : Integer { ; *param3* : Object { ; *param4* : Boolean } } } )";
      const result = parser.parseSyntax(deepNested);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(4);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with parseSyntax', () => {
      const testSyntax = "**VP SET TIME VALUE** ( *rangeObj* : Object ; *timeValue* : Text { ; *formatPattern* : Text } )";
      const legacyResult = parseSyntax(testSyntax);
      const newResult = parser.parseSyntax(testSyntax);
      
      expect(legacyResult).toEqual(newResult);
    });

    it('should maintain backward compatibility with parseParameters', () => {
      const paramString = "*rangeObj* : Object ; *timeValue* : Text { ; *formatPattern* : Text }";
      const params = parseParameters(paramString);
      
      expect(params).toHaveLength(3);
      expect(params[0].name).toBe('rangeObj');
      expect(params[0].type).toBe('Object');
    });
  });

  describe('Markdown Asterisk Preprocessing', () => {
    it('should remove asterisks around parameter names', () => {
      const syntax = "**test** ( *param* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0].name).toBe('param');
      expect(result[0].parameters[0].type).toBe('Text');
    });

    it('should handle spread parameters with asterisks', () => {
      const syntax = "**concat** ( *value* : any { *;...valueN* } ) : Collection";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('value');
      expect(result[0].parameters[0].optional).toBe(false); // value is NOT in optional block
      expect(result[0].parameters[1].name).toBe('valueN');
      expect(result[0].parameters[1].spread).toBe(true);
      expect(result[0].parameters[1].optional).toBe(true); // valueN is in optional block
    });

    it('should handle complex asterisk patterns', () => {
      const syntax = "**test** ( *param1* : Text ; *param2* : Integer { ; *...params* } )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('param1');
      expect(result[0].parameters[1].name).toBe('param2');
      expect(result[0].parameters[2].name).toBe('params');
      expect(result[0].parameters[2].spread).toBe(true);
      expect(result[0].parameters[2].optional).toBe(true);
    });

    it('should preserve escaped asterisks', () => {
      const syntax = "**test** ( \\* ; *param* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('*');
      expect(result[0].parameters[0].type).toBe('marker');
      expect(result[0].parameters[1].name).toBe('param');
      expect(result[0].parameters[1].type).toBe('Text');
    });

    it('should handle nested asterisks in optional blocks', () => {
      const syntax = "**test** ( *param* : Text { ; *optional* : Integer { ; *nested* : Boolean } } )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('param');
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[1].name).toBe('optional');
      expect(result[0].parameters[1].optional).toBe(true);
      expect(result[0].parameters[2].name).toBe('nested');
      expect(result[0].parameters[2].optional).toBe(true);
    });
  });

  describe('Standalone Asterisk Operators', () => {
    it('should handle standalone asterisk as operator', () => {
      const syntax = "**test** ( {* ;} *param* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('*');
      expect(result[0].parameters[0].type).toBe('operator');
      expect(result[0].parameters[0].optional).toBe(true);
      expect(result[0].parameters[1].name).toBe('param');
      expect(result[0].parameters[1].type).toBe('Text');
      expect(result[0].parameters[1].optional).toBe(false);
    });

    it('should handle multiple standalone asterisks', () => {
      const syntax = "**test** ( * ; * ; *param* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('*');
      expect(result[0].parameters[0].type).toBe('operator');
      expect(result[0].parameters[1].name).toBe('*');
      expect(result[0].parameters[1].type).toBe('operator');
      expect(result[0].parameters[2].name).toBe('param');
      expect(result[0].parameters[2].type).toBe('Text');
    });

    it('should differentiate between operator and marker asterisks', () => {
      const syntax = "**test** ( \\* ; * ; *param* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('*');
      expect(result[0].parameters[0].type).toBe('marker');
      expect(result[0].parameters[1].name).toBe('*');
      expect(result[0].parameters[1].type).toBe('operator');
      expect(result[0].parameters[2].name).toBe('param');
      expect(result[0].parameters[2].type).toBe('Text');
    });

    it('should handle asterisk operators in optional blocks', () => {
      const syntax = "**test** ( *param1* : Text { ; * ; *param2* : Integer } )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('param1');
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[1].name).toBe('*');
      expect(result[0].parameters[1].type).toBe('operator');
      expect(result[0].parameters[1].optional).toBe(true);
      expect(result[0].parameters[2].name).toBe('param2');
      expect(result[0].parameters[2].optional).toBe(true);
    });
  });

  describe('Complex Spread and Optional Patterns', () => {
    it('should handle spread with type information', () => {
      const syntax = "**test** ( *first* : Text ; *...rest* : Object )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('first');
      expect(result[0].parameters[0].spread).toBe(false);
      expect(result[0].parameters[1].name).toBe('rest');
      expect(result[0].parameters[1].spread).toBe(true);
      expect(result[0].parameters[1].type).toBe('Object');
    });

    it('should handle optional spread parameters', () => {
      const syntax = "**test** ( *base* : Text { ; *...extras* : any } )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('base');
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[0].spread).toBe(false);
      expect(result[0].parameters[1].name).toBe('extras');
      expect(result[0].parameters[1].optional).toBe(true);
      expect(result[0].parameters[1].spread).toBe(true);
    });

    it('should handle complex nested optional patterns', () => {
      const syntax = "**test** ( *a* : Text { ; *b* : Integer { ; *c* : Boolean } ; *d* : Object } )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(4);
      expect(result[0].parameters[0].name).toBe('a');
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[1].name).toBe('b');
      expect(result[0].parameters[1].optional).toBe(true);
      expect(result[0].parameters[2].name).toBe('c');
      expect(result[0].parameters[2].optional).toBe(true);
      expect(result[0].parameters[3].name).toBe('d');
      expect(result[0].parameters[3].optional).toBe(true);
    });

    it('should handle malformed spread patterns gracefully', () => {
      const malformedSpread = [
        "**test** ( *...* : Text )",
        "**test** ( *...* )",
        "**test** ( *param* : *...* )"
      ];
      
      malformedSpread.forEach(syntax => {
        expect(() => parser.parseSyntax(syntax)).not.toThrow();
      });
    });
  });

  describe('Type Parsing Edge Cases', () => {
    it('should handle types without colons', () => {
      const syntax = "**test** ( *param* Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      // Parser doesn't handle types without colons - returns empty parameters
      expect(result[0].parameters).toHaveLength(0);
    });

    it('should handle complex type definitions', () => {
      const syntax = "**test** ( *param* : Text, Number, Array )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0].name).toBe('param');
      expect(result[0].parameters[0].type).toBe('Text, Number, Array');
    });

    it('should handle types with special characters', () => {
      const syntax = "**test** ( *param* : cs.ViewPro.TableOptions )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0].name).toBe('param');
      expect(result[0].parameters[0].type).toBe('cs.ViewPro.TableOptions');
    });

    it('should handle missing types gracefully', () => {
      const syntax = "**test** ( *param* : ; *param2* : Text )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('param');
      expect(result[0].parameters[0].type).toBe('unknown');
      expect(result[0].parameters[1].name).toBe('param2');
      expect(result[0].parameters[1].type).toBe('Text');
    });
  });

  describe('Real-World Examples', () => {
    it('should handle WebSocket.send() variants', () => {
      const syntax = "**.send**( *message* : Text )<br/>**.send**( *message* : Blob )<br/>**.send**( *message* : Object )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(3);
      result.forEach((variant, index) => {
        expect(variant.parameters).toHaveLength(1);
        expect(variant.parameters[0].name).toBe('message');
        expect(variant.parameters[0].type).toBe(['Text', 'Blob', 'Object'][index]);
      });
    });

    it('should handle VP commands with complex parameters', () => {
      const syntax = "**VP PASTE FROM OBJECT** ( *rangeObj* : Object ; *dataObject* : Object {; *options* : Integer} )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(3);
      expect(result[0].parameters[0].name).toBe('rangeObj');
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[1].name).toBe('dataObject');
      expect(result[0].parameters[1].optional).toBe(false); // dataObject is NOT in optional block
      expect(result[0].parameters[2].name).toBe('options');
      expect(result[0].parameters[2].optional).toBe(true); // options is in optional block
    });

    it('should handle WP commands with variable parameters', () => {
      const syntax = "**WP Get attributes** ( *targetObj* ; *attribName* ; *attribValue* {; *attribName2* ; *attribValue2* ; ... ; *attribNameN* ; *attribValueN*} )";
      const result = parser.parseSyntax(syntax);
      
      expect(result).toHaveLength(1);
      expect(result[0].parameters.length).toBeGreaterThan(3);
      expect(result[0].parameters[0].name).toBe('targetObj');
      expect(result[0].parameters[1].name).toBe('attribName');
      expect(result[0].parameters[2].name).toBe('attribValue');
    });
  });
});
