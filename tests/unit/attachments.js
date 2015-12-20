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

define([
	"intern!tdd",
	"intern/chai!assert",
	"libjass",
	"intern/dojo/text!./8.ass"
], function (tdd, assert, libjass, ass_8) {
	tdd.suite("Attachments", function () {
		tdd.test("Attachments", function () {
			this.timeout = 1000;

			return libjass.ASS.fromString(ass_8, libjass.Format.ASS).then(function (ass) {
				assert.strictEqual(ass.properties.resolutionX, 1280);

				assert.strictEqual(ass.styles.size, 2);
				assert.strictEqual(ass.styles.get("Default").name, "Default");
				assert.strictEqual(ass.styles.get("sign1").name, "sign1");

				assert.strictEqual(ass.dialogues.length, 1);
				assert.strictEqual(ass.dialogues[0].start, 77.670);

				assert.strictEqual(ass.attachments.length, 4);
				assert.strictEqual(ass.attachments[0].filename, "01.ttf");
				assert.strictEqual(ass.attachments[0].type, libjass.AttachmentType.Font);
				assert.strictEqual(ass.attachments[0].contents, "AAEAAAATAQAABAAwR1BPUxW4Gg8AANx0AAAElkxUU0jEEBSeAAAFZAAAANdPUy8yQkR9uwAAAbgAAABgVkRNWG1NdPkAAAY8AAAF4GNtYXC2Pb3XAAAfjAAABspjdnQgA/YAFAAAKtQAAAAWZnBnbXS3O5wAACZYAAAEWWdhc3AAFwAJAADcZAAAABBnbHlmo1j4PwAAKuwAAIlMaGRteLCZYL8AAAwcAAATcGhlYWTn9Gh0");
				assert.strictEqual(ass.attachments[1].filename, "02.ttf");
				assert.strictEqual(ass.attachments[1].type, libjass.AttachmentType.Font);
				assert.strictEqual(ass.attachments[1].contents, "AAEAAAAPADAAAwDAT1MvMlHRXm8AAGL0AAAAVlBDTFT9mm7mAABjTAAAADZjbWFw9oFLnwAAWewAAAKAaY3Z0IF5OAxAAAAN4AAAAGmZwZ22DM8JPAAADZAAAABRnbHlmQvUhngAAA9QAAFIGGRteIrocxcAAFxs6AAGiGhlYWTTRJTnAABjhAAAADZoaGVhFGQPAgAAY7wAAAAkaG10eIhb+h8AAFdsAAABjGxvY2EAD+h8");
				assert.strictEqual(ass.attachments[2].filename, "03.ttf");
				assert.strictEqual(ass.attachments[2].type, libjass.AttachmentType.Font);
				assert.strictEqual(ass.attachments[2].contents, "AAEAAAAPADAAAwDAT1MvMlHRXm8AAGL0AAAAVlBDTFT9mm7mAABjTAAAADZjbWFw9oFLnwAAWewAAAKAY3Z0IF5OAxAAAAN4AAAAGmZwZ22DM8JPAAADZAAAABRnbHlmQvUhngAAA9QAAFIGaGRteIrocxcAAFxsAAAGiGhlYWTTRJTnAABjhAAAADZoaGVhFGQPAgAAY7wAAAAkaG10eIhb+h8AAFdsAAABjGxvY2EAD+hE");
				assert.strictEqual(ass.attachments[3].filename, "01.jpg");
				assert.strictEqual(ass.attachments[3].type, libjass.AttachmentType.Graphic);
				assert.strictEqual(ass.attachments[3].contents, "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQECAQEBAQEBAgICAgICAgICAgICAgIDAwMDAwMDAwMDAwMDAwP/2wBDAQEBAQEBAQIBAQIDAgICAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/wAARCAV4A+gDAREAAhEBAxEB/8QA");
			});
		});
	});
});
