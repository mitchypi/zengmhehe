import PropTypes from "prop-types";
import React from "react";
import { getCols, helpers, setTitle } from "../util";
import { DataTable, NewWindowLink } from "../components";

const FamilyTrees = ({ players, stats, userTid }) => {
    setTitle("Family Trees");

    const superCols = [
        {
            title: "",
            colspan: 6,
        },
        {
            title: "Relatives",
            colspan: 4,
        },
        {
            title: "Best Season",
            colspan: 2 + stats.length,
        },
        {
            title: "Career Stats",
            colspan: stats.length,
        },
    ];

    const cols = getCols(
        "Name",
        "Pos",
        "Drafted",
        "Retired",
        "Pick",
        "Peak Ovr",
        "Details",
        "# Fathers",
        "# Brothers",
        "# Sons",
        "Year",
        "Team",
        ...stats.map(stat => `stat:${stat}`),
        ...stats.map(stat => `stat:${stat}`),
    );

    const rows = players.map(p => {
        return {
            key: p.pid,
            data: [
                <a href={helpers.leagueUrl(["player", p.pid])}>{p.name}</a>,
                p.ratings[p.ratings.length - 1].pos,
                p.draft.year,
                p.retiredYear === Infinity ? null : p.retiredYear,
                p.draft.round > 0 ? `${p.draft.round}-${p.draft.pick}` : "",
                p.peakOvr,
                "Details",
                p.numFathers,
                p.numBrothers,
                p.numSons,
                p.bestStats.season,
                <a
                    href={helpers.leagueUrl([
                        "roster",
                        p.bestStats.abbrev,
                        p.bestStats.season,
                    ])}
                >
                    {p.bestStats.abbrev}
                </a>,
                ...stats.map(stat =>
                    helpers.roundStat(p.bestStats[stat], stat),
                ),
                ...stats.map(stat =>
                    helpers.roundStat(p.careerStats[stat], stat),
                ),
            ],
            classNames: {
                "table-danger": p.hof,
                "table-success": p.retiredYear === Infinity,
                "table-info": p.statsTids
                    .slice(0, p.statsTids.length - 1)
                    .includes(userTid),
            },
        };
    });

    return (
        <>
            <h1>
                Family Trees <NewWindowLink />
            </h1>

            <p>
                These are the players with a relative in the league. Click
                "Details" for a player to see his relatives.
            </p>

            <p>
                Players who have played for your team are{" "}
                <span className="text-info">highlighted in blue</span>. Active
                players are{" "}
                <span className="text-success">highlighted in green</span>. Hall
                of Famers are{" "}
                <span className="text-danger">highlighted in red</span>.
            </p>

            <DataTable
                cols={cols}
                defaultSort={[20, "desc"]}
                name="FamilyTrees"
                pagination
                rows={rows}
                superCols={superCols}
            />
        </>
    );
};

FamilyTrees.propTypes = {
    players: PropTypes.arrayOf(PropTypes.object).isRequired,
    stats: PropTypes.arrayOf(PropTypes.string).isRequired,
    userTid: PropTypes.number.isRequired,
};

export default FamilyTrees;
