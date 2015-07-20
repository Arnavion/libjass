declare module "typescript" {
	export interface EmitTextWriter { }

	export interface IntrinsicType extends Type {
		intrinsicName: string;
	}

	export function forEachValue<T, U>(map: Map<T>, callback: (value: T) => U): U;
	export function getClassExtendsHeritageClauseElement(node: ClassLikeDeclaration): ExpressionWithTypeArguments;
	export function getClassImplementsHeritageClauseElements(node: ClassDeclaration): NodeArray<ExpressionWithTypeArguments>;
	export function getInterfaceBaseTypeNodes(node: InterfaceDeclaration): NodeArray<ExpressionWithTypeArguments>;
	export function getLeadingCommentRangesOfNode(node: Node, sourceFileOfNode: SourceFile): CommentRange[];
	export function getLineStarts(sourceFile: SourceFile): number[];
	export function getSourceFileOfNode(node: Node): SourceFile;
	export function getTextOfNode(node: Node): string;
	export function normalizeSlashes(path: string): string;
	export function writeCommentRange(currentSourceFile: SourceFile, writer: EmitTextWriter, comment: CommentRange, newLine: string): void;
}

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

declare var require: {
    resolve(id: string): string;
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
