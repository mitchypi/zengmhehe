// @flow

import Promise from 'bluebird';
import {PHASE, g} from '../../common';
import * as helpers from '../../util/helpers';
import * as api from '../api';
import {lock} from '../util';

/**
* Update play menu options based on game state.
*
* @memberOf ui
* @return {Promise}
*/
const updatePlayMenu = async () => {
    const allOptions: {
        [key: string]: {
            id?: string,
            label: string,
            url?: string,
        }
    } = {
        stop: {label: "Stop"},
        day: {label: "One day"},
        week: {label: "One week"},
        month: {label: "One month"},
        untilPlayoffs: {label: "Until playoffs"},
        throughPlayoffs: {label: "Through playoffs"},
        dayLive: {url: helpers.leagueUrl(["live"]), label: "One day (live)"},
        untilDraft: {label: "Until draft"},
        viewDraft: {url: helpers.leagueUrl(["draft"]), label: "View draft"},
        untilResignPlayers: {label: "Re-sign players with expiring contracts"},
        untilFreeAgency: {label: "Until free agency"},
        untilPreseason: {label: "Until preseason"},
        untilRegularSeason: {label: "Until regular season"},
        contractNegotiation: {url: helpers.leagueUrl(["negotiation"]), label: "Continue contract negotiation"},
        contractNegotiationList: {url: helpers.leagueUrl(["negotiation"]), label: "Continue re-signing players"},
        message: {url: helpers.leagueUrl(["message"]), label: "Read new message"},
        newLeague: {url: "/new_league", label: "Try again in a new league"},
        newTeam: {url: helpers.leagueUrl(["new_team"]), label: "Try again with a new team"},
        abortPhaseChange: {label: "Abort"},
        stopAuto: {label: `Stop auto play (${g.autoPlaySeasons} seasons left)`},
    };

    let keys = [];
    if (g.phase === PHASE.PRESEASON) {
        // Preseason
        keys = ["untilRegularSeason"];
    } else if (g.phase === PHASE.REGULAR_SEASON) {
        // Regular season - pre trading deadline
        keys = ["day", "dayLive", "week", "month", "untilPlayoffs"];
    } else if (g.phase === PHASE.AFTER_TRADE_DEADLINE) {
        // Regular season - post trading deadline
        keys = ["day", "dayLive", "week", "month", "untilPlayoffs"];
    } else if (g.phase === PHASE.PLAYOFFS) {
        // Playoffs
        keys = ["day", "dayLive", "week", "month", "throughPlayoffs"];
    } else if (g.phase === PHASE.BEFORE_DRAFT) {
        // Offseason - pre draft
        keys = ["untilDraft"];
    } else if (g.phase === PHASE.DRAFT || g.phase === PHASE.FANTASY_DRAFT) {
        // Draft
        keys = ["viewDraft"];
    } else if (g.phase === PHASE.AFTER_DRAFT) {
        // Offseason - post draft
        keys = ["untilResignPlayers"];
    } else if (g.phase === PHASE.RESIGN_PLAYERS) {
        // Offseason - re-sign players
        keys = ["contractNegotiationList", "untilFreeAgency"];
    } else if (g.phase === PHASE.FREE_AGENCY) {
        // Offseason - free agency
        keys = ["day", "week", "untilPreseason"];
    }

    const [unreadMessage, negotiationInProgress] = await Promise.all([
        lock.unreadMessage(),
        lock.negotiationInProgress(),
    ]);

    if (unreadMessage) {
        keys = ["message"];
    }
    if (g.gamesInProgress) {
        keys = ["stop"];
    }
    if (negotiationInProgress && g.phase !== PHASE.RESIGN_PLAYERS) {
        keys = ["contractNegotiation"];
    }
    if (g.phaseChangeInProgress) {
        keys = ["abortPhaseChange"];
    }

    // If there is an unread message, it's from the owner saying the player is fired, so let the user see that first.
    if (g.gameOver && !unreadMessage) {
        keys = ["newTeam", "newLeague"];
    }

    if (g.autoPlaySeasons > 0) {
        keys = ["stopAuto"];
    }

    const someOptions = keys.map(id => {
        allOptions[id].id = id;
        return allOptions[id];
    });

    api.emit('updateTopMenu', {options: someOptions});
};

export default updatePlayMenu;
