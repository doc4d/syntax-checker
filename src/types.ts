// Shared types for the syntax parser system

/**
 * Warning levels for malformation issues
 */
export enum WarningLevel {
    LEVEL_1 = 1, // High priority warnings (structural issues)
    LEVEL_2 = 2  // Lower priority warnings (type issues)
}

/**
 * Malformation issue with warning level
 */
export interface MalformationIssue {
    message: string;
    level: WarningLevel;
}

/**
 * Malformation information for parsed syntax
 */
export interface MalformationInfo {
    isMalformed: boolean;
    issues: MalformationIssue[];
}

export interface ParsedParameter {
    name: string;
    type: string;
    optional: boolean;
    spread: boolean;
}

/**
 * Return type information for parsed syntax variants
 */
export interface ParsedReturnType {
    name?: string;  // Return parameter name (from -> returnName)
    type?: string;  // Return type (from : Type)
}

/**
 * Variant interface for parsed syntax variants
 */
export interface ParsedVariant {
    variant: string;
    parameters: ParsedParameter[];
    returnType?: ParsedReturnType;
    malformation?: MalformationInfo;
}
