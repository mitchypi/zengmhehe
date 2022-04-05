import type { Position } from "../../../common/types.baseball";
import type { PlayerGameSim, TeamGameSim } from "./types";

type GamePositions<DH extends boolean> =
	| Exclude<Position, "SP" | "RP" | "DH">
	| "P"
	| (DH extends true ? "DH" : never);

type PlayerInGame<DH extends boolean> = {
	p: PlayerGameSim;
	battingOrder: number;
	pos: GamePositions<DH>;
};

const NUM_BATTERS_PER_SIDE = 9;

class Team<DH extends boolean> {
	t: TeamGameSim;
	dh: DH;
	playersInGame: Record<number, PlayerInGame<DH>>;
	playersInGameByPos: Record<GamePositions<DH>, PlayerInGame<DH>>;
	playersInGameByBattingOrder: [
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
		PlayerInGame<DH>,
	];

	atBat: number;
	subIndex: number;

	constructor(t: TeamGameSim, dh: DH) {
		this.t = t;
		this.dh = dh;

		this.playersInGame = {};

		// Starting pitcher
		const starter = this.t.depth.P[0];

		// Starting position players
		const lineup = this.dh ? this.t.depth.L : this.t.depth.LP;
		const numPositionPlayers = this.dh
			? NUM_BATTERS_PER_SIDE
			: NUM_BATTERS_PER_SIDE - 1;
		for (let i = 0; i < numPositionPlayers; i++) {
			const p = lineup[i];
			if (!p) {
				throw new Error("Not enough players");
			}

			if (p.id === -1) {
				this.playersInGame[starter.id] = {
					p: starter,
					battingOrder: i,
					pos: "P",
				};
			} else {
				this.playersInGame[p.id] = {
					p,
					battingOrder: i,
					pos: p.lineupPos as any,
				};
			}
		}
		if (dh) {
			this.playersInGame[starter.id] = {
				p: starter,
				battingOrder: -1,
				pos: "P",
			};
		}

		this.atBat = -1;
		this.subIndex = -1;

		this.playersInGameByPos = {} as any;
		this.playersInGameByBattingOrder = [] as any;
		this.rebuildIndexes();
	}

	rebuildIndexes() {
		for (const playerInGame of Object.values(this.playersInGame)) {
			this.playersInGameByPos[playerInGame.pos] = playerInGame;
			if (playerInGame.battingOrder >= 0) {
				this.playersInGameByBattingOrder[playerInGame.battingOrder] =
					playerInGame;

				playerInGame.p.battingOrder = playerInGame.battingOrder;
			}

			if (playerInGame.p.subIndex === undefined) {
				this.subIndex += 1;
				playerInGame.p.subIndex = this.subIndex;
				console.log(
					"playerInGame",
					playerInGame.p,
					playerInGame.p.subIndex,
					playerInGame.p.battingOrder,
				);
			}
		}
	}

	getBatter() {
		return this.playersInGameByBattingOrder[this.atBat];
	}

	getOnDeck() {
		return this.playersInGameByBattingOrder[
			(this.atBat + 1) % NUM_BATTERS_PER_SIDE
		];
	}

	getPitcher() {
		return this.playersInGameByPos.P;
	}

	advanceToNextBatter() {
		this.atBat = (this.atBat + 1) % NUM_BATTERS_PER_SIDE;
	}
}

export default Team;
