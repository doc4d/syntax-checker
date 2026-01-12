import { Preprocessing } from '@4dsas/doc_preprocessing/lib/preprocessor.js';
import { Settings, SETTINGS_KEY } from '@4dsas/doc_preprocessing/lib/settings.js';
import { Parser, ParsedVariant, WarningLevel } from './parser.js';
import { Direction } from './types.js';

// Re-export WarningLevel for convenience
export { WarningLevel } from './parser.js';


/**
 * Parameter data structure from documentation
 */
interface DocumentationParameter {
    name: string; // Parameter name
    type: string[]; // Parameter type
    direction?: Direction; // Parameter direction (-> or <-> etc.)
    description: string; // Parameter description
    [key: number]: string;
}


/**
 * Command object structure from documentation
 */
interface RawCommandObject {
    Syntax?: string;
    Params?: string[][];
}

/**
 * Command object structure from documentation
 */
interface CommandObject {
    Syntax?: string;
    Params?: DocumentationParameter[];
}


/**
 * Type mismatch information
 */
interface TypeMismatch {
    name: string;
    syntaxType: string;
    paramsType: string[];
}

/**
 * Parameter information with direction
 */
interface ParameterInfo {
    name: string;
    direction: Direction;
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
        const info = new Settings();
        info.set(SETTINGS_KEY.PATH, inFolder + '/');
        info.set(SETTINGS_KEY.CONFIG, 'preprocessing.conf');
        info.set(SETTINGS_KEY.EXCLUDE_LIST, ['ViewPro']);
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
        const info = new Settings();
        info.set(SETTINGS_KEY.PATH, inFolder + '/ViewPro/');
        info.set(SETTINGS_KEY.CONFIG, 'preprocessing.conf');
        info.set(SETTINGS_KEY.EXCLUDE_LIST, []);
        info.set(SETTINGS_KEY.VERBOSE, false);
        let processor = new Preprocessing(info);
        await processor.collect();
        const syntax = processor.getSyntaxObject();
        return syntax;
    }

    /**
     * Check if a parameter is a function result parameter
     * @param param - Parameter to check
     * @returns True if parameter is a function result (Result or Function result with Direction.Return)
     */
    private isFunctionResult(param: DocumentationParameter): boolean {
        const name = param.name.toLowerCase();
        const direction = param.direction;
        return direction === Direction.Return &&
            (name === 'result' || name === 'function result');
    }

    /**
     * Extract actual parameter names and directions from parameter array
     * @param params - Parameter array from documentation
     * @returns Array of parameter info with names and directions
     */
    extractActualParamNames(params: DocumentationParameter[]): ParameterInfo[] {
        if (!params || params.length === 0) return [];

        return params
            .filter(param => param.direction !== undefined) // Only include params with valid direction
            .map(param => ({
                name: param.name.toLowerCase(),
                direction: param.direction!
            }));
    }

    /**
     * Get input parameter names (excluding return parameters)
     * @param params - Parameter array from documentation
     * @returns Array of input parameter names
     */
    getInputParameterNames(params: DocumentationParameter[]): string[] {
        if (!params || params.length === 0) return [];

        return params
            .filter(param => {
                const direction = param.direction;
                // Only include parameters with valid direction
                // Exclude function result parameters (Result or Function result with Direction.Return)
                // But include other Direction.Return parameters as they are output parameters, not function results
                return (
                    direction !== undefined &&
                    !this.isFunctionResult(param)
                );
            })
            .map(param => param.name.toLowerCase());
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
            .filter(p => p.spread === -1) // Don't validate spread parameters
            .map(p => p.name.toLowerCase());

        const lowerCaseParameters = actualParamNames.map(p => p.toLocaleLowerCase());
        // Find extra parameters (parsed but not in actual params)
        const extraParams = parsedParamNames.filter(parsed =>
            !lowerCaseParameters.includes(parsed) &&
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
            if (parsedParam.name !== '*' && parsedParam.spread === -1) { // Skip spread parameters
                const actualParam = params.find(p => {
                    if (!p || !p.name) return false;

                    const paramName = p.name.toLowerCase();
                    const parsedName = parsedParam.name.toLowerCase();

                    // Match by name but exclude function result parameters
                    return paramName === parsedName && !this.isFunctionResult(p);
                });

                if (actualParam && parsedParam.type !== 'unknown') {
                    const actualTypes = actualParam.type;
                    const parsedType = parsedParam.type;

                    if (!this.isTypeValid(parsedType, actualTypes)) {
                        typeMismatches.push({
                            name: parsedParam.name,
                            syntaxType: parsedType,
                            paramsType: actualTypes
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

        // Find the actual return type parameter (Result, Function result, or by specific name)
        const actualReturnParam = params.find(p => {
            const direction = p.direction;
            const name = p.name.toLowerCase();

            // Check if it's the function result by name and direction
            if (this.isFunctionResult(p)) {
                return true;
            }

            // If variant has a specific return name, match by name and direction
            if (variant.returnType!.name && direction === Direction.Return &&
                name === variant.returnType!.name.toLowerCase()) {
                return true;
            }

            return false;
        });

        // If we have a return type in syntax but no matching return parameter
        if (variant.returnType!.type && !actualReturnParam) {
            returnTypeMismatches.push({
                name: variant.returnType!.name || 'Function result',
                syntaxType: variant.returnType!.type,
                paramsType: ['missing']
            });
        }

        // If we have both syntax and actual return types, validate them
        if (variant.returnType!.type && actualReturnParam) {
            const actualType = actualReturnParam.type;
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
    isTypeValid(parsedTypes: string, actualTypes: string[]): boolean {
        const set1 = new Set<string>();
        for (let parsedType of parsedTypes.split(',')) {
            set1.add(parsedType.toLocaleLowerCase().trim());
        }

        const set2 = new Set<string>();
        for (let actualType of actualTypes) {
            set2.add(actualType.toLocaleLowerCase().trim());
        }

        for (let item of set1) {
            if (!set2.has(item)) return false;
        }

        return true;
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
        console.log('Parsed parameter names:', parsedParamNames);

        // Check for syntax malformation at current warning level
        const filteredMalformationIssues = this.getFilteredMalformationIssues(variant);
        if (filteredMalformationIssues.length > 0) {
            console.log('⚠️  Syntax malformation detected:');
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
            console.log('⚠️  Type mismatches:');
            typeMismatches.forEach(mismatch => {
                console.log(`   - ${mismatch.name}: syntax declares '${mismatch.syntaxType}' but params declare '${mismatch.paramsType}'`);
            });
        }

        if (returnTypeMismatches.length > 0) {
            console.log('⚠️  Return type mismatches:');
            returnTypeMismatches.forEach(mismatch => {
                console.log(`   - ${mismatch.name}: syntax declares '${mismatch.syntaxType}' but params declare '${mismatch.paramsType}'`);
            });
        }

        const hasMalformation = filteredMalformationIssues.length > 0;
        if (extraParams.length === 0 && typeMismatches.length === 0 && returnTypeMismatches.length === 0 && !hasMalformation) {
            console.log('✅ All parsed parameters are valid!');
        }
    }

    /**
     * Check a single command syntax
     * @param name - Command name
     * @param command - Command object with Syntax and Params
     */
    checkCommand(name: string, command: CommandObject): void {
        const syntax = command['Syntax'];
        const params = command['Params'];

        if (!syntax) return;

        const parsedParams = this.parser.parseSyntax(syntax);

        // Check if there are any errors/warnings
        let hasErrors = false;
        const actualParamNames = params && params.length > 0 ? this.getInputParameterNames(params) : [];
        const allParamInfo = params && params.length > 0 ? this.extractActualParamNames(params) : [];

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
            console.log('Parsed variants:', JSON.stringify(parsedParams, null, 2));

            if (params && params.length > 0) {
                console.log('\nActual Params:', JSON.stringify(params, null, 2));

                console.log('Expected parameter names:', actualParamNames);
                console.log('All parameter info:', allParamInfo.map(p => `${p.name} (direction: ${p.direction})`));

                // Check each parsed variant
                parsedParams.forEach((variant, index) => {
                    this.outputVariantAnalysis(variant, index, params, actualParamNames);
                });
            } else {
                console.log('\nNo Params field found for this command');

                // Still check for malformations even without params
                parsedParams.forEach((variant, index) => {
                    const filteredMalformationIssues = this.getFilteredMalformationIssues(variant);
                    if (filteredMalformationIssues.length > 0) {
                        console.log(`\nVariant ${index + 1} analysis:`);
                        console.log('⚠️  Syntax malformation detected:');
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

    parseDirection(direction: string): Direction | undefined {
        switch (direction) {
            case '&#8594;':
            case '->': return Direction.In;
            case '&#8592;':
            case '<-': return Direction.Return;
            case '&#8596;':
            case '<->': return Direction.IO;
        }
        return undefined;
    }

    parseParams(array: string[][]): DocumentationParameter[] {
        let result = [];
        for (const param of array) {
            if (param.length >= 4) { // Accept 4 or more elements
                result.push(this.parseParam(param));
            }
        }
        return result;
    }

    parseParam(array: string[]): DocumentationParameter {
        return {
            name: array[0],
            type: array[1].split(',').map(t => t.trim()).filter(t => t),
            direction: this.parseDirection(array[2]),
            description: array[3]
        } as DocumentationParameter;
    }

    parseCommand(item: RawCommandObject): CommandObject {
        return {
            Syntax: item.Syntax,
            Params: item.Params ? this.parseParams(item.Params) : undefined
        } as CommandObject;
    }


    /**
     * Check all items in a syntax type
     * @param items - Items object
     * @param typeName - Type name for display
     */
    checkItems(items: { [key: string]: RawCommandObject }, typeName: string): void {
        Object.keys(items).forEach((key) => {
            const val = items[key];
            this.checkCommand(`${typeName}.${key}`, this.parseCommand(val));
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
    async run(docsPath: string = 'docs'): Promise<void> {
        this.checkAllSyntax(await this.getSyntaxViewPro(docsPath));
        this.checkAllSyntax(await this.getSyntax(docsPath));
    }
}
