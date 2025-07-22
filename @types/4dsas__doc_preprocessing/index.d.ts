declare module '@4dsas/doc_preprocessing/lib/preprocessor.js' {
    import { Settings } from '@4dsas/doc_preprocessing/lib/settings.js';
    
    export class Preprocessing {
        constructor(settings: Settings);
        collect(): Promise<void>;
        getSyntaxObject(): any;
    }
}

declare module '@4dsas/doc_preprocessing/lib/settings.js' {
    export class Settings {
        constructor();
        get(key: string): any;
        set(key: string, value: any): void;
    }
    
    export const SETTINGS_KEY: {
        readonly PREPROCESSING: string;
        readonly PATH: string;
        readonly CONFIG: string;
        readonly EXCLUDE_LIST: string;
        readonly VERBOSE: string;
    };
}
