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

declare var require: {
    resolve(id: string): string;
};

declare module "fs" {
	export function readFileSync(filename: string, options: { encoding: string }): string;
}

declare module "path" {
	export function basename(p: string, ext?: string): string;
	export function extname(p: string): string;
}
