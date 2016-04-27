// Type definitions for Node.js v0.12.0
// Project: http://nodejs.org/
// Definitions by: Microsoft TypeScript <http://typescriptlang.org>, DefinitelyTyped <https://github.com/borisyankov/DefinitelyTyped>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare var require: {
    resolve(id: string): string;
};

interface BufferConstructor {
	new (str: string): Buffer;
	prototype: Buffer;
	concat(list: Buffer[]): Buffer;
}

declare module "fs" {
	export function existsSync(filename: string): boolean;
	export function readFileSync(filename: string, options: { encoding: string }): string;
}

declare module "path" {
	export function basename(p: string, ext?: string): string;
	export function extname(p: string): string;
}
