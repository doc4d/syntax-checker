import { Parser } from "./src/parser.js";
import { SyntaxChecker } from "./src/checker.js";

// Export classes
export { Parser, SyntaxChecker };

// Legacy compatibility functions
export function parseSyntax(syntax: string) {
    const parser = new Parser();
    return parser.parseSyntax(syntax);
}

export function parseParameters(paramString: string) {
    const parser = new Parser();
    return parser.parseParameters(paramString);
}

// Default export
export default {
    Parser,
    SyntaxChecker,
    parseSyntax,
    parseParameters
};
