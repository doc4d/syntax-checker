import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyntaxChecker } from '../../out/index.js';

describe('SyntaxChecker Command Validation', () => {
  let checker: SyntaxChecker;
  let consoleSpy: any;

  beforeEach(() => {
    checker = new SyntaxChecker();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Type Mismatch Detection', () => {
    it('should NOT detect type mismatches for compatible types (bug fix validation)', () => {
      const command = {
        Syntax: "**WEBSOCKET SEND** ( *message* : Text )",
        Params: [
          ["message", "Text / Blob / Object", "->", "Message to send"]
        ] as any[]
      };

      checker.checkCommand("WEBSOCKET SEND", command);

      const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');
      // Should NOT show type mismatches because Text is compatible with "Text / Blob / Object"
      expect(output).not.toContain('Type mismatches');
    });

    it('should handle WebSocket.send() method variants correctly', () => {
      const command = {
        Syntax: "**.send** ( *message* : Text )<br/>**.send** ( *message* : Blob )<br/>**.send** ( *message* : Object )",
        Params: [
          ["message", "Text / Blob / Object", "->", "The message to send"]
        ] as any[]
      };

      checker.checkCommand("WebSocket.send", command);

      const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');
      // Should not show type mismatches due to the bug fix
      expect(output).not.toContain('Type mismatches');
    });

    it('should detect actual type mismatches', () => {
      const command = {
        Syntax: "**TEST COMMAND** ( *param1* : Text ; *param2* : Number )",
        Params: [
          ["param1", "Text", "->", "Should be Text"],
          ["param2", "Boolean", "->", "Should be Number but is Boolean"]
        ] as any[]
      };

      checker.checkCommand("TEST COMMAND", command);

      const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Type mismatches');
      expect(output).toContain('param2');
      expect(output).toContain('Number');
      expect(output).toContain('Boolean');
    });
  });

  describe('Parameter Direction Validation', () => {
    it('should correctly identify input parameters', () => {
      const params = [
        ["param1", "Text", "->", "Input parameter"],
        ["param2", "Number", "&#8594;", "Input parameter (HTML arrow)"],
        ["param3", "Boolean", "<->", "Input/Output parameter"],
        ["param4", "Object", "&#8596;", "Input/Output parameter (HTML arrow)"]
      ] as any[];

      const actualParamNames = checker.extractActualParamNames(params);
      expect(actualParamNames).toContain('param1');
      expect(actualParamNames).toContain('param2');
      expect(actualParamNames).toContain('param3');
      expect(actualParamNames).toContain('param4');
    });

    it('should correctly identify output parameters', () => {
      const params = [
        ["param1", "Text", "->", "Input parameter"],
        ["Result", "Number", "<-", "Output parameter"],
        ["error", "Boolean", "&#8592;", "Output parameter (HTML arrow)"]
      ] as any[];

      const actualParamNames = checker.extractActualParamNames(params);
      expect(actualParamNames).toContain('param1');
      expect(actualParamNames).not.toContain('result'); // Result should be excluded
      expect(actualParamNames).toContain('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle commands with no syntax', () => {
      const command = {
        Params: [
          ["param1", "Text", "->", "Parameter without syntax"]
        ] as any[]
      };

      expect(() => checker.checkCommand("NO SYNTAX", command)).not.toThrow();
    });

    it('should handle commands with no parameters', () => {
      const command = {
        Syntax: "**NO PARAMS** ( )"
      };

      expect(() => checker.checkCommand("NO PARAMS", command)).not.toThrow();
    });
  });
});
