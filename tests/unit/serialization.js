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

define(["intern!tdd", "intern/chai!assert", "libjass", "intern/dojo/text!./1.ass"], function (tdd, assert, libjass, ass_1) {
	tdd.suite("Serialization", function () {
		tdd.test("ASS", function () {
			return libjass.ASS.fromString(ass_1).then(function (ass) {
				var serialized = libjass.serialize(ass);
				assert.isString(serialized);

				var deserialized = libjass.deserialize(serialized);
				assert.instanceOf(deserialized, libjass.ASS);
				assert.instanceOf(deserialized.styles, libjass.Map);
				assert.deepEqual(deserialized.styles.get("Default"), ass.styles.get("Default"));
				assert.deepEqual(deserialized.dialogues, ass.dialogues);
			});
		});
	});
});
