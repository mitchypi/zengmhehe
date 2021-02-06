import { bySport, PHASE, PLAYER } from "../../common";
import { player, team } from "../core";
import { idb } from "../db";
import { g } from "../util";
import type { ViewInput } from "../../common/types";

const updateUpcomingFreeAgents = async (
	inputs: ViewInput<"upcomingFreeAgents">,
) => {
	const stats = bySport({
		basketball: ["min", "pts", "trb", "ast", "per"],
		football: ["gp", "keyStats", "av"],
		hockey: ["gp", "keyStats", "ops", "dps", "ps"],
	});

	const showActualFreeAgents =
		g.get("phase") === PHASE.RESIGN_PLAYERS &&
		g.get("season") === inputs.season;

	let players: any[] = showActualFreeAgents
		? await idb.getCopies.players({
				tid: PLAYER.FREE_AGENT,
		  })
		: await idb.getCopies.players({
				tid: [0, Infinity],
				filter: p => p.contract.exp === inputs.season,
		  });

	// Done before filter so full player object can be passed to player.genContract.
	for (const p of players) {
		p.contractDesired = player.genContract(p, false); // No randomization
		p.contractDesired.exp += inputs.season - g.get("season");

		p.mood = await player.moodInfos(p, {
			contractAmount: p.contractDesired.amount,
		});
	}

	players = await idb.getCopies.playersPlus(players, {
		attrs: [
			"pid",
			"name",
			"abbrev",
			"tid",
			"age",
			"contract",
			"injury",
			"contractDesired",
			"watch",
			"jerseyNumber",
			"mood",
		],
		ratings: ["ovr", "pot", "skills", "pos"],
		stats,
		season: g.get("season"),
		showNoStats: true,
		showRookies: true,
		fuzz: true,
	});

	// Apply mood
	for (const p of players) {
		p.contractDesired.amount = p.mood.user.contractAmount / 1000;
	}

	const projectedPayroll = await team.getPayroll(
		g.get("userTid"),
		inputs.season,
	);
	const projectedCapSpace = g.get("salaryCap") - projectedPayroll;

	return {
		challengeNoRatings: g.get("challengeNoRatings"),
		phase: g.get("phase"),
		players,
		projectedCapSpace,
		season: inputs.season,
		stats,
		userTid: g.get("userTid"),
	};
};

export default updateUpcomingFreeAgents;
