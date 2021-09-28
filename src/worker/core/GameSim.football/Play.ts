import flatten from "lodash-es/flatten";
import type GameSim from ".";
import getBestPenaltyResult from "./getBestPenaltyResult";
import type { PlayerGameSim, TeamNum } from "./types";

type PlayEvent =
	| {
			type: "k";
			kickTo: number;
	  }
	| {
			type: "onsideKick";
			kickTo: number;
	  }
	| {
			type: "touchbackKick";
	  }
	| {
			type: "kr";
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "onsideKickRecovery";
			success: boolean;
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "krTD";
			p: PlayerGameSim;
	  }
	| {
			type: "p";
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "touchbackPunt";
			p: PlayerGameSim;
	  }
	| {
			type: "pr";
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "prTD";
			p: PlayerGameSim;
	  }
	| {
			type: "rus";
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "rusTD";
			p: PlayerGameSim;
	  }
	| {
			type: "kneel";
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "sk";
			qb: PlayerGameSim;
			p: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "pss";
			qb: PlayerGameSim;
			target: PlayerGameSim;
	  }
	| {
			type: "pssCmp";
			qb: PlayerGameSim;
			target: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "pssInc";
			defender: PlayerGameSim | undefined;
			yds: number;
	  }
	| {
			type: "pssTD";
			qb: PlayerGameSim;
			target: PlayerGameSim;
	  }
	| {
			type: "int";
			qb: PlayerGameSim;
			defender: PlayerGameSim;
			ydsReturn: number;
	  }
	| {
			type: "intTD";
			p: PlayerGameSim;
	  }
	| {
			type: "xp" | "fg";
			p: PlayerGameSim;
			distance: number;
			made: boolean;
	  }
	| {
			type: "penalty";
			p: PlayerGameSim | undefined;
			automaticFirstDown: boolean;
			name: string;
			penYds: number;
			spotYds: number | undefined; // undefined if not spot foul
			t: TeamNum;
	  }
	| {
			type: "fmb";
			pFumbled: PlayerGameSim;
			pForced: PlayerGameSim;
			yds: number;
	  }
	| {
			type: "fmbRec";
			pFumbled: PlayerGameSim;
			pRecovered: PlayerGameSim;
			lost: boolean;
			yds: number;
	  }
	| {
			type: "fmbTD";
			p: PlayerGameSim;
	  }
	| {
			type: "twoPointConversion";
			t: TeamNum;
	  }
	| {
			type: "twoPointConversionDone";
			t: TeamNum;
	  }
	| {
			type: "defSft";
			p: PlayerGameSim;
	  }
	| {
			type: "possessionChange";
			yds: number;
			kickoff?: boolean;
	  };

type PlayType = PlayEvent["type"];

type PlayState = Pick<
	GameSim,
	| "down"
	| "toGo"
	| "scrimmage"
	| "o"
	| "d"
	| "isClockRunning"
	| "awaitingKickoff"
	| "awaitingAfterSafety"
	| "awaitingAfterTouchdown"
	| "overtimeState"
	| "twoPointConversionTeam"
>;

type StatChange = Parameters<GameSim["recordStat"]>;

export class State {
	down: PlayState["down"];
	toGo: PlayState["toGo"];
	scrimmage: PlayState["scrimmage"];
	o: PlayState["o"];
	d: PlayState["d"];
	isClockRunning: PlayState["isClockRunning"];
	awaitingKickoff: PlayState["awaitingKickoff"];
	awaitingAfterSafety: PlayState["awaitingAfterSafety"];
	awaitingAfterTouchdown: PlayState["awaitingAfterTouchdown"];
	overtimeState: PlayState["overtimeState"];
	twoPointConversionTeam: PlayState["twoPointConversionTeam"];
	pts: [number, number];
	numPossessionChanges: 0;

	constructor(gameSim: PlayState, pts: [number, number]) {
		this.down = gameSim.down;
		this.toGo = gameSim.toGo;
		this.scrimmage = gameSim.scrimmage;
		this.o = gameSim.o;
		this.d = gameSim.d;
		this.isClockRunning = gameSim.isClockRunning;
		this.awaitingKickoff = gameSim.awaitingKickoff;
		this.awaitingAfterSafety = gameSim.awaitingAfterSafety;
		this.awaitingAfterTouchdown = gameSim.awaitingAfterTouchdown;
		this.overtimeState = gameSim.overtimeState;
		this.twoPointConversionTeam = gameSim.twoPointConversionTeam;
		this.pts = pts;
		this.numPossessionChanges = 0;
	}

	clone() {
		return new State(this, this.pts);
	}

	possessionChange() {
		if (this.overtimeState === "firstPossession") {
			this.overtimeState = "secondPossession";
		} else if (this.overtimeState === "secondPossession") {
			this.overtimeState = "bothTeamsPossessed";
		}

		this.scrimmage = 100 - this.scrimmage;
		this.o = this.o === 1 ? 0 : 1;
		this.d = this.o === 1 ? 0 : 1;
		this.newFirstDown();
		this.isClockRunning = false;

		this.numPossessionChanges += 1;
	}

	newFirstDown() {
		this.down = 1;
		this.toGo = Math.min(10, 100 - this.scrimmage);
	}
}

const getPts = (event: PlayEvent, twoPointConversion: boolean) => {
	let pts;
	if (event.type.endsWith("TD")) {
		pts = twoPointConversion ? 2 : 6;
	} else if (event.type === "xp") {
		pts = 1;
	} else if (event.type === "fg") {
		pts = 3;
	} else if (event.type === "defSft") {
		pts = 2;
	}

	return pts;
};

class Play {
	g: GameSim;
	events: {
		event: PlayEvent;
		statChanges: StatChange[];
	}[];
	state: {
		initial: State;
		current: State;
	};
	penaltyRollbacks: {
		state: State;
		indexEvent: number;
	}[];
	afterLastCleanHandsChangeOfPossession?: {
		state: State;
		indexEvent: number;
	};

	constructor(gameSim: GameSim) {
		this.g = gameSim;
		this.events = [];

		const initialState = new State(gameSim, [
			gameSim.team[0].stat.pts,
			gameSim.team[1].stat.pts,
		]);
		this.state = {
			initial: initialState,
			current: initialState.clone(),
		};
		this.penaltyRollbacks = [];
	}

	boundedYds(yds: number, swap?: boolean) {
		const scrimmage = swap
			? 100 - this.state.current.scrimmage
			: this.state.current.scrimmage;
		const ydsTD = 100 - scrimmage;
		const ydsSafety = -scrimmage;

		if (yds > ydsTD) {
			return ydsTD;
		}

		if (yds < ydsSafety) {
			return ydsSafety;
		}

		return yds;
	}

	// state is state immedaitely before this event happens. But since possession changes happen only in discrete events, state.o is always the team with the ball, even for things like "int" and "kr"
	getStatChanges(event: PlayEvent, state: State) {
		const statChanges: StatChange[] = [];

		// No tracking stats during 2 point conversion attempt
		if (!state.awaitingAfterTouchdown || event.type === "xp") {
			if (event.type === "penalty") {
				const actualPenYds =
					event.name === "Pass interference" ? event.spotYds : event.penYds;

				statChanges.push([event.t, event.p, "pen"]);
				statChanges.push([event.t, event.p, "penYds", actualPenYds]);
			}
			if (event.type === "kr") {
				statChanges.push([state.o, event.p, "kr"]);
				statChanges.push([state.o, event.p, "krYds", event.yds]);
				statChanges.push([state.o, event.p, "krLng", event.yds]);
			} else if (event.type === "onsideKickRecovery") {
				if (!event.success) {
					statChanges.push([state.o, event.p, "kr"]);
					statChanges.push([state.o, event.p, "krYds", event.yds]);
					statChanges.push([state.o, event.p, "krLng", event.yds]);
				}
			} else if (event.type === "krTD") {
				statChanges.push([state.o, event.p, "krTD"]);
			} else if (event.type === "p") {
				const kickTo = state.scrimmage + event.yds;
				if (kickTo > 80 && kickTo < 100) {
					statChanges.push([state.o, event.p, "pntIn20"]);
				}
			} else if (event.type === "touchbackPunt") {
				statChanges.push([state.d, event.p, "pntTB"]);
			} else if (event.type === "pr") {
				statChanges.push([state.o, event.p, "pr"]);
				statChanges.push([state.o, event.p, "prYds", event.yds]);
				statChanges.push([state.o, event.p, "prLng", event.yds]);
			} else if (event.type === "prTD") {
				statChanges.push([state.o, event.p, "prTD"]);
			} else if (event.type === "rus") {
				statChanges.push([state.o, event.p, "rus"]);
				statChanges.push([state.o, event.p, "rusYds", event.yds]);
				statChanges.push([state.o, event.p, "rusLng", event.yds]);
			} else if (event.type === "rusTD") {
				statChanges.push([state.o, event.p, "rusTD"]);
			} else if (event.type === "kneel") {
				statChanges.push([state.o, event.p, "rus"]);
				statChanges.push([state.o, event.p, "rusYds", event.yds]);
				statChanges.push([state.o, event.p, "rusLng", event.yds]);
			} else if (event.type === "sk") {
				statChanges.push([state.o, event.qb, "pssSk"]);
				statChanges.push([state.o, event.qb, "pssSkYds", Math.abs(event.yds)]);
				statChanges.push([state.d, event.p, "defSk"]);
			} else if (event.type === "pss") {
				statChanges.push([state.o, event.qb, "pss"]);
				statChanges.push([state.o, event.target, "tgt"]);
			} else if (event.type === "pssCmp") {
				statChanges.push([state.o, event.qb, "pssCmp"]);
				statChanges.push([state.o, event.qb, "pssYds", event.yds]);
				statChanges.push([state.o, event.qb, "pssLng", event.yds]);
				statChanges.push([state.o, event.target, "rec"]);
				statChanges.push([state.o, event.target, "recYds", event.yds]);
				statChanges.push([state.o, event.target, "recLng", event.yds]);
			} else if (event.type === "pssInc") {
				if (event.defender) {
					statChanges.push([state.d, event.defender, "defPssDef"]);
				}
			} else if (event.type === "pssTD") {
				statChanges.push([state.o, event.qb, "pssTD"]);
				statChanges.push([state.o, event.target, "recTD"]);
			} else if (event.type === "int") {
				statChanges.push([state.d, event.qb, "pssInt"]);
				statChanges.push([state.o, event.defender, "defPssDef"]);
				statChanges.push([state.o, event.defender, "defInt"]);
				statChanges.push([
					state.o,
					event.defender,
					"defIntYds",
					event.ydsReturn,
				]);
				statChanges.push([
					state.o,
					event.defender,
					"defIntLng",
					event.ydsReturn,
				]);
			} else if (event.type === "intTD") {
				statChanges.push([state.o, event.p, "defIntTD"]);
			} else if (event.type === "fg" || event.type === "xp") {
				let statAtt;
				let statMade;
				if (event.type === "xp") {
					statAtt = "xpa";
					statMade = "xp";
				} else if (event.distance < 20) {
					statAtt = "fga0";
					statMade = "fg0";
				} else if (event.distance < 30) {
					statAtt = "fga20";
					statMade = "fg20";
				} else if (event.distance < 40) {
					statAtt = "fga30";
					statMade = "fg30";
				} else if (event.distance < 50) {
					statAtt = "fga40";
					statMade = "fg40";
				} else {
					statAtt = "fga50";
					statMade = "fg50";
				}

				statChanges.push([state.o, event.p, statAtt]);
				if (event.made) {
					statChanges.push([state.o, event.p, statMade]);

					if (event.type !== "xp") {
						statChanges.push([state.o, event.p, "fgLng", event.distance]);
					}
				}
			} else if (event.type === "fmb") {
				statChanges.push([state.o, event.pFumbled, "fmb"]);
				statChanges.push([state.d, event.pForced, "defFmbFrc"]);
			} else if (event.type === "fmbRec") {
				statChanges.push([state.o, event.pRecovered, "defFmbRec"]);

				if (event.lost) {
					statChanges.push([state.d, event.pFumbled, "fmbLost"]);
				}

				statChanges.push([state.o, event.pRecovered, "defFmbYds", event.yds]);
				statChanges.push([state.o, event.pRecovered, "defFmbLng", event.yds]);
			} else if (event.type === "fmbTD") {
				statChanges.push([state.o, event.p, "defFmbTD"]);
			} else if (event.type === "defSft") {
				statChanges.push([state.d, event.p, "defSft"]);
			}
		}

		// Scoring
		const pts = getPts(event, state.twoPointConversionTeam !== undefined);
		if (pts !== undefined) {
			statChanges.push([state.o, undefined, "pts", pts]);
		}

		return statChanges;
	}

	updateState(state: State, event: PlayEvent) {
		const afterKickoff = () => {
			if (state.overtimeState === "initialKickoff") {
				state.overtimeState = "firstPossession";
			}
		};

		if (event.type === "penalty") {
			const side = state.o === event.t ? "off" : "def";
			const firstDownLine = state.scrimmage + state.toGo;

			const penYdsSigned = side === "off" ? -event.penYds : event.penYds;

			if (event.spotYds !== undefined) {
				// Spot foul, apply penalty from here
				state.scrimmage += event.spotYds;
			}

			// Adjust penalty yards when near endzones
			if (side === "def" && state.scrimmage + penYdsSigned > 99) {
				// 1 yard line
				state.scrimmage = 99;
			} else if (side === "off" && state.scrimmage / 2 < event.penYds) {
				// Half distance to goal
				state.scrimmage = Math.round(state.scrimmage / 2);
			} else {
				state.scrimmage += penYdsSigned;
			}

			state.toGo = firstDownLine - state.scrimmage;

			if (event.automaticFirstDown) {
				state.newFirstDown();
			}
		} else if (event.type === "possessionChange") {
			state.scrimmage += event.yds;
			state.possessionChange();

			if (event.kickoff) {
				state.awaitingKickoff = undefined;
				state.awaitingAfterSafety = false;

				afterKickoff();
			}
		} else if (event.type === "k" || event.type === "onsideKick") {
			state.down = 1;
			state.toGo = 10;
			state.scrimmage = 100 - event.kickTo;
		} else if (event.type === "touchbackKick") {
			state.down = 1;
			state.toGo = 10;
			state.scrimmage = 25;
		} else if (event.type === "kr") {
			state.scrimmage += event.yds;
		} else if (event.type === "onsideKickRecovery") {
			state.scrimmage += event.yds;
			state.awaitingKickoff = undefined;
			state.awaitingAfterSafety = false;
		} else if (event.type === "p") {
			state.down = 1;
			state.toGo = 10;
			state.scrimmage += event.yds;
		} else if (event.type === "touchbackPunt") {
			state.down = 1;
			state.toGo = 10;
			state.scrimmage = 20;
		} else if (event.type === "pr") {
			state.scrimmage += event.yds;
		} else if (event.type === "rus") {
			state.down += 1;
			state.scrimmage += event.yds;
			state.toGo -= event.yds;
			state.isClockRunning = Math.random() < 0.85;
		} else if (event.type === "kneel") {
			state.down += 1;
			state.scrimmage += event.yds;
			state.toGo -= event.yds;

			// Set this to false, because we handle it all in dt
			state.isClockRunning = false;
		} else if (event.type === "sk") {
			state.down += 1;
			state.scrimmage += event.yds;
			state.toGo -= event.yds;
			state.isClockRunning = Math.random() < 0.98;
		} else if (event.type === "pssCmp") {
			state.down += 1;
			state.scrimmage += event.yds;
			state.toGo -= event.yds;
			state.isClockRunning = Math.random() < 0.75;
		} else if (event.type === "pssInc") {
			state.down += 1;
			state.isClockRunning = false;
		} else if (event.type === "int") {
			state.scrimmage -= event.ydsReturn;
		} else if (event.type === "fg" || event.type === "xp") {
			if (!event.made && event.type !== "xp") {
				state.down += 1;
				state.scrimmage -= 7;
			}

			if (event.type === "xp" || event.made) {
				state.awaitingKickoff = this.state.initial.o;
			}

			state.awaitingAfterTouchdown = false;
			state.isClockRunning = false;
		} else if (event.type === "twoPointConversion") {
			state.twoPointConversionTeam = event.t;
			state.down = 1;
			state.scrimmage = 98;
		} else if (event.type === "twoPointConversionDone") {
			// Reset off/def teams in case there was a turnover during the conversion attempt
			state.o = event.t;
			state.d = state.o === 0 ? 1 : 0;

			state.twoPointConversionTeam = undefined;
			state.awaitingKickoff = event.t;
			state.awaitingAfterTouchdown = false;
			state.isClockRunning = false;
		} else if (event.type === "defSft") {
			state.awaitingKickoff = state.o;
			state.awaitingAfterSafety = true;
			state.isClockRunning = false;
		} else if (event.type === "fmbRec") {
			if (event.lost) {
				state.isClockRunning = false;
			} else {
				// Stops if fumbled out of bounds
				state.isClockRunning = Math.random() > 0.05;
			}
		}

		if (event.type.endsWith("TD")) {
			state.awaitingAfterTouchdown = true;
			state.isClockRunning = false;
		}

		if (state.toGo <= 0) {
			state.newFirstDown();
		}

		let td = false;
		let safety = false;
		let touchback = false;

		const TOUCHDOWN_IS_POSSIBLE: PlayType[] = [
			"kr",
			"onsideKickRecovery",
			"pr",
			"rus",
			"pssCmp",
			"int",
			"fmb",
		];

		if (state.scrimmage >= 100 && TOUCHDOWN_IS_POSSIBLE.includes(event.type)) {
			td = true;
		}

		const TOUCHBACK_IS_POSSIBLE: PlayType[] = ["p", "int"];

		if (state.scrimmage <= 0 && TOUCHBACK_IS_POSSIBLE.includes(event.type)) {
			touchback = true;
		}

		const SAFETY_IS_POSSIBLE: PlayType[] = ["rus", "pss", "sk"];

		if (state.scrimmage <= 0 && SAFETY_IS_POSSIBLE.includes(event.type)) {
			safety = true;
		}

		if (event.type === "fmbRec") {
			if (state.scrimmage <= 0) {
				if (event.lost) {
					state.scrimmage = 20;
					touchback = true;
				} else {
					safety = true;
				}

				state.isClockRunning = false;
			}
		}

		const turnoverOnDowns = !safety && !td && !touchback && state.down > 4;
		if (turnoverOnDowns) {
			state.possessionChange();
		}

		if (event.type.endsWith("TD")) {
			if (
				state.overtimeState === "initialKickoff" ||
				state.overtimeState === "firstPossession"
			) {
				state.overtimeState = "over";
			}
		} else if (event.type === "defSft") {
			if (
				state.overtimeState === "initialKickoff" ||
				state.overtimeState === "firstPossession"
			) {
				state.overtimeState = "over";
			}
		}

		const pts = getPts(event, state.twoPointConversionTeam !== undefined);
		if (pts !== undefined) {
			const t = (event as any).t as TeamNum;
			state.pts[t] += pts;

			if (state.overtimeState === "secondPossession") {
				const t2 = t === 0 ? 1 : 0;

				if (state.pts[t] > state.pts[t2]) {
					state.overtimeState = "over";
				}
			}

			if (pts === 2) {
				if (state.overtimeState === "secondPossession") {
					const t2 = t === 0 ? 1 : 0;

					if (state.pts[t] > state.pts[t2]) {
						state.overtimeState = "over";
					}
				}
			}
		}

		return {
			safety,
			td,
			touchback,
			turnoverOnDowns,
		};
	}

	addEvent(event: PlayEvent) {
		const statChanges = this.getStatChanges(event, this.state.current);

		if (event.type === "penalty") {
			if (event.spotYds !== undefined) {
				// Spot foul? Assess at the spot of the foul
				this.penaltyRollbacks.push({
					state: this.state.current.clone(),
					indexEvent: this.events.length,
				});
			} else {
				// Either assess from initial scrimmage, or the last change of possession if the penalty is after that
				if (this.afterLastCleanHandsChangeOfPossession) {
					this.penaltyRollbacks.push({
						state: this.afterLastCleanHandsChangeOfPossession.state.clone(),
						indexEvent: this.afterLastCleanHandsChangeOfPossession.indexEvent,
					});
				} else {
					this.penaltyRollbacks.push({
						state: this.state.initial.clone(),
						indexEvent: 0,
					});
				}
			}

			this.events.push({
				event,
				statChanges,
			});

			return {
				safety: undefined,
				td: undefined,
				touchback: undefined,
				turnoverOnDowns: false,
			};
		}

		for (const statChange of statChanges) {
			this.g.recordStat(...statChange);
		}
		this.events.push({
			event,
			statChanges,
		});

		const offenseBefore = this.state.current.o;

		const info = this.updateState(this.state.current, event);

		const offenseAfter = this.state.current.o;

		if (offenseAfter !== offenseBefore) {
			// "Clean hands" means that a change of possession occurred while the team gaining possession had no prior penalties on this play
			const cleanHands = this.events.every(
				event =>
					event.event.type !== "penalty" || event.event.t !== offenseAfter,
			);

			if (cleanHands) {
				this.afterLastCleanHandsChangeOfPossession = {
					state: this.state.current.clone(),
					indexEvent: this.events.length,
				};
			}
		}

		return info;
	}

	get numPenalties() {
		return this.penaltyRollbacks.length;
	}

	adjudicatePenalties() {
		const penalties = this.events.filter(
			event => event.event.type === "penalty",
		) as {
			event: Extract<PlayEvent, { type: "penalty" }>;
			statChanges: StatChange[];
		}[];

		if (penalties.length === 0) {
			return;
		}

		// Each entry in options is a set of decisions on all the penalties. So the inner arrays have the same length as penalties.length
		let options: ("decline" | "accept")[][] | undefined;
		let choosingTeam: TeamNum | undefined;
		if (penalties.length === 1) {
			options = [["decline"], ["accept"]];
			choosingTeam = penalties[0].event.t === 0 ? 1 : 0;
		} else if (penalties.length === 2) {
			if (penalties[0].event.t === penalties[1].event.t) {
				// Same team - other team gets to pick which they want to accept, if any
				console.log("2 penalties - same team", penalties, this.events);
				options = [
					["decline", "decline"],
					["decline", "accept"],
					["accept", "decline"],
				];
				choosingTeam = penalties[0].event.t === 0 ? 1 : 0;
			} else {
				// Different team - maybe offsetting? Many edge cases
				console.log("2 penalties - different teams");
			}
		} else {
			throw new Error("Not supported");
		}

		if (options !== undefined && choosingTeam !== undefined) {
			const results = options.map(decisions => {
				const indexAccept = decisions.indexOf("accept");
				const penalty = penalties[indexAccept];

				console.log("decisions", decisions);

				let indexEvent: number | undefined;
				let state;
				if (indexAccept < 0) {
					state = this.state.current;
				} else {
					const penaltyRollback = this.penaltyRollbacks[indexAccept];
					console.log(
						"penaltyRollback",
						JSON.parse(JSON.stringify(penaltyRollback)),
					);
					console.log("penalty.event", penalty.event);
					state = penaltyRollback.state;
					indexEvent = penaltyRollback.indexEvent;
					console.log("state.scrimmage before applying", state.scrimmage);
					this.updateState(state, penalty.event);
					console.log("state.scrimmage after applying", state.scrimmage);
				}

				return {
					indexAccept,
					decisions,
					state,
					indexEvent,
					statChanges: penalty?.statChanges ?? [],
				};
			});

			const result = getBestPenaltyResult(
				results,
				this.state.initial,
				this.state.current,
				choosingTeam,
			);

			if (result.decisions.length > 1) {
				this.g.playByPlay.logEvent("penaltyCount", {
					clock: this.g.clock,
					count: result.decisions.length,
				});
			}

			// Announce declind penalties first, then accepted penalties
			for (const type of ["decline", "accept"] as const) {
				for (let i = 0; i < penalties.length; i++) {
					const decision = result.decisions[i];
					if (decision !== type) {
						continue;
					}
					const penalty = penalties[i];

					this.g.playByPlay.logEvent("penalty", {
						clock: this.g.clock,
						decision,
						t: penalty.event.t,
						names: penalty.event.p ? [penalty.event.p.name] : [],
						automaticFirstDown: penalty.event.automaticFirstDown,
						penaltyName: penalty.event.name,
						yds: penalty.event.penYds,
					});
				}
			}

			// Actually apply result of accepted penalty - ASSUMES JUST ONE IS ACCEPTED
			this.state.current = result.state;

			if (result.indexAccept >= 0) {
				const statChanges = [
					// Apply statChanges from accepted penalty
					...result.statChanges,

					// Apply negative statChanges from anything after accepted penalty
					...flatten(
						this.events
							.filter(
								(event, i) =>
									result.indexEvent === undefined || i > result.indexEvent,
							)
							.map(event => event.statChanges)
							.map(statChanges => {
								return statChanges.map(statChange => {
									const newStatChange = [...statChange] as StatChange;
									if (newStatChange[3] === undefined) {
										newStatChange[3] = 1;
									}
									newStatChange[3] = -newStatChange[3];
									return newStatChange;
								});
							}),
					),
				];

				for (const statChange of statChanges) {
					this.g.recordStat(...statChange);
				}
			}
		}
	}

	commit() {
		this.adjudicatePenalties();

		const {
			down,
			toGo,
			scrimmage,
			o,
			d,
			isClockRunning,
			awaitingKickoff,
			awaitingAfterSafety,
			awaitingAfterTouchdown,
			overtimeState,
			twoPointConversionTeam,
		} = this.state.current;

		this.g.down = down;
		this.g.toGo = toGo;
		this.g.scrimmage = scrimmage;
		this.g.o = o;
		this.g.d = d;
		this.g.isClockRunning = isClockRunning;
		this.g.awaitingKickoff = awaitingKickoff;
		this.g.awaitingAfterSafety = awaitingAfterSafety;
		this.g.awaitingAfterTouchdown = awaitingAfterTouchdown;
		this.g.overtimeState = overtimeState;
		this.g.twoPointConversionTeam = twoPointConversionTeam;
	}
}

export default Play;