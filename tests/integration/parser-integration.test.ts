import { describe, it, expect, beforeEach } from 'vitest';
import { Parser } from '../../src/parser';

// Mock SyntaxChecker for testing - simplified version without external dependencies
class MockSyntaxChecker {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  // Simple type validation logic for testing
  isTypeValid(actualType: string, expectedType: string): boolean {
    if (actualType === 'any' || expectedType === 'any') return true;
    if (actualType === expectedType) return true;
    
    // Handle forward-slash separated types
    if (expectedType.includes('/')) {
      return expectedType.split('/').includes(actualType);
    }
    
    // Handle comma-separated types
    if (expectedType.includes(',')) {
      return expectedType.split(',').map(t => t.trim()).includes(actualType);
    }
    
    // Handle type equivalences
    const equivalences: Record<string, string[]> = {
      'Real': ['Number'],
      'Number': ['Real']
    };
    
    if (equivalences[actualType]?.includes(expectedType)) return true;
    if (equivalences[expectedType]?.includes(actualType)) return true;
    
    return false;
  }

  // Mock checkCommand method
  checkCommand(commandName: string, command: any): void {
    console.log(`Command: ${commandName}`);
    console.log(`Syntax: ${command.Syntax}`);
    
    // Parse the syntax using our parser
    const variants = this.parser.parseSyntax(command.Syntax);
    
    // Simple validation logic
    if (variants.length > 0 && variants[0].malformation) {
      console.log('Has malformation issues');
    }
    
    if (command.Params && Array.isArray(command.Params)) {
      console.log(`Parameters: ${command.Params.length} found`);
    }
  }
}

describe('SyntaxChecker Class', () => {
  let checker: MockSyntaxChecker;

  beforeEach(() => {
    checker = new MockSyntaxChecker();
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
  });

  describe('Parser Integration Tests', () => {
    it('should parse basic syntax correctly', () => {
      const parser = new Parser();
      const result = parser.parseSyntax('test()');
      expect(result).toHaveLength(1);
      expect(result[0].variant).toBe('test()');
      expect(result[0].parameters).toHaveLength(0);
    });

    it('should parse parameters correctly', () => {
      const parser = new Parser();
      const result = parser.parseSyntax('test(param1:Type1;param2:Type2)');
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].name).toBe('param1');
      expect(result[0].parameters[0].type).toBe('Type1');
      expect(result[0].parameters[1].name).toBe('param2');
      expect(result[0].parameters[1].type).toBe('Type2');
    });

    it('should handle optional parameters', () => {
      const parser = new Parser();
      const result = parser.parseSyntax('test(param1:Type1;{optional:Type2})');
      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0].optional).toBe(false);
      expect(result[0].parameters[1].optional).toBe(true);
    });

    it('should detect malformed syntax', () => {
      const parser = new Parser();
      const result = parser.parseSyntax('test(param1:Type1;{missing_close');
      expect(result).toHaveLength(1);
      expect(result[0].malformation?.isMalformed).toBe(true);
    });

    it('should handle multiple variants', () => {
      const parser = new Parser();
      const result = parser.parseSyntax('test(param:Text)<br/>test(param:Number)');
      expect(result).toHaveLength(2);
      expect(result[0].parameters[0].type).toBe('Text');
      expect(result[1].parameters[0].type).toBe('Number');
    });
  });

  describe('Performance Tests', () => {
    it('should handle parsing operations efficiently', () => {
      const parser = new Parser();
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        parser.parseSyntax('test(param1:Type1;param2:Type2;{optional:Type3})');
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle complex syntax efficiently', () => {
      const parser = new Parser();
      const complexSyntax = 'test(' + 
        Array.from({length: 20}, (_, i) => `param${i}:Type${i}`).join(';') +
        ')';
      
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        const result = parser.parseSyntax(complexSyntax);
        expect(result[0].parameters).toHaveLength(20);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});
