// Type definitions for Node.js v0.12.0
// Project: http://nodejs.org/
// Definitions by: Microsoft TypeScript <http://typescriptlang.org>, DefinitelyTyped <https://github.com/borisyankov/DefinitelyTyped>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface Buffer { }
declare var Buffer: {
	new (str: string): Buffer;
	prototype: Buffer;
	concat(list: Buffer[]): Buffer;
};

declare module "fs" {
	export function lstatSync(path: string): Stats;
	export function readdirSync(path: string): string[];
	export function readFileSync(filename: string, options: { encoding: string }): string;
	export function unwatchFile(filename: string, listener?: (curr: Stats, prev: Stats) => void): void;
	export function watchFile(filename: string, options: { interval?: number }, listener: (curr: Stats, prev: Stats) => void): void;

	interface Stats {
		isDirectory(): boolean;
		isFile(): boolean;
		mtime: Date;
	}
}

declare module "path" {
	export function basename(p: string, ext?: string): string;
	export function dirname(p: string): string;
	export function extname(p: string): string;
	export function join(...paths: string[]): string;
	export function relative(from: string, to: string): string;
	export function resolve(...pathSegments: string[]): string;
}

declare module "stream" {
	export class Transform<T> {
		constructor(opts?: { objectMode?: boolean; });

		_transform(chunk: T, encoding: string, callback: (error?: Error) => void): void;
		_flush(callback: (error?: Error) => void): void;
		push(chunk: T, encoding?: string): boolean;
	}
}


// Type definitions for vinyl 0.4.3
// Project: https://github.com/wearefractal/vinyl
// Definitions by: vvakame <https://github.com/vvakame/>, jedmao <https://github.com/jedmao>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "vinyl" {
	class File {
		constructor(options?: { path: string; contents: Buffer; base?: string; });

		path: string;
		contents: Buffer;
	}

	export = File;
}
