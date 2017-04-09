/**
 * libjass
 *
 * https://github.com/Arnavion/libjass
 *
 * Copyright 2013 Arnav Singh
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ts = require("typescript");

export class HasParent {
	public parent: HasParent = null;

	constructor(public name: string) { }

	get fullName(): string {
		if (this.parent === null) {
			return this.name;
		}

		const parent = this.parent;
		if (parent instanceof Namespace) {
			return parent.getMemberFullName(this);
		}

		return `${ this.parent.fullName }.${ this.name }`;
	}
}

export class Module extends HasParent {
	public parent: Module = null;

	public members: { [name: string]: ModuleMember } = Object.create(null);

	constructor(public fileName: string) {
		super(fileName);
	}
}

export type ModuleMember = Class | Interface | Function | Property | Enum | Reference;
export type ModuleMemberWithoutReference = Class | Interface | Function | Property | Enum;

export class Reference {
	constructor(public moduleName: string, public name: string, public isPrivate: boolean) { }
}

export class Namespace extends HasParent {
	public parent: Namespace = null;

	public members: { [name: string]: NamespaceMember } = Object.create(null);

	constructor(name: string) {
		super(name);
	}

	getMemberFullName(member: HasParent) {
		return `${ this.fullName }.${ member.name }`;
	}
}

export type NamespaceMember = Class | Interface | Function | Property | Enum;

export class Class extends HasParent {
	public parent: Module | Namespace = null;

	public unresolvedBaseType: UnresolvedType | TypeReference | IntrinsicTypeReference;
	public baseType: TypeReference | IntrinsicTypeReference = null;

	public unresolvedInterfaces: (UnresolvedType | TypeReference | IntrinsicTypeReference)[];
	public interfaces: (TypeReference | IntrinsicTypeReference)[] = [];

	public members: { [name: string]: InterfaceMember } = Object.create(null);

	constructor(name: string, public astNode: ts.Node, public description: string, public generics: string[], public parameters: Parameter[], baseType: UnresolvedType | TypeReference | IntrinsicTypeReference, interfaces: (UnresolvedType | TypeReference | IntrinsicTypeReference)[], public isAbstract: boolean, public isPrivate: boolean) {
		super(name);

		this.unresolvedBaseType = baseType;
		this.unresolvedInterfaces = interfaces;
	}
}

export type InterfaceMember = Property | Function;

export class Interface extends HasParent {
	public parent: Module | Namespace = null;

	public unresolvedBaseTypes: (UnresolvedType | TypeReference | IntrinsicTypeReference)[];
	public baseTypes: (TypeReference | IntrinsicTypeReference)[] = [];

	public members: { [name: string]: InterfaceMember } = Object.create(null);

	constructor(name: string, public astNode: ts.Node, public description: string, public generics: string[], baseTypes: (UnresolvedType | TypeReference | IntrinsicTypeReference)[], public isPrivate: boolean) {
		super(name);

		this.unresolvedBaseTypes = baseTypes;
	}
}

export class Function extends HasParent {
	public parent: Module | Namespace | Class | Interface = null;

	constructor(name: string, public astNode: ts.Node, public description: string, public generics: string[], public parameters: Parameter[], public returnType: ReturnType, public isAbstract: boolean, public isPrivate: boolean, public isProtected: boolean, public isStatic: boolean) {
		super(name);
	}
}

export class Property extends HasParent {
	public parent: Module | Namespace | Class | Interface = null;

	public getter: Getter = null;
	public setter: Setter = null;

	constructor(name: string) {
		super(name);
	}
}

export class Getter {
	constructor(public astNode: ts.Node, public description: string, public type: string, public isPrivate: boolean) { }
}

export class Setter {
	constructor(public astNode: ts.Node, public description: string, public type: string, public isPrivate: boolean) { }
}

export class Parameter {
	public subParameters: Parameter[] = [];

	constructor(public name: string, public description: string, public type: string) { }
}

export class ReturnType {
	constructor(public description: string, public type: string) { }
}

export class Enum extends HasParent {
	public parent: Module | Namespace = null;

	public members: EnumMember[] = [];

	constructor(name: string, public astNode: ts.Node, public description: string, public isPrivate: boolean) {
		super(name);
	}
}

export class EnumMember extends HasParent {
	public parent: Enum = null;

	constructor(name: string, public description: string, public value: number) {
		super(name);
	}
}

export class TypeReference {
	constructor(public type: NamespaceMember, public generics: (TypeReference | IntrinsicTypeReference)[]) { }

	get name(): string {
		return this.type.name;
	}

	get fullName(): string {
		return this.type.fullName;
	}
}

export class IntrinsicTypeReference {
	public fullName: string;

	constructor(public name: string) {
		this.fullName = name;
	}
}

export class UnresolvedType {
	constructor(public symbol: ts.Symbol, public generics: (UnresolvedType | IntrinsicTypeReference)[]) { }
}

export type HasStringGenerics = Class | Interface | Function;

export function hasStringGenerics(item: NamespaceMember): item is HasStringGenerics {
	return (item as HasGenerics).generics !== undefined;
}

export type HasGenerics = HasStringGenerics | TypeReference;

export function hasGenerics(item: ModuleMember | EnumMember | TypeReference): item is HasGenerics {
	return (item as HasGenerics).generics !== undefined;
}

export type CanBePrivate = Class | Interface | Function | Getter | Setter | Enum | Reference;
export type CanBeProtected = Function;
export type CanBeStatic = Function;
