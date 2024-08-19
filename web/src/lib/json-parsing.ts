// import { TJson } from "@/types/json";

// const REFERENCE_REGEX = /{{((?!}}).)*}}/g;

// /**
//  * TODO: Add explanation
//  *
//  * @param input T
//  * @returns JSON value
//  */
// export function parseJsonWithReferences(input: string): TJson {
// 	// Compute which positions are within quotes (i.e., "..." or '...')
// 	const isWithinString = new Array(input.length).fill(null);
// 	let idx = 0;
// 	while (idx < input.length) {
// 		// Find the next " or '
// 		for (
// 			;
// 			idx < input.length && input[idx] !== '"' && input[idx] !== "'";
// 			idx += 1
// 		) {
// 			if (
// 				input[idx] == "{" &&
// 				idx + 1 < input.length &&
// 				input[idx + 1] == "{"
// 			) {
// 				// Skip reference: {{ <some-reference> }}
// 				idx += 2;
// 				for (
// 					;
// 					idx < input.length &&
// 					(input[idx] !== "}" ||
// 						(idx + 1 < input.length && input[idx + 1] !== "}"));
// 					idx += 1
// 				);
// 			}
// 		}

// 		if (idx == input.length) {
// 			break;
// 		}

// 		const expected = input[idx];

// 		// We have found a starting " or '
// 		for (; idx < input.length && input[idx] !== expected; idx += 1) {
// 			isWithinString[idx] = true;

// 			if (
// 				input[idx] == "{" &&
// 				idx + 1 < input.length &&
// 				input[idx + 1] == "{"
// 			) {
// 				// Skip reference: {{ <some-reference> }}
// 				idx += 2;
// 				for (
// 					;
// 					idx < input.length &&
// 					(input[idx] !== "}" ||
// 						(idx + 1 < input.length && input[idx + 1] !== "}"));
// 					idx += 1
// 				) {
// 					isWithinString[idx] = true;
// 				}
// 			}
// 		}

// 		idx += 1;
// 	}

// 	// Iterate over references and check whether we need to wrap them within "..."
// 	const replacements = [];
// 	const matches = input.matchAll(REFERENCE_REGEX);
// 	for (const match of matches) {
// 		if (isWithinString[match.index]) {
// 			// Already within a quote
// 			continue;
// 		}

// 		// Not within a string - we must wrap the reference
// 		// Wrap in the right kind of quote
// 		const matchString = match[0].replaceAll('"', '\\"');
// 		replacements.push([
// 			match.index,
// 			match.index + match[0].length,
// 			`"${matchString}"`,
// 		]);
// 	}

// 	let out = [input];
// 	for (const [start, end, replacement] of replacements.toReversed()) {
// 		const str1 = out[out.length - 1].substring(end as number);
// 		const str2 = out[out.length - 1].substring(0, start as number);

// 		out[out.length - 1] = str1;
// 		out.push(replacement as string);
// 		out.push(str2);
// 	}

// 	return JSON.parse(out.toReversed().join(""));
// }
