import { describe, it, expect, beforeEach } from 'vitest';
import { SyntaxChecker } from '../out/index.js';

describe('SyntaxChecker Class', () => {
  let checker: SyntaxChecker;

  beforeEach(() => {
    checker = new SyntaxChecker();
  });

  describe('Type Validation', () => {
    it('should validate exact type matches', () => {
      expect(checker.isTypeValid("Text", "Text")).toBe(true);
      expect(checker.isTypeValid("Object", "Object")).toBe(true);
      expect(checker.isTypeValid("Integer", "Integer")).toBe(true);
    });

    it('should validate forward-slash separated types', () => {
      expect(checker.isTypeValid("Text", "Text/Blob")).toBe(true);
      expect(checker.isTypeValid("Blob", "Text/Blob")).toBe(true);
      expect(checker.isTypeValid("Object", "Text/Blob")).toBe(false);
      expect(checker.isTypeValid("Object", "Text/Blob/Object")).toBe(true);
    });

    it('should validate comma-separated types', () => {
      expect(checker.isTypeValid("Text", "Text, Number, Object")).toBe(true);
      expect(checker.isTypeValid("Number", "Text, Number, Object")).toBe(true);
      expect(checker.isTypeValid("Boolean", "Text, Number, Object")).toBe(false);
    });

    it('should handle type equivalences', () => {
      expect(checker.isTypeValid("Real", "Number")).toBe(true);
      expect(checker.isTypeValid("Number", "Real")).toBe(true);
      expect(checker.isTypeValid("Text", "String")).toBe(false); // No equivalence
      expect(checker.isTypeValid("Integer", "Boolean")).toBe(false); // No equivalence
    });

    it('should handle "any" type validation', () => {
      expect(checker.isTypeValid("any", "Text")).toBe(true);
      expect(checker.isTypeValid("any", "Number")).toBe(true);
      expect(checker.isTypeValid("any", "Boolean")).toBe(true);
      expect(checker.isTypeValid("any", "Object")).toBe(true);
      expect(checker.isTypeValid("any", "Array")).toBe(true);
      expect(checker.isTypeValid("any", "Collection")).toBe(true);
      expect(checker.isTypeValid("any", "Date")).toBe(true);
      expect(checker.isTypeValid("any", "Complex Type")).toBe(true);
      expect(checker.isTypeValid("any", "Number, Text, Collection, Object, Date, Boolean")).toBe(true);
    });

    it('should handle spread parameters correctly', () => {
      // Test Collection.concat example - should not flag spread parameters as errors
      const concatCommand = {
        Syntax: "**.concat**( *value* : any { *;...valueN* } ) : Collection",
        Params: [
          ["value", "Number, Text, Object, Collection, Date, Time, Boolean, Picture", "->", "Value(s) to concatenate"],
          ["Result", "Collection", "<-", "New collection with value(s) added"]
        ] as any[]
      };
      
      // This should not throw or show errors for spread parameters
      expect(() => checker.checkCommand("Collection.concat", concatCommand)).not.toThrow();
    });

    it('should handle output parameters correctly', () => {
      // Test WA GET LAST URL ERROR example - should include output parameters
      const waGetLastUrlErrorCommand = {
        Syntax: "**WA GET LAST URL ERROR** ( {* ;} *object* ; *url* ; *description* ; *errorCode* )",
        Params: [
          ["*", "Operator", "&#8594;", "If specified, object is an object name"],
          ["object", "any", "&#8594;", "Object name or Variable"],
          ["url", "Text", "&#8592;", "URL at origin of error"],
          ["description", "Text", "&#8592;", "Description of error"],
          ["errorCode", "Integer", "&#8592;", "Error code"]
        ] as any[]
      };
      
      // This should not throw or show errors for output parameters
      expect(() => checker.checkCommand("WA GET LAST URL ERROR", waGetLastUrlErrorCommand)).not.toThrow();
    });

    it('should handle comma-separated type validation', () => {
      expect(checker.isTypeValid("Text", "Text, Number, Array")).toBe(true);
      expect(checker.isTypeValid("Number", "Text, Number, Array")).toBe(true);
      expect(checker.isTypeValid("Array", "Text, Number, Array")).toBe(true);
      expect(checker.isTypeValid("Boolean", "Text, Number, Array")).toBe(false);
    });

    it('should handle complex type combinations efficiently', () => {
      const complexTypes = [
        "Text/Blob/Object/Number/Integer/Boolean",
        "Text, Number, Array, Collection, Object",
        "Text/Blob, Number/Integer, Object/Array"
      ];
      
      complexTypes.forEach(type => {
        expect(checker.isTypeValid("Text", type)).toBe(true);
        expect(checker.isTypeValid("Number", type)).toBe(true);
        expect(checker.isTypeValid("NonExistent", type)).toBe(false);
      });
    });

    it('should handle many type validation operations', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        checker.isTypeValid("Text/Blob/Object", "Text");
        checker.isTypeValid("Text, Number, Array", "Number");
        checker.isTypeValid("Real", "Number");
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Command Validation', () => {
    it('should detect type mismatches', () => {
      const command = {
        "Syntax": "**PASTE FROM OBJECT** ( *rangeObj* : Object ; *dataObject* : Object {; *options* : Integer} )",
        "Params": [
          ["rangeObj", "Object", "->", "Cell range object"],
          ["dataObject", "Object", "->", "Object containing the data to be pasted"],
          ["options", "Text", "->", "Specifies what is pasted"]
        ]
      };
      
      // Mock console.log to capture output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("VP PASTE FROM OBJECT", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      // Should output command details when there are errors
      expect(output).toContain('VP PASTE FROM OBJECT');
      expect(output).toContain('Integer');
      expect(output).toContain('Text');
    });

    it('should detect parameter name mismatches', () => {
      const command = {
        "Syntax": "**VP REMOVE NAME** ( *vpAreaName* : Text ; *name* : Text { ; *sheet* : Integer } )",
        "Params": [
          ["vpAreaName", "Text", "->", "4D View Pro area form object name"],
          ["name", "Text", "->", "Name of the named range or named formula to remove"],
          ["scope", "Integer", "->", "Target scope (default=current sheet)"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("VP REMOVE NAME", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('Extra/Invalid parameters');
      expect(output).toContain('sheet');
    });

    it('should handle WebSocket.send() type validation', () => {
      const webSocketCommand = {
        "Syntax": "**.send**( *message* : Text )<br/>**.send**( *message* : Blob )<br/>**.send**( *message* : Object )",
        "Params": [
          ["message", "Text/Blob/Object", "->", "Message to send"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("WebSocket.send", webSocketCommand);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('WebSocket.send');
      expect(output).not.toContain('Type mismatches'); // Should NOT have type mismatches after fix
    });

    it('should handle empty and null parameters', () => {
      const emptyCommand = {
        "Syntax": "**EMPTY_COMMAND** ( )",
        "Params": []
      };
      
      const nullCommand = {
        "Syntax": "**NULL_PARAMS** ( *param* : Text )",
        "Params": null
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("Empty test", emptyCommand);
      checker.checkCommand("Null test", nullCommand);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('Empty test');
      expect(output).toContain('Null test');
    });

    it('should handle case sensitivity in parameter names', () => {
      const command = {
        "Syntax": "**CASE_TEST** ( *ParamName* : Text ; *paramname* : Integer )",
        "Params": [
          ["ParamName", "Text", "->", "Mixed case parameter"],
          ["paramname", "Integer", "->", "Lower case parameter"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("CASE_TEST", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('CASE_TEST');
      expect(output).toContain('Type mismatches');
    });

    it('should handle very long parameter names', () => {
      const longParamName = 'thisIsAVeryLongParameterNameThatShouldStillWork';
      const command = {
        "Syntax": `**LONG_NAMES** ( *${longParamName}* : VeryLongTypeName )`,
        "Params": [
          [longParamName, "VeryLongTypeName", "->", "Long parameter name test"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("LONG_NAMES", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('LONG_NAMES');
    });

    it('should handle method chaining and object notation', () => {
      const command = {
        "Syntax": "**.addCSSClass**(*className* : string)",
        "Params": [
          ["className", "string", "->", "CSS class name"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("WebFormItem.addCSSClass", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('WebFormItem.addCSSClass');
    });

    it('should handle return type validation', () => {
      const command = {
        "Syntax": "**RETURN_TEST** ( *input* : Text ) : Integer",
        "Params": [
          ["input", "Text", "->", "Input parameter"],
          ["Function result", "Integer", "<-", "Return value"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("RETURN_TEST", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('RETURN_TEST');
      expect(output).toContain('Syntax: **RETURN_TEST** ( *input* : Text ) : Integer');
    });

    it('should handle multiple return types', () => {
      const command = {
        "Syntax": "**MULTI_RETURN** ( *input* : Text ) : Text/Integer/Boolean",
        "Params": [
          ["input", "Text", "->", "Input parameter"],
          ["Function result", "Text/Integer/Boolean", "<-", "Multiple return types"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("MULTI_RETURN", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('MULTI_RETURN');
      expect(output).toContain('Syntax: **MULTI_RETURN** ( *input* : Text ) : Text/Integer/Boolean');
    });

    it('should detect return type mismatches', () => {
      const command = {
        "Syntax": "**RETURN_MISMATCH** ( *input* : Text ) : Integer",
        "Params": [
          ["input", "Text", "->", "Input parameter"],
          ["Function result", "Text", "<-", "Return value should be Integer but is Text"]
        ] as any[]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("RETURN_MISMATCH", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('Return type mismatches');
      expect(output).toContain('Function result: syntax declares \'Integer\' but params declare \'Text\'');
    });

    it('should detect missing return parameters', () => {
      const command = {
        "Syntax": "**MISSING_RETURN** ( *input* : Text ) : Integer",
        "Params": [
          ["input", "Text", "->", "Input parameter"]
        ] as any[]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("MISSING_RETURN", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('Return type mismatches');
      expect(output).toContain('Function result: syntax declares \'Integer\' but params declare \'missing\'');
    });

    it('should handle arrow return syntax with name and type', () => {
      const command = {
        "Syntax": "**ARROW_RETURN** ( *input* : Text ) -> result : Integer",
        "Params": [
          ["input", "Text", "->", "Input parameter"],
          ["result", "Integer", "<-", "Return value"]
        ] as any[]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("ARROW_RETURN", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('ARROW_RETURN');
      expect(output).toContain('Syntax: **ARROW_RETURN** ( *input* : Text ) -> result : Integer');
    });

    it('should handle arrow return syntax with name only', () => {
      const command = {
        "Syntax": "**ARROW_NAME_ONLY** ( *input* : Text ) -> result",
        "Params": [
          ["input", "Text", "->", "Input parameter"],
          ["result", "Integer", "<-", "Return value"]
        ] as any[]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("ARROW_NAME_ONLY", command);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('ARROW_NAME_ONLY');
      expect(output).toContain('Syntax: **ARROW_NAME_ONLY** ( *input* : Text ) -> result');
    });
  });

  describe('WebSocket.send() Individual Variants', () => {
    it('should handle individual variant types correctly', () => {
      const variants = [
        {
          "Syntax": "**.send**( *message* : Text )",
          "Params": [["message", "Text", "->", "Text message"]]
        },
        {
          "Syntax": "**.send**( *message* : Blob )",
          "Params": [["message", "Blob", "->", "Blob message"]]
        },
        {
          "Syntax": "**.send**( *message* : Object )",
          "Params": [["message", "Object", "->", "Object message"]]
        }
      ];
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      variants.forEach((variant, index) => {
        checker.checkCommand(`WebSocket.send variant ${index + 1}`, variant);
      });
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('WebSocket.send variant 1');
      expect(output).toContain('WebSocket.send variant 2');
      expect(output).toContain('WebSocket.send variant 3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed syntax edge cases', () => {
      const malformedCommands = [
        {
          "Syntax": "**MALFORMED** ( *param* : ",
          "Params": [["param", "Text", "->", "Malformed parameter"]]
        },
        {
          "Syntax": "**INCOMPLETE** ( *param1* : Text ; *param2*",
          "Params": [["param1", "Text", "->", "Complete parameter"]]
        }
      ];
      
      malformedCommands.forEach(command => {
        expect(() => checker.checkCommand("MALFORMED_TEST", command)).not.toThrow();
      });
    });

    it('should handle very complex Unicode parameter names', () => {
      const unicodeCommand = {
        "Syntax": "**UNICODE_TEST** ( *🚀测试パラメータ* : Text )",
        "Params": [
          ["🚀测试パラメータ", "Text", "->", "Unicode parameter"]
        ]
      };
      
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      
      checker.checkCommand("UNICODE_TEST", unicodeCommand);
      
      console.log = originalLog;
      
      const output = logs.join('\n');
      expect(output).toContain('UNICODE_TEST');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large parameter counts efficiently', () => {
      const largeCommand = {
        "Syntax": "**LARGE_PARAMS** ( " + 
          Array.from({length: 50}, (_, i) => `*param${i}* : Type${i}`).join(' ; ') + 
          " )",
        "Params": Array.from({length: 50}, (_, i) => [`param${i}`, `Type${i}`, "->", `Parameter ${i}`])
      };
      
      const startTime = performance.now();
      checker.checkCommand("LARGE_PARAMS", largeCommand);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple variants efficiently', () => {
      const multiVariantCommand = {
        "Syntax": Array.from({length: 10}, (_, i) => 
          `**MULTI_VARIANT** ( *param${i}* : Text${i > 0 ? ` ; *extra${i}* : Integer` : ''} )`
        ).join('<br/>'),
        "Params": [
          ["param0", "Text", "->", "Base parameter"],
          ["extra5", "Integer", "->", "Extra parameter"]
        ]
      };
      
      const startTime = performance.now();
      checker.checkCommand("MULTI_VARIANT", multiVariantCommand);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(20);
    });

    it('should handle type validation efficiently', () => {
      const typeCommand = {
        "Syntax": "**TYPE_TEST** ( *param* : Text/Blob/Object/Number/Integer/Boolean )",
        "Params": [
          ["param", "Text/Blob/Object/Number/Integer/Boolean", "->", "Multi-type parameter"]
        ]
      };
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        checker.checkCommand("TYPE_TEST", typeCommand);
      }
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
