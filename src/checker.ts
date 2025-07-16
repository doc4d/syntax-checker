import { Preprocessing } from "@4dsas/doc_preprocessing/lib/preprocessor.js";
import { Settings, SETTINGS_KEY } from "@4dsas/doc_preprocessing/lib/settings.js";
import { Parser, ParsedVariant } from "./parser.js";

/**
 * Parameter data structure from documentation
 */
interface DocumentationParameter {
    0: string; // Parameter name
    1: string; // Parameter type
    2: string; // Parameter direction (-> or <-> etc.)
    3: string; // Parameter description
    [key: number]: string;
}

/**
 * Command object structure from documentation
 */
interface CommandObject {
    Syntax?: string;
    Params?: DocumentationParameter[];
    [key: string]: any;
}

/**
 * Type mismatch information
 */
interface TypeMismatch {
    name: string;
    syntaxType: string;
    paramsType: string;
}

/**
 * Validation result for variant parameters
 */
interface ValidationResult {
    extraParams: string[];
    typeMismatches: TypeMismatch[];
    returnTypeMismatches: TypeMismatch[];
}

/**
 * SyntaxChecker class for validating 4D documentation syntax
 * Handles validation of syntax definitions against actual parameters
 */
export class SyntaxChecker {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
    }

    /**
     * Get syntax data from documentation folder
     * @param inFolder - Path to documentation folder
     * @returns Syntax object
     */
    async getSyntax(inFolder: string): Promise<any> {
        const info = new Settings()
        info.set(SETTINGS_KEY.PATH, inFolder + "/")
        info.set(SETTINGS_KEY.CONFIG, "preprocessing.conf")
        info.set(SETTINGS_KEY.EXCLUDE_LIST, ["ViewPro"])
        info.set(SETTINGS_KEY.VERBOSE, false);
        let processor = new Preprocessing(info);
        await processor.collect();
        const syntax = processor.getSyntaxObject();
        return syntax;
    }

    /**
     * Get ViewPro syntax data from documentation folder
     * @param inFolder - Path to documentation folder
     * @returns ViewPro syntax object
     */
    async getSyntaxViewPro(inFolder: string): Promise<any> {
        const info = new Settings()
        info.set(SETTINGS_KEY.PATH, inFolder + "/ViewPro/")
        info.set(SETTINGS_KEY.CONFIG, "preprocessing.conf")
        info.set(SETTINGS_KEY.EXCLUDE_LIST, [])
        info.set(SETTINGS_KEY.VERBOSE, false);
        let processor = new Preprocessing(info);
        await processor.collect();
        const syntax = processor.getSyntaxObject();
        return syntax;
    }

    /**
     * Extract actual parameter names from parameter array
     * @param params - Parameter array from documentation
     * @returns Array of parameter names
     */
    extractActualParamNames(params: DocumentationParameter[]): string[] {
        if (!params || params.length === 0) return [];
        
        return params
            .filter(param => {
                const direction = param[2];
                const name = param[0];
                return (direction === '&#8594;' || direction === '->' || 
                        direction === '&#8596;' || direction === '<->' || 
                        direction === '&#8592;' || direction === '<-') && 
                       name !== 'Result' && 
                       name !== 'Function result';
            })
            .map(param => param[0].toLowerCase());
    }

    /**
     * Validate variant parameters against actual parameters
     * @param variant - Parsed variant object
     * @param params - Actual parameter array
     * @param actualParamNames - Array of actual parameter names
     * @returns Validation result with extraParams and typeMismatches
     */
    validateVariantParameters(variant: ParsedVariant, params: DocumentationParameter[], actualParamNames: string[]): ValidationResult {
        const parsedParamNames = variant.parameters
            .filter(p => !p.spread) // Don't validate spread parameters
            .map(p => p.name.toLowerCase());
        
        // Find extra parameters (parsed but not in actual params)
        const extraParams = parsedParamNames.filter(parsed => 
            !actualParamNames.includes(parsed) && 
            parsed !== '*'
        );
        
        // Check for type mismatches
        const typeMismatches = this.checkTypeMismatches(variant, params);
        
        // Check for return type mismatches
        const returnTypeMismatches = this.checkReturnTypeMismatches(variant, params);
        
        return { extraParams, typeMismatches, returnTypeMismatches };
    }

    /**
     * Check for type mismatches between parsed and actual parameters
     * @param variant - Parsed variant object
     * @param params - Actual parameter array
     * @returns Array of type mismatches
     */
    checkTypeMismatches(variant: ParsedVariant, params: DocumentationParameter[]): TypeMismatch[] {
        const typeMismatches: TypeMismatch[] = [];
        
        variant.parameters.forEach(parsedParam => {
            if (parsedParam.name !== '*' && !parsedParam.spread) { // Skip spread parameters
                const actualParam = params.find(p => 
                    p && p[0] && p[0].toLowerCase() === parsedParam.name.toLowerCase() &&
                    (p[2] === '&#8594;' || p[2] === '->' || p[2] === '&#8596;' || p[2] === '<->')
                );
                
                if (actualParam && parsedParam.type !== 'unknown') {
                    const actualType = actualParam[1];
                    const parsedType = parsedParam.type;
                    
                    if (!this.isTypeValid(parsedType, actualType)) {
                        typeMismatches.push({
                            name: parsedParam.name,
                            syntaxType: parsedType,
                            paramsType: actualType
                        });
                    }
                }
            }
        });
        
        return typeMismatches;
    }

    /**
     * Check for return type mismatches between parsed and actual parameters
     * @param variant - Parsed variant object
     * @param params - Actual parameter array
     * @returns Array of return type mismatches
     */
    checkReturnTypeMismatches(variant: ParsedVariant, params: DocumentationParameter[]): TypeMismatch[] {
        const returnTypeMismatches: TypeMismatch[] = [];
        
        // Check if the parsed variant has return type information
        if (!variant.returnType) {
            return returnTypeMismatches;
        }
        
        // Find the actual return type parameter (Result, Function result, or by name)
        const actualReturnParam = params.find(p => {
            if (!p || !p[0]) return false;
            
            const paramName = p[0].toLowerCase();
            const direction = p[2];
            
            // Check if it's an output parameter
            if (direction !== '&#8592;' && direction !== '<-') {
                return false;
            }
            
            // Check for standard return parameter names
            if (paramName === 'result' || paramName === 'function result') {
                return true;
            }
            
            // Check if it matches the return name from syntax (if specified)
            if (variant.returnType!.name && paramName === variant.returnType!.name.toLowerCase()) {
                return true;
            }
            
            return false;
        });
        
        // If we have a return type in syntax but no matching return parameter
        if (variant.returnType!.type && !actualReturnParam) {
            returnTypeMismatches.push({
                name: variant.returnType!.name || 'Function result',
                syntaxType: variant.returnType!.type,
                paramsType: 'missing'
            });
        }
        
        // If we have both syntax and actual return types, validate them
        if (variant.returnType!.type && actualReturnParam) {
            const actualType = actualReturnParam[1];
            const syntaxType = variant.returnType!.type;
            
            if (!this.isTypeValid(syntaxType, actualType)) {
                returnTypeMismatches.push({
                    name: variant.returnType!.name || 'Function result',
                    syntaxType: syntaxType,
                    paramsType: actualType
                });
            }
        }
        
        return returnTypeMismatches;
    }

    /**
     * Check if parsed type is valid against actual type
     * @param parsedType - Type from parsed syntax
     * @param actualType - Type from actual parameters
     * @returns True if type is valid
     */
    isTypeValid(parsedType: string, actualType: string): boolean {
        // Check if the actual type is valid according to the parsed type specification
        // Handle cases like "Text/Blob/Object" or "Text, Number, Array" containing "Text"
        const actualTypeLower = actualType.toLowerCase();
        const parsedTypeLower = parsedType.toLowerCase();
        
        // If parsed type is 'any', accept any actual type
        if (parsedTypeLower === 'any') {
            return true;
        }
        
        // If they're exactly the same, it's valid
        if (actualTypeLower === parsedTypeLower) {
            return true;
        }
        
        // Check for type equivalences
        const typeEquivalences: { [key: string]: string } = {
            'real': 'number',
            'number': 'real'
        };
        
        if (typeEquivalences[actualTypeLower] === parsedTypeLower) {
            return true;
        }
        
        // Split parsed type by commas or forward slashes and check if actual type is in the list
        const parsedTypeList = parsedTypeLower.split(/[,\/]/).map(t => t.trim());
        
        // Check if actual type is in the parsed type list
        if (parsedTypeList.includes(actualTypeLower)) {
            return true;
        }
        
        // Check type equivalences within the list
        for (const parsedTypeItem of parsedTypeList) {
            if (typeEquivalences[actualTypeLower] === parsedTypeItem) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if variant has errors
     * @param variant - Parsed variant object
     * @param params - Actual parameter array
     * @param actualParamNames - Array of actual parameter names
     * @returns True if variant has errors
     */
    hasVariantErrors(variant: ParsedVariant, params: DocumentationParameter[], actualParamNames: string[]): boolean {
        const { extraParams, typeMismatches, returnTypeMismatches } = this.validateVariantParameters(variant, params, actualParamNames);
        return extraParams.length > 0 || typeMismatches.length > 0 || returnTypeMismatches.length > 0;
    }

    /**
     * Output variant analysis to console
     * @param variant - Parsed variant object
     * @param index - Variant index
     * @param params - Actual parameter array
     * @param actualParamNames - Array of actual parameter names
     */
    outputVariantAnalysis(variant: ParsedVariant, index: number, params: DocumentationParameter[], actualParamNames: string[]): void {
        console.log(`\nVariant ${index + 1} analysis:`);
        const parsedParamNames = variant.parameters.map(p => p.name.toLowerCase());
        console.log(`Parsed parameter names:`, parsedParamNames);
        
        const { extraParams, typeMismatches, returnTypeMismatches } = this.validateVariantParameters(variant, params, actualParamNames);
        
        if (extraParams.length > 0) {
            console.log(`⚠️  Extra/Invalid parameters: ${extraParams.join(', ')}`);
        }
        
        if (typeMismatches.length > 0) {
            console.log(`⚠️  Type mismatches:`);
            typeMismatches.forEach(mismatch => {
                console.log(`   - ${mismatch.name}: syntax declares '${mismatch.syntaxType}' but params declare '${mismatch.paramsType}'`);
            });
        }
        
        if (returnTypeMismatches.length > 0) {
            console.log(`⚠️  Return type mismatches:`);
            returnTypeMismatches.forEach(mismatch => {
                console.log(`   - ${mismatch.name}: syntax declares '${mismatch.syntaxType}' but params declare '${mismatch.paramsType}'`);
            });
        }
        
        if (extraParams.length === 0 && typeMismatches.length === 0 && returnTypeMismatches.length === 0) {
            console.log(`✅ All parsed parameters are valid!`);
        }
    }

    /**
     * Check a single command syntax
     * @param name - Command name
     * @param command - Command object with Syntax and Params
     */
    checkCommand(name: string, command: CommandObject): void {
        const syntax = command["Syntax"];
        const params = command["Params"];
        
        if (!syntax) return;
        
        const parsedParams = this.parser.parseSyntax(syntax);
        
        // Check if there are any errors/warnings
        let hasErrors = false;
        
        if (params && params.length > 0) {
            const actualParamNames = this.extractActualParamNames(params);
            
            // Check each parsed variant for errors
            parsedParams.forEach((variant) => {
                if (this.hasVariantErrors(variant, params, actualParamNames)) {
                    hasErrors = true;
                }
            });
        }
        
        // Only show full output if there are errors
        if (hasErrors) {
            console.log(`Command: ${name}`);
            console.log(`Syntax: ${syntax}`);
            console.log(`Parsed variants:`, JSON.stringify(parsedParams, null, 2));
            
            if (params && params.length > 0) {
                console.log(`\nActual Params:`, JSON.stringify(params, null, 2));
                
                const actualParamNames = this.extractActualParamNames(params);
                console.log(`Expected parameter names:`, actualParamNames);
                
                // Check each parsed variant
                parsedParams.forEach((variant, index) => {
                    this.outputVariantAnalysis(variant, index, params, actualParamNames);
                });
            } else {
                console.log(`\nNo Params field found for this command`);
            }
            
            console.log('-'.repeat(60));
        } else {
            // Just show the syntax if no errors
            console.log(`Command: ${name} - Syntax: ${syntax}`);
        }
    }

    /**
     * Check all items in a syntax type
     * @param items - Items object
     * @param typeName - Type name for display
     */
    checkItems(items: { [key: string]: CommandObject }, typeName: string): void {
        Object.keys(items).forEach((key) => {
            const val = items[key];
            this.checkCommand(`${typeName}.${key}`, val);
        });
    }

    /**
     * Check all syntax types
     * @param syntax - Syntax object
     */
    checkAllSyntax(syntax: any): void {
        Object.keys(syntax).forEach((syntaxType) => {
            const items = syntax[syntaxType];
            console.log(`\n=== Checking ${syntaxType} (${Object.keys(items).length} items) ===`);
            this.checkItems(items, syntaxType);
        });
    }

    /**
     * Run the complete syntax check
     * @param docsPath - Path to documentation folder (default: "docs")
     */
    async run(docsPath: string = "docs"): Promise<void> {
        await this.checkAllSyntax(await this.getSyntaxViewPro(docsPath));
        await this.checkAllSyntax(await this.getSyntax(docsPath));
    }
}
