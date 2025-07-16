// Type declarations for external modules
declare module "@4dsas/doc_preprocessing/lib/preprocessor.js" {
    export class Preprocessing {
        constructor(settings: any);
        collect(): Promise<void>;
        getSyntaxObject(): any;
    }
}

declare module "@4dsas/doc_preprocessing/lib/settings.js" {
    export class Settings {
        set(key: string, value: any): void;
    }
    export const SETTINGS_KEY: {
        PATH: string;
        CONFIG: string;
        EXCLUDE_LIST: string;
        VERBOSE: string;
    };
}
