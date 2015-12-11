declare namespace ts {
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
	export function getTextOfNode(node: Node, includeTrivia?: boolean): string;
	export function normalizeSlashes(path: string): string;
	export function writeCommentRange(currentSourceFile: SourceFile, writer: EmitTextWriter, comment: CommentRange, newLine: string): void;
}
