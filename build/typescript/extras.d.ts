declare namespace ts {
	export interface EmitTextWriter { }

	export interface IntrinsicType extends Type {
		intrinsicName: string;
	}

	export interface SourceFile {
		lineMap: number[];
	}

	export function forEachValue<T, U>(map: Map<T>, callback: (value: T) => U): U;
	export function getClassExtendsHeritageClauseElement(node: ClassLikeDeclaration): ExpressionWithTypeArguments;
	export function getClassImplementsHeritageClauseElements(node: ClassDeclaration): NodeArray<ExpressionWithTypeArguments>;
	export function getInterfaceBaseTypeNodes(node: InterfaceDeclaration): NodeArray<ExpressionWithTypeArguments>;
	export function getLeadingCommentRangesOfNodeFromText(node: Node, text: string): CommentRange[];
	export function getLineStarts(sourceFile: SourceFile): number[];
	export function getSourceFileOfNode(node: Node): SourceFile;
	export function getTextOfNode(node: Node, includeTrivia?: boolean): string;
	export function normalizeSlashes(path: string): string;
	export function writeCommentRange(text: string, lineMap: number[], writer: EmitTextWriter, comment: CommentRange, newLine: string): void;
}
