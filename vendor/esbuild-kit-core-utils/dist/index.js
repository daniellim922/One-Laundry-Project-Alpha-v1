"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const esbuild = require("esbuild");
const { pathToFileURL } = require("url");
const sourceMapSupport = require("source-map-support");

const nodeVersion = process.versions.node.split(".").map(Number);

function compareNodeVersion(version) {
    return (
        nodeVersion[0] - version[0] ||
        nodeVersion[1] - version[1] ||
        nodeVersion[2] - version[2]
    );
}

function installSourceMapSupport(port) {
    const maps = new Map();

    if (
        "setSourceMapsEnabled" in process &&
        typeof Error.prepareStackTrace !== "function"
    ) {
        process.setSourceMapsEnabled(true);

        return ({ code, map }) =>
            `${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
                JSON.stringify(map),
                "utf8",
            ).toString("base64")}`;
    }

    sourceMapSupport.install({
        environment: "node",
        retrieveSourceMap(filePath) {
            const map = maps.get(filePath);
            return map ? { url: filePath, map } : null;
        },
    });

    if (port?.addListener) {
        port.addListener("message", ({ filePath, map }) => {
            maps.set(filePath, map);
        });
    }

    return ({ code, map }, filePath, targetPort) => {
        if (filePath) {
            if (targetPort?.postMessage) {
                targetPort.postMessage({ filePath, map });
            } else {
                maps.set(filePath, map);
            }
        }

        return code;
    };
}

function resolveTsPath(path) {
    const queryIndex = path.indexOf("?");
    const basePath = queryIndex === -1 ? path : path.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : path.slice(queryIndex);

    if (basePath.endsWith(".js")) {
        return `${basePath.slice(0, -3)}.ts${query}`;
    }

    if (basePath.endsWith(".cjs")) {
        return `${basePath.slice(0, -4)}.cts${query}`;
    }

    if (basePath.endsWith(".mjs")) {
        return `${basePath.slice(0, -4)}.mts${query}`;
    }

    return undefined;
}

function buildOptions(filePath, options = {}) {
    const define = {};

    if (!filePath.endsWith(".cjs") && !filePath.endsWith(".cts")) {
        define["import.meta.url"] = JSON.stringify(pathToFileURL(filePath).href);
    }

    return {
        target: `node${process.versions.node}`,
        loader: "default",
        sourcemap: true,
        minifyWhitespace: true,
        keepNames: true,
        sourcefile: filePath,
        define,
        ...options,
    };
}

async function transform(code, filePath, options) {
    return await esbuild.transform(code, {
        format: "esm",
        ...buildOptions(filePath, options),
    });
}

function transformSync(code, filePath, options) {
    return esbuild.transformSync(code, {
        format: "cjs",
        banner: "(()=>{",
        footer: "})()",
        ...buildOptions(filePath, options),
    });
}

function transformDynamicImport() {
    return undefined;
}

exports.compareNodeVersion = compareNodeVersion;
exports.installSourceMapSupport = installSourceMapSupport;
exports.resolveTsPath = resolveTsPath;
exports.transform = transform;
exports.transformSync = transformSync;
exports.transformDynamicImport = transformDynamicImport;
