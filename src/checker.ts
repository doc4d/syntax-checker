import { Preprocessing } from "@4dsas/doc_preprocessing/lib/preprocessor.js";
import { Settings, SETTINGS_KEY } from "@4dsas/doc_preprocessing/lib/settings.js";
import { Parser, ParsedVariant, WarningLevel } from "./parser.js";

// Re-export WarningLevel for convenience
export { WarningLevel } from "./parser.js";

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
    private warningLevel: WarningLevel;

    constructor(warningLevel: WarningLevel = WarningLevel.LEVEL_1) {
        this.parser = new Parser();
        this.warningLevel = warningLevel;
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
        // Check if the parsed type is valid according to the actual type specification
        const actualTypeLower = actualType.toLowerCase().trim();
        const parsedTypeLower = parsedType.toLowerCase().trim();
        
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
        
        if (typeEquivalences[parsedTypeLower] === actualTypeLower) {
            return true;
        }
        
        // Split actual type by commas, forward slashes, or "or" and check if parsed type is in the list
        const actualTypeList = actualTypeLower
            .split(/[,\/]|\s+or\s+/)
            .map(t => t.trim())
            .filter(t => t.length > 0);
        
        // Check if parsed type is in the actual type list
        if (actualTypeList.includes(parsedTypeLower)) {
            return true;
        }
        
        // Check type equivalences within the actual type list
        for (const actualTypeItem of actualTypeList) {
            if (typeEquivalences[parsedTypeLower] === actualTypeItem) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Filter malformation issues based on warning level
     * @param variant - Parsed variant object
     * @returns True if variant has malformation issues at or above the current warning level
     */
    private hasRelevantMalformation(variant: ParsedVariant): boolean {
        if (!variant.malformation?.isMalformed) {
            return false;
        }
        
        return variant.malformation.issues.some(issue => issue.level <= this.warningLevel);
    }

    /**
     * Get filtered malformation issues based on warning level
     * @param variant - Parsed variant object
     * @returns Array of malformation issues at or above the current warning level
     */
    private getFilteredMalformationIssues(variant: ParsedVariant) {
        if (!variant.malformation?.isMalformed) {
            return [];
        }
        
        return variant.malformation.issues.filter(issue => issue.level <= this.warningLevel);
    }

    /**
     * Check if variant has any issues (malformations, parameter errors, type mismatches)
     * @param variant - Parsed variant object
     * @param params - Actual parameter array (can be empty/undefined)
     * @param actualParamNames - Array of actual parameter names (can be empty)
     * @returns True if variant has any issues at current warning level
     */
    private hasVariantIssues(variant: ParsedVariant, params: DocumentationParameter[] = [], actualParamNames: string[] = []): boolean {
        // Always check for malformations first
        const hasMalformation = this.hasRelevantMalformation(variant);
        
        // Only check parameter errors if we have params to validate against
        if (params.length === 0) {
            return hasMalformation;
        }
        
        const { extraParams, typeMismatches, returnTypeMismatches } = this.validateVariantParameters(variant, params, actualParamNames);
        const hasParameterErrors = extraParams.length > 0 || typeMismatches.length > 0 || returnTypeMismatches.length > 0;
        
        return hasMalformation || hasParameterErrors;
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
        
        // Check for syntax malformation at current warning level
        const filteredMalformationIssues = this.getFilteredMalformationIssues(variant);
        if (filteredMalformationIssues.length > 0) {
            console.log(`⚠️  Syntax malformation detected:`);
            filteredMalformationIssues.forEach(issue => {
                const levelStr = issue.level === WarningLevel.LEVEL_1 ? 'L1' : 'L2';
                console.log(`   - [${levelStr}] ${issue.message}`);
            });
        }
        
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
        
        const hasMalformation = filteredMalformationIssues.length > 0;
        if (extraParams.length === 0 && typeMismatches.length === 0 && returnTypeMismatches.length === 0 && !hasMalformation) {
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
        const actualParamNames = params && params.length > 0 ? this.extractActualParamNames(params) : [];
        
        // Check each parsed variant for issues (malformations and parameter errors)
        parsedParams.forEach((variant) => {
            if (this.hasVariantIssues(variant, params, actualParamNames)) {
                hasErrors = true;
            }
        });
        
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
                
                // Still check for malformations even without params
                parsedParams.forEach((variant, index) => {
                    const filteredMalformationIssues = this.getFilteredMalformationIssues(variant);
                    if (filteredMalformationIssues.length > 0) {
                        console.log(`\nVariant ${index + 1} analysis:`);
                        console.log(`⚠️  Syntax malformation detected:`);
                        filteredMalformationIssues.forEach(issue => {
                            const levelStr = issue.level === WarningLevel.LEVEL_1 ? 'L1' : 'L2';
                            console.log(`   - [${levelStr}] ${issue.message}`);
                        });
                    }
                });
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
