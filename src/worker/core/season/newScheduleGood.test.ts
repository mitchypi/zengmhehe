import assert from "assert";
import testHelpers from "../../../test/helpers";
import newSchedule from "./newScheduleGood";
import { g, helpers } from "../../util";
import range from "lodash-es/range";

describe("worker/core/season/newScheduleGood", () => {
	let defaultTeams: {
		seasonAttrs: {
			cid: number;
			did: number;
		};
		tid: number;
	}[];

	beforeAll(() => {
		defaultTeams = helpers.getTeamsDefault().map(t => ({
			// Don't need tid to start at 0, could be disabled teams!
			tid: t.tid + 2,
			seasonAttrs: {
				cid: t.cid,
				did: t.did,
			},
		}));
	});

	describe("old basketball tests", () => {
		beforeAll(() => {
			testHelpers.resetG();
			g.setWithoutSavingToDB("allStarGame", null);
		});

		test("schedule 1230 games (82 each for 30 teams)", () => {
			const { tids, warning } = newSchedule(defaultTeams);
			assert.strictEqual(warning, undefined);
			assert.strictEqual(tids.length, 1230);
		});

		test("schedule 41 home games and 41 away games for each team", () => {
			const { tids, warning } = newSchedule(defaultTeams);
			assert.strictEqual(warning, undefined);

			const home: Record<number, number> = {}; // Number of home games for each team
			const away: Record<number, number> = {}; // Number of away games for each team
			for (let i = 0; i < tids.length; i++) {
				if (home[tids[i][0]] === undefined) {
					home[tids[i][0]] = 0;
				}
				if (away[tids[i][1]] === undefined) {
					away[tids[i][1]] = 0;
				}
				home[tids[i][0]] += 1;
				away[tids[i][1]] += 1;
			}

			assert.strictEqual(Object.keys(home).length, defaultTeams.length);
			for (const numGames of [...Object.values(home), ...Object.values(away)]) {
				assert.strictEqual(numGames, 41);
			}
		});

		test("schedule each team one home game against every team in the other conference", () => {
			const { tids, warning } = newSchedule(defaultTeams);
			assert.strictEqual(warning, undefined);

			// Each element in this object is an object representing the number of home games against each other team (only the ones in the other conference will be populated)
			const home: Record<number, Record<number, number>> = {};

			for (let i = 0; i < tids.length; i++) {
				const t0 = defaultTeams.find(t => t.tid === tids[i][0]);
				const t1 = defaultTeams.find(t => t.tid === tids[i][1]);
				if (!t0 || !t1) {
					console.log(tids[i]);
					throw new Error("Team not found");
				}
				if (t0.seasonAttrs.cid !== t1.seasonAttrs.cid) {
					if (home[tids[i][1]] === undefined) {
						home[tids[i][1]] = {};
					}
					if (home[tids[i][1]][tids[i][0]] === undefined) {
						home[tids[i][1]][tids[i][0]] = 0;
					}
					home[tids[i][1]][tids[i][0]] += 1;
				}
			}

			assert.strictEqual(Object.keys(home).length, defaultTeams.length);

			for (const { tid } of defaultTeams) {
				assert.strictEqual(Object.values(home[tid]).length, 15);
				assert.strictEqual(
					testHelpers.numInArrayEqualTo(Object.values(home[tid]), 1),
					15,
				);
			}
		});

		test("schedule each team two home games against every team in the same division", () => {
			const { tids, warning } = newSchedule(defaultTeams);
			assert.strictEqual(warning, undefined);

			// Each element in this object is an object representing the number of home games against each other team (only the ones in the same division will be populated)
			const home: Record<number, Record<number, number>> = {};

			for (let i = 0; i < tids.length; i++) {
				const t0 = defaultTeams.find(t => t.tid === tids[i][0]);
				const t1 = defaultTeams.find(t => t.tid === tids[i][1]);
				if (!t0 || !t1) {
					console.log(tids[i]);
					throw new Error("Team not found");
				}
				if (t0.seasonAttrs.did === t1.seasonAttrs.did) {
					if (home[tids[i][1]] === undefined) {
						home[tids[i][1]] = {};
					}
					if (home[tids[i][1]][tids[i][0]] === undefined) {
						home[tids[i][1]][tids[i][0]] = 0;
					}
					home[tids[i][1]][tids[i][0]] += 1;
				}
			}

			assert.strictEqual(Object.keys(home).length, defaultTeams.length);

			for (const { tid } of defaultTeams) {
				assert.strictEqual(Object.values(home[tid]).length, 4);
				assert.strictEqual(
					testHelpers.numInArrayEqualTo(Object.values(home[tid]), 2),
					4,
				);
			}
		});

		test.skip("schedule each team one or two home games against every team in the same conference but not in the same division (one game: 2/10 teams; two games: 8/10 teams)", () => {
			const { tids, warning } = newSchedule(defaultTeams);
			assert.strictEqual(warning, undefined);

			// Each element in this object is an object representing the number of home games against each other team (only the ones in the same conference but different division will be populated)
			const home: Record<number, Record<number, number>> = {};

			for (let i = 0; i < tids.length; i++) {
				const t0 = defaultTeams.find(t => t.tid === tids[i][0]);
				const t1 = defaultTeams.find(t => t.tid === tids[i][1]);
				if (!t0 || !t1) {
					console.log(tids[i]);
					throw new Error("Team not found");
				}
				if (
					t0.seasonAttrs.cid === t1.seasonAttrs.cid &&
					t0.seasonAttrs.did !== t1.seasonAttrs.did
				) {
					if (home[tids[i][1]] === undefined) {
						home[tids[i][1]] = {};
					}
					if (home[tids[i][1]][tids[i][0]] === undefined) {
						home[tids[i][1]][tids[i][0]] = 0;
					}
					home[tids[i][1]][tids[i][0]] += 1;
				}
			}

			assert.strictEqual(Object.keys(home).length, defaultTeams.length);

			for (const { tid } of defaultTeams) {
				console.log(tid, Object.values(home[tid]));
				assert.strictEqual(Object.values(home[tid]).length, 10);
				assert.strictEqual(
					testHelpers.numInArrayEqualTo(Object.values(home[tid]), 1),
					2,
				);
				assert.strictEqual(
					testHelpers.numInArrayEqualTo(Object.values(home[tid]), 2),
					8,
				);
			}
		});
	});

	describe("old newScheduleCrappy tests", () => {
		const makeTeams = (numTeams: number) => {
			return range(numTeams).map(tid => ({
				// Don't need tid to start at 0, could be disabled teams!
				tid: 5 + tid,
				seasonAttrs: {
					did: 0,
					cid: 0,
				},
			}));
		};

		beforeEach(() => {
			testHelpers.resetG();
			g.setWithoutSavingToDB("allStarGame", null);
		});

		test("when numTeams*numGames is even, everyone gets a full schedule", () => {
			for (let numGames = 2; numGames < 50; numGames += 1) {
				for (let numTeams = 2; numTeams < 50; numTeams += 1) {
					if ((numTeams * numGames) % 2 === 1) {
						continue;
					}

					g.setWithoutSavingToDB("numGames", numGames);
					const teams = makeTeams(numTeams);
					const { tids: matchups } = newSchedule(teams);

					// Total number of games
					assert.strictEqual(
						matchups.length * 2,
						numGames * numTeams,
						`Total number of games is wrong for ${numTeams} teams and ${numGames} games`,
					);

					// Number of games for each teams
					const tids = matchups.flat();

					for (const t of teams) {
						const count = tids.filter(tid => t.tid === tid).length;
						assert.strictEqual(count, numGames);
					}
				}
			}
		});

		test("when numTeams*numGames is odd, one team is a game short", () => {
			for (let numGames = 2; numGames < 50; numGames += 1) {
				for (let numTeams = 2; numTeams < 50; numTeams += 1) {
					if ((numTeams * numGames) % 2 === 0) {
						continue;
					}

					g.setWithoutSavingToDB("numGames", numGames);
					const teams = makeTeams(numTeams);
					const { tids: matchups } = newSchedule(teams); // Total number of games

					assert.strictEqual(
						matchups.length,
						(numGames * numTeams - 1) / 2,
						`Total number of games is wrong for ${numTeams} teams and ${numGames} games`,
					);

					// Number of games for each teams
					const tids = matchups.flat();
					let oneShort = false;

					for (const t of teams) {
						const count = tids.filter(tid => t.tid === tid).length;

						if (count + 1 === numGames) {
							if (oneShort) {
								throw new Error("Two teams are one game short");
							}

							oneShort = true;
						} else {
							assert.strictEqual(count, numGames);
						}
					}

					assert(
						oneShort,
						`Did not find team with one game short for ${numTeams} teams and ${numGames} games`,
					);
				}
			}
		});

		test("when numGames is even and there are enough games, everyone gets even home and away games", () => {
			for (let numGames = 20; numGames < 50; numGames += 1) {
				if (numGames % 2 === 1) {
					continue;
				}
				for (let numTeams = 2; numTeams < 25; numTeams += 1) {
					g.setWithoutSavingToDB("numGames", numGames);
					const teams = makeTeams(numTeams);
					const { tids: matchups } = newSchedule(teams); // Total number of games

					assert.strictEqual(
						matchups.length * 2,
						numGames * numTeams,
						"Total number of games is wrong",
					);

					const home: Record<number, number> = {}; // Number of home games for each team
					const away: Record<number, number> = {}; // Number of away games for each team
					for (let i = 0; i < matchups.length; i++) {
						if (home[matchups[i][0]] === undefined) {
							home[matchups[i][0]] = 0;
						}
						if (away[matchups[i][1]] === undefined) {
							away[matchups[i][1]] = 0;
						}

						home[matchups[i][0]] += 1;
						away[matchups[i][1]] += 1;
					}

					for (const t of teams) {
						assert.strictEqual(home[t.tid], numGames / 2);
						assert.strictEqual(away[t.tid], numGames / 2);
					}
				}
			}
		});
	});

	describe("error handling", () => {
		test("warning if cannot make a full schedule due to there not being enough non-conference games", () => {
			testHelpers.resetG();

			g.setWithoutSavingToDB("numGamesDiv", 2);
			g.setWithoutSavingToDB("numGamesConf", 2);
			g.setWithoutSavingToDB(
				"divs",
				g.get("divs").map(div => ({
					...div,
					cid: 0,
				})),
			);
			g.setWithoutSavingToDB(
				"confs",
				g.get("confs").filter(conf => conf.cid === 0),
			);
			const { tids, warning } = newSchedule(
				defaultTeams.map(t => ({
					...t,
					seasonAttrs: {
						cid: 0,
						did: t.seasonAttrs.did,
					},
				})),
			);

			assert.strictEqual(tids.length, 1230);
			assert.strictEqual(typeof warning, "string");
		});
	});

	describe("random test cases", () => {
		beforeEach(() => {
			testHelpers.resetG();
		});

		test.only("10 games, null div, 1 conf", () => {
			const { warning } = newSchedule(defaultTeams, {
				divs: g.get("divs"),
				numGames: 5,
				numGamesDiv: null,
				numGamesConf: 1,
			});

			console.log(warning);
			assert.strictEqual(warning, undefined);
		});
	});
});
