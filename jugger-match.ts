import { HTMLElement } from 'node-html-parser';
import JuggerTeam from './jugger-team.ts';

/**
 * The type of a Jugger match.
 *
 * A single-set match is won by the team with most points.  This includes first-to-N matches
 * as well as timed matches.
 *
 * A multi-set match is won by the team that wins the most sets.  Note that it is possible to
 * score more points than the opponent and still lose the match (e.g. 5 : 4 | 1 : 5 | 5 : 4,
 * where team A wins on sets but team B scores more points).
 */
export enum JuggerMatchType {
  SINGLE_SET,
  MULTI_SET,
}

export type JuggerSet = [number, number];

export default class JuggerMatch {
  public readonly teams: [JuggerTeam, JuggerTeam];
  public readonly sets: JuggerSet[];
  public readonly type: JuggerMatchType;

  constructor(teams: [JuggerTeam, JuggerTeam], sets: JuggerSet[], type: JuggerMatchType) {
    this.teams = teams;
    this.sets = sets;
    this.type = type;
  }

  public pointsScored(): [number, number] {
    let [points1, points2] = [0, 0];
    for (const set of this.sets) {
      points1 += set[0];
      points2 += set[1];
    }
    return [points1, points2];
  }

  public setsWon(): [number, number] {
    let [sets1, sets2] = [0, 0];
    for (const set of this.sets) {
      if (set[0] > set[1]) {
        sets1 += 1;
      } else if (set[1] > set[0]) {
        sets2 += 1;
      }
    }
    return [sets1, sets2];
  }

  public winner(): JuggerTeam | null {
    let points;
    if (this.type === JuggerMatchType.SINGLE_SET) {
      points = this.pointsScored();
    } else {
      points = this.setsWon();
    }

    if (points[0] > points[1]) {
      return this.teams[0];
    }
    if (points[1] > points[0]) {
      return this.teams[1];
    }
    return null;
  }

  public opponent(team: JuggerTeam): JuggerTeam {
    return this.teams[0].equals(team) ? this.teams[1] : this.teams[0];
  }

  private matchActual(team: JuggerTeam): number {
    // TODO: take point differential into account
    const winner = this.winner();
    if (winner === null) {
      return 0.5;
    }
    if (team.equals(winner)) {
      return 1;
    }
    return 0;
  }

  private matchExpected(team: JuggerTeam): number {
    const opponent = this.opponent(team);
    const exponent = (opponent.elo - team.elo) / 400;
    return 1 / (1 + 10 ** exponent);
  }

  public play(): void {
    const a = this.teams.map(this.matchActual.bind(this));
    const e = this.teams.map(this.matchExpected.bind(this));
    const k = this.teams.map((team) => team.eloK());

    for (let i = 0; i < this.teams.length; i++) {
      const delta = k[i] * (a[i] - e[i]);
      this.teams[i].adjustElo(delta);
    }
  }

  private static parseMatchResults(matchResults: string): {
    sets: JuggerSet[];
    type: JuggerMatchType;
  } {
    const setsRaw = matchResults.trim().split(' | ');
    const type = setsRaw.length === 1 ? JuggerMatchType.SINGLE_SET : JuggerMatchType.MULTI_SET;

    const sets: JuggerSet[] = [];
    setsRaw.forEach((setRaw) => {
      const [setPoints1, setPoints2] = setRaw.split(' : ').map((points) => parseInt(points, 10));
      if (isNaN(setPoints1) || isNaN(setPoints2)) {
        /*
         * In best-of-3-sets games where one team wins the first two sets, the
         * third set is marked as "- : -". We ignore these sets.
         */
        return;
      }

      sets.push([setPoints1, setPoints2]);
    });

    return { sets, type };
  }

  public static fromTugenyHtml(
    $match: HTMLElement,
    allTeams: Map<string, JuggerTeam>
  ): JuggerMatch {
    const $$teams = $match.querySelectorAll('.view-match__teams a');
    if ($$teams.length !== 2) {
      throw new Error(`expected 2 teams, got ${$$teams.length}`);
    }

    const teams = $$teams.map(($team) => {
      const slug = JuggerTeam.getTeamSlug($team);
      const team = allTeams.get(slug);
      if (team === undefined) {
        throw new Error(`team ${slug} not found`);
      }

      return team;
    });

    const $results = $match.querySelector('.view-match__results');
    if ($results === null) {
      throw new Error('match results are undefined for ' + $match);
    }
    const { sets, type } = JuggerMatch.parseMatchResults($results.text);

    return new JuggerMatch(teams as [JuggerTeam, JuggerTeam], sets, type);
  }
}
