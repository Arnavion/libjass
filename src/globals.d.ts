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

interface Array<T> {
	filter<S extends T>(callbackfn: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
}

interface WorkerGlobalScope {
	postMessage(message: any): void;
	addEventListener(type: string, listener: (message: any) => void, useCapture: boolean): void;
}

interface FontFace {
	family: string;
	load(): Promise<FontFace>;
}

interface FontFaceSet {
	add(fontFace: FontFace): FontFaceSet;
	forEach(callbackfn: (fontFace: FontFace, index: FontFace, set: FontFaceSet) => void, thisArg?: any): void;
}

interface Map<K, V> {
	size: number;
	get(key: K): V | undefined;
	has(key: K): boolean;
	set(key: K, value: V): this;
	delete(key: K): boolean;
	clear(): void;
	forEach(callbackfn: (value: V, index: K, map: this) => void, thisArg?: any): void;
}

interface Node {
	cloneNode(deep?: boolean): this;
}

interface Promise<T> extends Thenable<T> {
	then<U>(onFulfilled: (value: T) => Thenable<U>, onRejected?: (reason: any) => U | Thenable<U>): Promise<U>;
	/* tslint:disable-next-line:unified-signatures */
	then<U>(onFulfilled: (value: T) => U, onRejected?: (reason: any) => U | Thenable<U>): Promise<U>;
	catch(onRejected: (reason: any) => T | Thenable<T>): Promise<T>;
}

interface ReadableStream {
	getReader(): ReadableStreamReader;
}

interface ReadableStreamReader {
	read(): Promise<{ value: Uint8Array; done: boolean; }>;
}

interface Set<T> {
	size: number;
	add(value: T): this;
	clear(): void;
	has(value: T): boolean;
	forEach(callbackfn: (value: T, index: T, set: this) => void, thisArg?: any): void;
}

interface SVGFEComponentTransferElement {
	appendChild(newChild: SVGFEFuncAElement): SVGFEFuncAElement;
	appendChild(newChild: SVGFEFuncBElement): SVGFEFuncBElement;
	appendChild(newChild: SVGFEFuncGElement): SVGFEFuncGElement;
	appendChild(newChild: SVGFEFuncRElement): SVGFEFuncRElement;
}

interface SVGFEMergeElement {
	appendChild(newChild: SVGFEMergeNodeElement): SVGFEMergeNodeElement;
}

interface TextDecoder {
	decode(input: ArrayBuffer | ArrayBufferView, options: { stream: boolean }): string;
}

interface Thenable<T> {
	then: ThenableThen<T>;
}

type ThenableThen<T> = (this: Thenable<T>, resolve: ((resolution: T | Thenable<T>) => void) | undefined, reject: ((reason: any) => void) | undefined) => void;

/**
 * The interface implemented by a communication channel to the other side.
 */
interface WorkerCommunication {
	addEventListener(type: "message", listener: (ev: MessageEvent) => any, useCapture?: boolean): void;
	addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
	postMessage(message: any): void;
}

declare const exports: any;

declare const global: (WorkerGlobalScope) & {
	FontFace?: {
		new (family: string, source: string): FontFace;
	};

	Map?: {
		new <K, V>(iterable?: [K, V][]): Map<K, V>;
		/* tslint:disable-next-line:member-ordering */
		prototype: Map<any, any> | { forEach: undefined };
	};

	MutationObserver?: typeof MutationObserver;

	Promise?: {
		new <T>(init: (resolve: (value: T | Thenable<T>) => void, reject: (reason: any) => void) => void): Promise<T>;
		/* tslint:disable-next-line:member-ordering */
		prototype: Promise<any>;
		resolve<T>(value: T | Thenable<T>): Promise<T>;
		reject<T>(reason: any): Promise<T>;
		all<T>(values: (T | Thenable<T>)[]): Promise<T[]>;
		race<T>(values: (T | Thenable<T>)[]): Promise<T>;
	};

	ReadableStream?: {
		prototype: ReadableStream | { getReader: undefined; };
	};

	Set?: {
		new <T>(iterable?: T[]): Set<T>;
		/* tslint:disable-next-line:member-ordering */
		prototype: Set<any> | { forEach: undefined };
	};

	TextDecoder?: { new (encoding: string, options: { ignoreBOM: boolean }): TextDecoder };

	WebkitMutationObserver?: typeof MutationObserver;

	Worker?: typeof Worker,

	WorkerGlobalScope?: {
		prototype: WorkerGlobalScope;
		new (): WorkerGlobalScope;
	};

	document?: {
		currentScript?: HTMLScriptElement;
		fonts?: FontFaceSet;
	};

	fetch?(url: string): Promise<{ body: ReadableStream; ok?: boolean; status?: number; }>;

	process?: {
		nextTick?(callback: () => void): void;
	}
};
