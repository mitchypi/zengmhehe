import bySport from "./bySport";

// This might not be comprehensive. It was first made for teamStats, and then later used in comparePlayers.
export const lowerIsBetter = new Set(
	bySport({
		baseball: [
			"lost",
			"otl",
			"cs",
			"so",
			"gdp",
			"era",
			"rPit",
			"er",
			"hPit",
			"2bPit",
			"3bPit",
			"hrPit",
			"bbPit",
			"pc",
			"ibbPit",
			"hbpPit",
			"shPit",
			"sfPit",
			"bk",
			"wp",
			"bf",
			"fip",
			"whip",
			"h9",
			"hr9",
			"bb9",
			"pc9",
			"oppPa",
			"oppAb",
			"oppR",
			"oppH",
			"opp2b",
			"opp3b",
			"oppHr",
			"oppRbi",
			"oppSb",
			"oppBb",
			"oppBa",
			"oppObp",
			"oppSlg",
			"oppOps",
			"oppTb",
			"oppHbp",
			"oppSh",
			"oppSf",
			"oppIbb",
			"oppMov",
			"oppCg",
			"oppSho",
			"oppSv",
			"oppIp",
			"oppSoPit",
			"oppBf",
			"oppSow",
		],
		basketball: [
			"lost",
			"otl",
			"tov",
			"pf",
			"oppFg",
			"oppFga",
			"oppFgp",
			"oppTp",
			"oppTpa",
			"oppTpp",
			"opp2p",
			"opp2pa",
			"opp2pp",
			"oppFt",
			"oppFta",
			"oppFtp",
			"oppOrb",
			"oppDrb",
			"oppTrb",
			"oppAst",
			"oppStl",
			"oppBlk",
			"oppPts",
			"oppMov",
			"pl",
			"drtg",
			"tovp",
			"oppFgAtRim",
			"oppFgaAtRim",
			"oppFgpAtRim",
			"oppFgLowPost",
			"oppFgaLowPost",
			"oppFgpLowPost",
			"oppFgMidRange",
			"oppFgaMidRange",
			"oppFgpMidRange",
			"oppDd",
			"oppTd",
			"oppQd",
			"oppFxf",
		],
		football: [
			"lost",
			"otl",
			"tov",
			"fmbLost",
			"pssInt",
			"pen",
			"penYds",
			"drivesTurnoverPct",
			"oppPts",
			"oppYds",
			"oppPly",
			"oppYdsPerPlay",
			"oppPssCmp",
			"oppPss",
			"oppPssYds",
			"oppPssTD",
			"oppPssNetYdsPerAtt",
			"oppRus",
			"oppRusYds",
			"oppRusTD",
			"oppRusYdsPerAtt",
			"oppDrives",
			"oppDrivesScoringPct",
			"oppAvgFieldPosition",
			"oppTimePerDrive",
			"oppPlaysPerDrive",
			"oppYdsPerDrive",
			"oppPtsPerDrive",
			"oppMov",
		],
		hockey: [
			"lost",
			"otl",
			"pim",
			"fol",
			"gv",
			"gaa",
			"oppG",
			"oppA",
			"oppEvG",
			"oppPpG",
			"oppShG",
			"oppEvA",
			"oppPpA",
			"oppShA",
			"oppS",
			"oppSPct",
			"oppTsa",
			"oppPpo",
			"oppPpPct",
			"oppFow",
			"oppFoPct",
			"oppBlk",
			"oppHit",
			"oppTk",
			"oppSv",
			"oppSvPct",
			"oppSo",
			"oppMov",
		],
	}),
);