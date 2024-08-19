// import { parseJsonWithReferences } from "@/lib/json-parsing";

// describe("JSON Parsing with References", () => {
// 	it("JSON-serialized string", () => {
// 		const input = '"abc"';
// 		const result = parseJsonWithReferences(input);
// 		expect(result).toEqual("abc");
// 	});

// 	it("Single reference", () => {
// 		const input = '{{ a["abc"][0]["def"] }}';
// 		const result = parseJsonWithReferences(input);
// 		expect(result).toEqual('{{ a["abc"][0]["def"] }}');
// 	});

// 	it("Reference in array", () => {
// 		const input = '[{{ a["abc"][0]["def"] }}, {{ a["abc"][1]["ghi"] }}]';
// 		const result = parseJsonWithReferences(input);
// 		expect(result).toEqual([
// 			'{{ a["abc"][0]["def"] }}',
// 			'{{ a["abc"][1]["ghi"] }}',
// 		]);
// 	});

// 	it("Reference in object", () => {
// 		const input = '{"key": {{ a["abc"][0]["def"] }}}';
// 		const result = parseJsonWithReferences(input);
// 		expect(result).toEqual({
// 			key: '{{ a["abc"][0]["def"] }}',
// 		});
// 	});
// 	// TODO:
// });

// /*

// - Without references
// - Error cases with " and '

// */
