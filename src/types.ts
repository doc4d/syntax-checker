// Shared types for the syntax parser system

/**
 * Warning levels for malformation issues
 */
export enum WarningLevel {
    LEVEL_1 = 1, // High priority warnings (structural issues)
    LEVEL_2 = 2  // Lower priority warnings (type issues)
}

export enum Direction {
    In,
    IO,
    Return
}

/**
 * Warning codes for different types of issues
 */
export enum WarningCode {
    // Structural issues (Level 1)
    UNCLOSED_OPTIONAL_BLOCK = 'MAL001',
    EXTRA_CLOSING_BRACE = 'MAL002',
    EMPTY_PARAMETER_DOUBLE_SEMICOLON = 'MAL003',
    EMPTY_PARAMETER_AT_START = 'MAL004',
    UNEXPECTED_COLON_NO_PARAM = 'MAL005',
    DOUBLE_COLON = 'MAL006',
    UNEXPECTED_SEMICOLON_AFTER_COLON = 'MAL007',
    UNEXPECTED_CLOSING_BRACE_AFTER_COLON = 'MAL008',
    MISSING_CLOSING_PARENTHESIS = 'MAL011',
    NON_ECMA_PARAMETER_NAME = 'MAL012',
    INVALID_TYPE_FORMAT = 'MAL013',

    // Type issues (Level 2)
    PARAMETER_EMPTY_TYPE_AFTER_COLON = 'PAR001',
    PARAMETER_MISSING_TYPE = 'PAR002'
}

/**
 * Warning definitions with messages and levels
 */
export const WARNING_DEFINITIONS = {
    [WarningCode.UNCLOSED_OPTIONAL_BLOCK]: {
        level: WarningLevel.LEVEL_1,
        message: (braceCount: number) => `Unclosed optional block (missing ${braceCount} closing brace${braceCount > 1 ? 's' : ''})`
    },
    [WarningCode.EXTRA_CLOSING_BRACE]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Extra closing brace (unmatched optional block closure)'
    },
    [WarningCode.EMPTY_PARAMETER_DOUBLE_SEMICOLON]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Empty parameter found (double semicolon)'
    },
    [WarningCode.EMPTY_PARAMETER_AT_START]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Empty parameter found (semicolon at start)'
    },
    [WarningCode.UNEXPECTED_COLON_NO_PARAM]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Unexpected colon (missing parameter name)'
    },
    [WarningCode.DOUBLE_COLON]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Double colon found in parameter definition'
    },
    [WarningCode.UNEXPECTED_SEMICOLON_AFTER_COLON]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Unexpected semicolon after colon'
    },
    [WarningCode.UNEXPECTED_CLOSING_BRACE_AFTER_COLON]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Unexpected closing brace after colon'
    },
    [WarningCode.MISSING_CLOSING_PARENTHESIS]: {
        level: WarningLevel.LEVEL_1,
        message: () => 'Missing closing parenthesis'
    },
    [WarningCode.NON_ECMA_PARAMETER_NAME]: {
        level: WarningLevel.LEVEL_1,
        message: (paramName: string) => `Parameter name '${paramName}' is not ECMA-compliant (must be valid JavaScript identifier)`
    },
    [WarningCode.INVALID_TYPE_FORMAT]: {
        level: WarningLevel.LEVEL_1,
        message: (typeName: string) => `Type '${typeName}' has invalid format (must be letters only, or start with '4D.' or 'cs.' followed by valid identifier)`
    },
    [WarningCode.PARAMETER_EMPTY_TYPE_AFTER_COLON]: {
        level: WarningLevel.LEVEL_2,
        message: () => 'Parameter has empty type after colon'
    },
    [WarningCode.PARAMETER_MISSING_TYPE]: {
        level: WarningLevel.LEVEL_2,
        message: (paramName: string) => `Parameter '${paramName}' has no type (missing colon and type)`
    }
} as const;

/**
 * Malformation issue with warning level and unique identifier
 */
export interface MalformationIssue {
    id: string;
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
