import Ajv from "ajv";
import JSONParserText from "./JSONParserText";

// This is dynamically resolved with rollup-plugin-alias
// @ts-ignore
import schema from "league-schema"; // eslint-disable-line

const ajv = new Ajv({
	allErrors: true,
	verbose: true,
});
const validate = ajv.compile(schema);

// These objects (at the root of a league file) should be emitted as a complete object, rather than individual rows from an array
export const CUMULATIVE_OBJECTS = new Set([
	"gameAttributes",
	"meta",
	"startingSeason",
	"version",
]);

export const parseJSON = () => {
	let parser: any;

	const transformStream = new TransformStream({
		start(controller) {
			parser = new JSONParserText(value => {
				// This function was adapted from JSONStream, particularly the part where row.value is set to undefind at the bottom, that is important!

				// The key on the root of the object is in the stack if we're nested, or is just parser.key if we're not
				let objectType;
				if (parser.stack.length > 1) {
					objectType = parser.stack[1].key;
				} else {
					objectType = parser.key;
				}

				const emitAtStackLength = CUMULATIVE_OBJECTS.has(objectType) ? 1 : 2;

				if (parser.stack.length !== emitAtStackLength) {
					// We must be deeper in the tree, still building an object to emit
					return;
				}

				controller.enqueue({
					key: objectType,
					value,
				});

				// Now that we have emitted the object we want, we no longer need to keep track of all the values on the stack. This avoids keeping the whole JSON object in memory.
				for (const row of parser.stack) {
					row.value = undefined;
				}
			});
		},

		transform(chunk) {
			parser.write(chunk);
		},
	});

	return transformStream;
};

const getBasicInfo = async (stream: ReadableStream) => {
	const basicInfo: any = {};

	// Keep in sync with NewLeagueTeam
	const BASIC_TEAM_KEYS = [
		"tid",
		"region",
		"name",
		"abbrev",
		"stadiumCapacity",
		"imgURL",
		"imgURLSmall",
		"colors",
		"srID",
		"disabled",
		"jersey",
		"cid",
		"did",
	];

	const reader = await stream.pipeThrough(parseJSON()).getReader();

	while (true) {
		const { value, done } = (await reader.read()) as any;
		if (done) {
			break;
		}

		const cumulative = CUMULATIVE_OBJECTS.has(value.key);

		if (cumulative) {
			basicInfo[value.key] = value.value;
		} else if (value.key === "teams") {
			if (!basicInfo.teams) {
				basicInfo.teams = [];
			}

			const t = {
				...value.value,
			};

			if (!t.colors) {
				t.colors = ["#000000", "#cccccc", "#ffffff"];
			}

			if (t.seasons?.length > 0) {
				// If specified on season, copy to root
				const maybeOnSeason = ["pop", "stadiumCapacity"] as const;
				const ts = t.seasons.at(-1);
				for (const prop of maybeOnSeason) {
					if (ts[prop] !== undefined) {
						t[prop] = ts[prop];
					}
				}
			}

			// stats and seasons take up a lot of space, so we don't need to keep them. But... heck, why not.

			basicInfo.teams.push(value.value);
		} else {
			// Everything else just store as an empty array, so it shows up in the "Use from selected league" list
			if (!basicInfo[value.key]) {
				basicInfo[value.key] = [];
			}
		}
	}

	return basicInfo;
};

const initialCheck = async (file: File) => {
	console.time("initialCheck");
	const stream = file.stream() as unknown as ReadableStream;
	console.timeLog("initialCheck");

	const stream2 = stream.pipeThrough(new TextDecoderStream());
	console.timeLog("initialCheck");
	const basicInfo = await getBasicInfo(stream2);
	console.timeLog("initialCheck");

	console.log("basicInfo", basicInfo);

	validate(basicInfo);
	const schemaErrors = validate.errors ?? [];

	return {
		basicInfo,
		schemaErrors,
	};
};

export default {
	initialCheck,
};