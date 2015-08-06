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

interface Document {
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "defs"): SVGDefsElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feComponentTransfer"): SVGFEComponentTransferElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feComposite"): SVGFECompositeElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feConvolveMatrix"): SVGFEConvolveMatrixElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feFuncA"): SVGFEFuncAElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feFuncB"): SVGFEFuncBElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feFuncG"): SVGFEFuncGElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feFuncR"): SVGFEFuncRElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feGaussianBlur"): SVGFEGaussianBlurElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feMerge"): SVGFEMergeElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feMergeNode"): SVGFEMergeNodeElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "feMorphology"): SVGFEMorphologyElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "filter"): SVGFilterElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "g"): SVGGElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "path"): SVGPathElement;
	createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: "svg"): SVGSVGElement;
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
