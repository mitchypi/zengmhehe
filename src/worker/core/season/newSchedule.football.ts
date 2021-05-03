import flatten from "lodash-es/flatten";
import { g, random } from "../../../worker/util";
import newScheduleCrappy from "./newScheduleCrappy";

/**
 * This makes an NFL-like schedule in terms of conference matchups, division matchups, and home/away games.
 *
 * @memberOf core.season
 * @return {Array.<Array.<number>>} All the season's games. Each element in the array is an array of the home team ID and the away team ID, respectively.
 */
const newScheduleDefault = (
	teams: {
		seasonAttrs: {
			did: number;
		};
		tid: number;
	}[],
) => {
	const tids: [number, number][] = []; // tid_home, tid_away

	// Collect info needed for scheduling
	const homeGames: Record<number, number> = {};
	const awayGames: Record<number, number> = {};
	for (const t of teams) {
		homeGames[t.tid] = 0;
		awayGames[t.tid] = 0;
	}

	for (const t of teams) {
		for (const t2 of teams) {
			if (t.tid !== t2.tid) {
				// Constraint: 1 home game vs. each team in same division
				const game: [number, number] = [t.tid, t2.tid];

				if (t.seasonAttrs.did === t2.seasonAttrs.did) {
					tids.push(game);
					homeGames[t.tid] += 1;
					awayGames[t2.tid] += 1;
				}
			}
		}
	}

	// Constraint: 5 home games vs. teams from other divisions
	let failures = 0;

	const SEVENTEEN_GAMES = g.get("numGames") === 17;

	while (true) {
		const newTids: [number, number][] = [];
		let success = true; // Copy, so each iteration of the while loop this is reset

		const homeGames2 = { ...homeGames };
		const awayGames2 = { ...awayGames };

		for (const t of teams) {
			const nonDivisionTeams = teams.filter(
				t2 => t.seasonAttrs.did !== t2.seasonAttrs.did,
			);
			const withGamesLeft = nonDivisionTeams.filter(
				t2 => awayGames2[t2.tid] < 8,
			);

			if (withGamesLeft.length < 5) {
				success = false;
				break;
			}

			random.shuffle(withGamesLeft);

			for (let i = 0; i < 5; i++) {
				const t2 = withGamesLeft[i];
				newTids.push([t.tid, t2.tid]);
				homeGames2[t.tid] += 1;
				awayGames2[t2.tid] += 1;
			}
		}

		// If 17 game season, add another non-division game for each team
		if (SEVENTEEN_GAMES) {
			const randomOrderTeams = [...teams];
			random.shuffle(randomOrderTeams);

			const home = new Set<typeof teams[number]>();
			const away = new Set<typeof teams[number]>();
			for (let i = 0; i < randomOrderTeams.length; i++) {
				const t = randomOrderTeams[i];
				if (i < randomOrderTeams.length / 2) {
					home.add(t);
				} else {
					away.add(t);
				}
			}

			for (const t of home) {
				let found = false;
				for (const t2 of away) {
					if (t.seasonAttrs.did !== t2.seasonAttrs.did) {
						newTids.push([t.tid, t2.tid]);
						console.log("found", [t.tid, t2.tid]);
						away.delete(t2);
						found = true;
						break;
					}
				}

				if (!found) {
					success = false;
					break;
				}
			}
		}

		if (success) {
			tids.push(...newTids);
			break;
		}

		failures += 1;

		if (failures > 100000) {
			throw new Error("Failed generating scheudle");
		}
	}

	return tids;
};

/**
 * Wrapper function to generate a new schedule with the appropriate algorithm based on the number of teams in the league.
 *
 * For leagues with NFL-like structure, use newScheduleDefault. Otherwise, newScheduleCrappy.
 *
 * @memberOf core.season
 * @return {Array.<Array.<number>>} All the season's games. Each element in the array is an array of the home team ID and the away team ID, respectively.
 */
const newSchedule = (
	teams: {
		seasonAttrs: {
			cid: number;
			did: number;
		};
		tid: number;
	}[],
) => {
	let tids: [number, number][];

	let fourDivsPerConf = true;
	for (const conf of g.get("confs", "current")) {
		if (
			g.get("divs", "current").filter(div => div.cid === conf.cid).length !== 4
		) {
			fourDivsPerConf = false;
			break;
		}
	}

	let fourTeamsPerDiv = true;
	for (const div of g.get("divs", "current")) {
		if (teams.filter(t => t.seasonAttrs.did === div.did).length !== 4) {
			fourTeamsPerDiv = false;
			break;
		}
	}

	let twoConfsEvenTeams = g.get("confs", "current").length === 2;
	for (const conf of g.get("confs", "current")) {
		if (
			teams.filter(t => t.seasonAttrs.cid === conf.cid).length !==
			teams.length / 2
		) {
			twoConfsEvenTeams = false;
			break;
		}
	}

	if (
		teams.length === 32 &&
		(g.get("numGames") === 16 || g.get("numGames") === 17) &&
		g.get("confs", "current").length === 2 &&
		fourDivsPerConf &&
		fourTeamsPerDiv &&
		twoConfsEvenTeams
	) {
		tids = newScheduleDefault(teams);
	} else {
		tids = newScheduleCrappy(teams);
	}

	// Order the schedule so that it takes fewer days to play
	random.shuffle(tids);
	const days: [number, number][][] = [[]];
	const tidsInDays: number[][] = [[]];
	let jMax = 0;

	for (let i = 0; i < tids.length; i++) {
		let used = false;

		for (let j = 0; j <= jMax; j++) {
			if (
				!tidsInDays[j].includes(tids[i][0]) &&
				!tidsInDays[j].includes(tids[i][1])
			) {
				tidsInDays[j].push(tids[i][0]);
				tidsInDays[j].push(tids[i][1]);
				days[j].push(tids[i]);
				used = true;
				break;
			}
		}

		if (!used) {
			days.push([tids[i]]);
			tidsInDays.push([tids[i][0], tids[i][1]]);
			jMax += 1;
		}
	}

	random.shuffle(days); // Otherwise the most dense days will be at the beginning and the least dense days will be at the end

	tids = flatten(days);
	return tids;
};

export default newSchedule;
