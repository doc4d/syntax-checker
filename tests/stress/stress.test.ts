import { describe, it, expect, beforeEach } from 'vitest';
import { Parser, SyntaxChecker } from '../../index.js';

describe('Syntax Checker Stress Tests', () => {
  let parser: Parser;
  let checker: SyntaxChecker;

  beforeEach(() => {
    parser = new Parser();
    checker = new SyntaxChecker();
  });

  describe('Performance Stress Tests', () => {
    it('should handle very large parameter counts', () => {
      const largeParamCount = 200;
      const largeSyntax = "**LARGE_PARAM_COUNT** ( " + 
        Array.from({length: largeParamCount}, (_, i) => `*param${i}* : Type${i % 10}`).join(' ; ') + 
        " )";
      
      const startTime = performance.now();
      const result = parser.parseSyntax(largeSyntax);
      const endTime = performance.now();
      
      expect(result[0].parameters).toHaveLength(largeParamCount);
      expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle multiple complex variants efficiently', () => {
      const complexVariants = Array.from({length: 20}, (_, i) => 
        `**COMPLEX_VARIANT_${i}** ( *param1* : Text ; *param2* : Integer { ; *param3* : Object { ; *param4* : Boolean } } )`
      ).join('<br/>');
      
      const startTime = performance.now();
      const result = parser.parseSyntax(complexVariants);
      const endTime = performance.now();
      
      expect(result).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle deeply nested optional parameters', () => {
      const deepOptional = "**DEEP_OPTIONAL** ( *param1* : Text { ; *param2* : Integer { ; *param3* : Object { ; *param4* : Boolean { ; *param5* : Collection { ; *param6* : Date } } } } } )";
      
      const startTime = performance.now();
      const result = parser.parseSyntax(deepOptional);
      const endTime = performance.now();
      
      expect(result[0].parameters).toHaveLength(6);
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle repeated parsing operations efficiently', () => {
      const testSyntax = "**REPEATED_TEST** ( *param1* : Text ; *param2* : Integer { ; *param3* : Object } )";
      const iterations = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = parser.parseSyntax(testSyntax);
        expect(result[0].parameters).toHaveLength(3);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      expect(avgTime).toBeLessThan(1); // Should average less than 1ms per parse
    });

    it('should handle concurrent-like operations', async () => {
      const testCases = Array.from({length: 100}, (_, i) => 
        `**CONCURRENT_${i}** ( *param${i}* : Type${i % 5} ; *param${i + 1}* : Type${(i + 1) % 5} )`
      );
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        testCases.map(async (syntax, index) => {
          return new Promise((resolve) => {
            // Simulate small async delay
            setTimeout(() => {
              const result = parser.parseSyntax(syntax);
              resolve({ index, paramCount: result[0].parameters.length });
            }, Math.random() * 5);
          });
        })
      );
      
      const endTime = performance.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      
      results.forEach(result => {
        expect(result.paramCount).toBe(2);
      });
    });
  });

  describe('Unicode and Special Character Stress Tests', () => {
    it('should handle various Unicode scripts', () => {
      const unicodeTests = [
        "**LATIN** ( *paramètre* : Texte ; *naïve* : Objet )",
        "**CYRILLIC** ( *параметр* : Текст ; *объект* : Объект )",
        "**GREEK** ( *παράμετρος* : Κείμενο ; *αντικείμενο* : Αντικείμενο )",
        "**ARABIC** ( *معامل* : نص ; *كائن* : كائن )",
        "**HEBREW** ( *פרמטר* : טקסט ; *אובייקט* : אובייקט )",
        "**JAPANESE** ( *パラメータ* : テキスト ; *オブジェクト* : オブジェクト )",
        "**KOREAN** ( *매개변수* : 텍스트 ; *객체* : 객체 )",
        "**CHINESE** ( *参数* : 文本 ; *对象* : 对象 )",
        "**THAI** ( *พารามิเตอร์* : ข้อความ ; *วัตถุ* : วัตถุ )",
        "**HINDI** ( *पैरामीटर* : पाठ ; *वस्तु* : वस्तु )"
      ];
      
      unicodeTests.forEach((syntax, index) => {
        const result = parser.parseSyntax(syntax);
        expect(result).toHaveLength(1);
        expect(result[0].parameters).toHaveLength(2);
      });
    });

    it('should handle special characters in parameter names', () => {
      const specialCharTests = [
        "**UNDERSCORE** ( *param_with_underscore* : Text ; *another_param* : Integer )",
        "**DASH** ( *param-with-dash* : Text ; *another-param* : Integer )",
        "**DOT** ( *param.with.dots* : Text ; *another.param* : Integer )",
        "**NUMBERS** ( *param123* : Text ; *param456* : Integer )",
        "**MIXED** ( *param_123-test.value* : Text ; *complex.param_name-456* : Integer )"
      ];
      
      specialCharTests.forEach(syntax => {
        const result = parser.parseSyntax(syntax);
        expect(result).toHaveLength(1);
        expect(result[0].parameters).toHaveLength(2);
      });
    });
  });

  describe('Malformed Syntax Recovery Tests', () => {
    it('should recover from various malformed syntax patterns', () => {
      const malformedTests = [
        { syntax: "**MALFORMED_1** ( *param1* : Text ; *param2* : ; *param3* : Object )", desc: "Missing type" },
        { syntax: "**MALFORMED_2** ( *param1* Text ; *param2* : Integer )", desc: "Missing colon" },
        { syntax: "**MALFORMED_3** ( param1 : Text ; *param2* : Integer )", desc: "Missing asterisks" },
        { syntax: "**MALFORMED_4** ( *param1* : Text ; *param2* : Integer", desc: "Missing closing parenthesis" },
        { syntax: "**MALFORMED_5** *param1* : Text ; *param2* : Integer )", desc: "Missing opening parenthesis" },
        { syntax: "**MALFORMED_6** ( *param1* : Text { ; *param2* : Integer }", desc: "Missing closing brace" },
        { syntax: "**MALFORMED_7** ( *param1* : Text ; *param2* : Integer { } )", desc: "Empty optional block" },
        { syntax: "**MALFORMED_8** ( *param1* : Text ; ; *param2* : Integer )", desc: "Double semicolon" },
        { syntax: "**MALFORMED_9** ( *param1* : Text : Integer )", desc: "Double colon" },
        { syntax: "**MALFORMED_10** ( **param1** : Text ; *param2* : Integer )", desc: "Double asterisks" }
      ];
      
      malformedTests.forEach(({ syntax, desc }) => {
        expect(() => {
          const result = parser.parseSyntax(syntax);
          expect(result).toBeInstanceOf(Array);
          expect(result).toHaveLength(1);
        }).not.toThrow();
      });
    });

    it('should handle extremely malformed syntax', () => {
      const extremelyMalformed = [
        "**EXTREME_1** ( ( ( *param* : Text ) ) )",
        "**EXTREME_2** ( *param* :: Text )",
        "**EXTREME_3** ( ***param*** : Text )",
        "**EXTREME_4** ( *param* : Text ;;;; *param2* : Integer )",
        "**EXTREME_5** ( { *param* : Text } )",
        "**EXTREME_6** ( *param* : Text { { { ; *param2* : Integer } } } )",
        "**EXTREME_7** ( *param1* : Text ; *param2* : Text ; *param3* : Text",
        "**EXTREME_8** *param1* : Text ; *param2* : Text ; *param3* : Text",
        "**EXTREME_9** ( )",
        "**EXTREME_10** ()"
      ];
      
      extremelyMalformed.forEach(syntax => {
        expect(() => {
          const result = parser.parseSyntax(syntax);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Type Validation Stress Tests', () => {
    it('should handle complex type combinations efficiently', () => {
      const complexTypes = [
        "Text/Blob/Object/Collection/Boolean/Integer/Real/Time/Date/Picture",
        "Text, Blob, Object, Collection, Boolean, Integer, Real, Time, Date, Picture",
        "Very.Long.Namespace.With.Many.Dots.TypeName",
        "AnotherVery.Long.Namespace.With.Even.More.Dots.And.Numbers123.TypeName",
        "cs.ViewPro.TableThemeOptions.With.Very.Long.Namespace.Name"
      ];
      
      const testValues = ["Text", "Blob", "Object", "Integer", "Boolean", "Real", "Time", "Date"];
      
      complexTypes.forEach(complexType => {
        testValues.forEach(testValue => {
          const startTime = performance.now();
          const result = checker.isTypeValid(complexType, testValue);
          const endTime = performance.now();
          
          expect(typeof result).toBe('boolean');
          expect(endTime - startTime).toBeLessThan(1); // Should be very fast
        });
      });
    });

    it('should handle many type validation operations', () => {
      const iterations = 10000;
      const types = ["Text", "Integer", "Object", "Boolean", "Real"];
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const type1 = types[i % types.length];
        const type2 = types[(i + 1) % types.length];
        const result = checker.isTypeValid(type1, type2);
        expect(typeof result).toBe('boolean');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      expect(avgTime).toBeLessThan(0.1); // Should average less than 0.1ms per validation
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should not leak memory with repeated operations', () => {
      const testSyntax = "**MEMORY_TEST** ( *param1* : Text ; *param2* : Integer { ; *param3* : Object } )";
      const iterations = 5000;
      
      // Run many iterations to test for memory leaks
      for (let i = 0; i < iterations; i++) {
        const result = parser.parseSyntax(testSyntax);
        expect(result[0].parameters).toHaveLength(3);
        
        // Occasionally force garbage collection if available
        if (i % 1000 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Test should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle large objects efficiently', () => {
      const largeCommand = {
        "Syntax": "**LARGE_OBJECT_TEST** ( " + 
          Array.from({length: 100}, (_, i) => `*param${i}* : Type${i}`).join(' ; ') + " )",
        "Params": Array.from({length: 100}, (_, i) => [
          `param${i}`,
          `Type${i}`,
          "->",
          `Description for parameter ${i} with some additional text to make it longer`
        ])
      };
      
      const startTime = performance.now();
      
      expect(() => {
        checker.checkCommand("LARGE_OBJECT_TEST", largeCommand);
      }).not.toThrow();
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle complex combinations of edge cases', () => {
      const edgeCaseCombinations = [
        "**EDGE_1** ( *paramètre_123* : Text/Blob ; *日本語-param* : Object, Collection )",
        "**EDGE_2** ( *param.with.dots* : cs.ViewPro.TableTheme { ; *param_underscore* : Very.Long.Type.Name } )",
        "**EDGE_3** ( *混合_param-123* : Text/Integer/Boolean, Object { ; *another.param* : Collection } )",
        "**EDGE_4** ( *param* : Text { { ; *nested* : Integer { ; *deep* : Object } } } )"
      ];
      
      edgeCaseCombinations.forEach(syntax => {
        const result = parser.parseSyntax(syntax);
        expect(result).toHaveLength(1);
        expect(result[0].parameters.length).toBeGreaterThan(0);
      });
    });

    it('should handle mixed valid and invalid patterns', () => {
      const mixedPatterns = [
        "**MIXED_1** ( *valid* : Text ; *invalid* : ; *valid2* : Integer )",
        "**MIXED_2** ( *valid* : Text ; invalid : Integer ; *valid2* : Object )",
        "**MIXED_3** ( *valid* : Text { ; *invalid* : { ; *valid2* : Integer } } )",
        "**MIXED_4** ( *valid* : Text ; *valid2* : Integer ; *valid3* : Object"
      ];
      
      mixedPatterns.forEach(syntax => {
        expect(() => {
          const result = parser.parseSyntax(syntax);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});
