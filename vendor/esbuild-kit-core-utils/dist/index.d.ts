import type { Message, TransformOptions, TransformResult } from "esbuild";

export declare function compareNodeVersion(version: number[]): number;

export declare function installSourceMapSupport(
    port?: MessagePort,
): (result: TransformResult, filePath?: string, port?: MessagePort) => string;

export declare function resolveTsPath(path: string): string | undefined;

export declare function transform(
    code: string,
    filePath: string,
    options?: TransformOptions,
): Promise<TransformResult & { warnings?: Message[] }>;

export declare function transformSync(
    code: string,
    filePath: string,
    options?: TransformOptions,
): TransformResult & { warnings?: Message[] };

export declare function transformDynamicImport(
    filePath: string,
    code: string,
): undefined;
