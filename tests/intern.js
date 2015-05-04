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

define(["intern"], function (intern) {
	var result = {
		suites: [
			"tests/unit/minified",
			"tests/unit/miscellaneous",
			"tests/unit/polyfills",
			"tests/unit/primitives",
			"tests/unit/tags",
			"tests/unit/webworker"
		],
		functionalSuites: [
			"tests/functional/kfx/kfx"
		],
		excludeInstrumentation: /^(?:tests|node_modules)[/\\]/,
		tunnel: "NullTunnel",
		environments: [
			{ browserName: "chrome" },
			{ browserName: "firefox", firefox_profile:
				"UEsDBBQAAAAIAE6yo0ZkJDVLdgMAAGENAAAHAAAAdXNlci5qc6VXTc/TMAy+I/Ef0HsCiUUDNCHB" +
				"ia8DEhKICXGM0tRdw9IkSpz13b/HSVo0DbpQuC2ZndiPHz9OYwDPnYfu8V3j7UgrFkQH+bcyBzYI" +
				"PQoPDIxoNLR3Tx91Qgd48vrhgwvXViAZOesx+fQgNPZlzcjopGTtAAM4Wn9kPaJjrlehP2/S306E" +
				"sNFgDtiT5/Pd7vpiO1CI91z23g7Ag/TKIffRcFQDkMuL7eRxnSWKJjBKzXw277QNMAe2YN7a0Wgr" +
				"WrrNiENCqbfj9x7MHkXOesHfUVwOQ7qOD7YVuoYknNBaHRh4b720Jlh9CR76eO0S1MFYwzwMMDTg" +
				"93kZKvkECEGRGVoP5BoioddRrFx6EfqKs1bmyKwDw+EewRuhU3HWc6JTPuDXaBauG6FpvTrRWkgJ" +
				"Dnk0lH5AaLkEj2GG43dKlHu40Jr/CBRk8qZsFzwS4EeFbCLhXOFWhYT6Auip7NGxnmjnyJyPoGWi" +
				"YPQJjLu7K/sElMmIs+gIGmDGourO38hkIf0AMnqF58xSflIwEpB8UPfQZvZxaySsb8joEo8/FEbV" +
				"ru6UBvrFAnolkVuvDspwZ7WS5wpJDIxEejbhIRob8VWjhTne3Yy1nM3S5j42g8o0/ZI332QWXAW9" +
				"6pwp60rkc21TXcl0W+0CSpVqQxLxhzawXUeGsBHOBUaEpLo1Z95CJ6LGwq1F9GVwU+v/FUXAIPjE" +
				"kRHEcfao8LAmzHNvIGgYAP2ZFUXLDs9rxvPh68LP21Dl+FyHD98+vWEvWNGIWSSXjK/79pqb1Yw8" +
				"/ABZvaaQP12wCgIN4rSAQKWYIqJ9XwRrL62DJHXPtouCWoLiRiAtOZzA/JLT+rz87MDUI2q0lUet" +
				"Av4HAuuVsTr2hJd9oX595A+stDVr4+BuD2Hh3GJDLbPWUi28aqcZU1Xha/l9sfCKKhNsM0tPQIGx" +
				"9iCYjBespndW5YF1PbVDelZcTG1FG+BrAGYuL8TxQ5xEiYHZMtJzk3w078pLqZx983VJaWykNQZk" +
				"9t848BsypYBvt0ynaMPe8zRgyPLldrdbI2fLwM4PDZ5nSRuzU5rR60X/rzUz9KA1kz3I4/syit6W" +
				"fy79Kt8G//5NoO3hkDan5+2HFfoQ0ixHrkzergtjuWsOtibbVAmnxRnaD8+2+y950LFn5LK7JYoe" +
				"BjuxNk8X9vwyqp9QSwECPwAUAAAACABOsqNGZCQ1S3YDAABhDQAABwAkAAAAAAAAACAAAAAAAAAA" +
				"dXNlci5qcwoAIAAAAAAAAQAYABHwicAphtABMWWQhyaG0AExZZCHJobQAVBLBQYAAAAAAQABAFkA" +
				"AACbAwAAAAA="
			},
			{ browserName: "internet explorer", version: "11" }
		],
	};

	if (intern.args.minified === "true") {
		result.loader = {
			map: {
				tests: {
					"lib/libjass": "lib/libjass.min",
					"lib/libjass.js": "lib/libjass.min.js",
				}
			}
		};
	}

	return result;
});
