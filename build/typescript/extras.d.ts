declare namespace ts {
	interface EmitTextWriter { }

	interface IntrinsicType extends Type {
		intrinsicName: string;
	}

	interface SourceFile {
		lineMap: number[];
	}

	function forEachProperty<T, U>(map: Map<T>, callback: (value: T, key: string) => U): U;
	function getClassExtendsHeritageClauseElement(node: ClassLikeDeclaration | InterfaceDeclaration): ExpressionWithTypeArguments;
	function getClassImplementsHeritageClauseElements(node: ClassLikeDeclaration): ExpressionWithTypeArguments[];
	function getInterfaceBaseTypeNodes(node: InterfaceDeclaration): ExpressionWithTypeArguments[];
	function getLeadingCommentRangesOfNodeFromText(node: Node, text: string): CommentRange[];
	function getLineStarts(sourceFile: SourceFile): number[];
	function getSourceFileOfNode(node: Node): SourceFile;
	function getTextOfNode(node: Node, includeTrivia?: boolean): string;
	function normalizeSlashes(path: string): string;
	function writeCommentRange(text: string, lineMap: number[], writer: EmitTextWriter, comment: CommentRange, newLine: string): void;
	function hasModifier(node: Node, flags: ModifierFlags): boolean;
}
