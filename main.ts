import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import util from 'util';

import fetch from 'node-fetch';
import { HTMLElement, parse } from 'node-html-parser';

const BASE_URL = 'https://tugeny.org';
const CACHE_DIR = 'cache';

const NON_JUGGER_TOURNAMENTS = ['1-smash-brothers-turnier-zu-muenster'];

const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

class JuggerTournament {
  public readonly name: string;
  public readonly slug: string;

  constructor(name: string, slug: string) {
    this.name = name;
    this.slug = slug;
  }
}

class JuggerMatch {
  public readonly team1: JuggerTeam;
  public readonly points1: number;
  public readonly team2: JuggerTeam;
  public readonly points2: number;

  constructor(team1: JuggerTeam, points1: number, team2: JuggerTeam, points2: number) {
    this.team1 = team1;
    this.points1 = points1;
    this.team2 = team2;
    this.points2 = points2;
  }

  private winner(): JuggerTeam | null {
    if (this.points1 > this.points2) {
      return this.team1;
    }
    if (this.points2 > this.points1) {
      return this.team2;
    }
    return null;
  }

  private opponent(team: JuggerTeam): JuggerTeam {
    return this.team1.equals(team) ? this.team2 : this.team1;
  }

  private matchActual(team: JuggerTeam): number {
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

  // TODO: take point differential into account
  play(): void {
    const a1 = this.matchActual(this.team1);
    const e1 = this.matchExpected(this.team1);

    const a2 = this.matchActual(this.team2);
    const e2 = this.matchExpected(this.team2);

    const k1 = this.team1.eloK();
    const delta1 = k1 * (a1 - e1);
    this.team1.adjustElo(delta1);

    const k2 = this.team2.eloK();
    const delta2 = k2 * (a2 - e2);
    this.team2.adjustElo(delta2);
  }
}

class JuggerTeam {
  // using FIDE system
  static DEFAULT_ELO = 1500;
  static EXPERT_ELO = 2400;
  static NEW_MATCHES = 30;

  static K_NEW_PLAYER = 40;
  static K_REGULAR_PLAYER = 20;
  static K_EXPERT_PLAYER = 10;

  public readonly name: string;
  public readonly slug: string;
  public elo: number;

  private eloMax: number;
  private numMatchesPlayed: number;

  constructor(name: string, slug: string) {
    this.name = name;
    this.slug = slug;
    this.elo = JuggerTeam.DEFAULT_ELO;
    this.eloMax = JuggerTeam.DEFAULT_ELO;
    this.numMatchesPlayed = 0;
  }

  equals(team: JuggerTeam): boolean {
    return this.slug === team.slug;
  }

  adjustElo(delta: number): void {
    this.numMatchesPlayed += 1;
    this.elo += delta;
    if (this.elo > this.eloMax) {
      this.eloMax = this.elo;
    }
  }

  eloK(): number {
    if (this.eloMax >= JuggerTeam.EXPERT_ELO) {
      return JuggerTeam.K_EXPERT_PLAYER;
    }
    if (this.numMatchesPlayed < JuggerTeam.NEW_MATCHES) {
      return JuggerTeam.K_NEW_PLAYER;
    }
    return JuggerTeam.K_REGULAR_PLAYER;
  }
}

async function fetchHtmlDocument(urlPath: string): Promise<HTMLElement> {
  const cacheFilename = crypto.createHash('md5').update(urlPath).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${cacheFilename}.html`);
  let html;

  if (fs.existsSync(cachePath)) {
    html = await readFile(cachePath, 'utf8');
  } else {
    const url = `${BASE_URL}${urlPath}`;
    const response = await fetch(url);
    html = await response.text();

    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, html, 'utf8');
  }

  return parse(html);
}

async function getPastJuggerTournaments(): Promise<JuggerTournament[]> {
  const allTournamentsPage = await fetchHtmlDocument('/');

  // allTournamentsPage.querySelectorAll('.');

  return [];
}

async function getTeamsForTournament(tournament: JuggerTournament): Promise<JuggerTeam[]> {
  return [];
}

async function getMatchesForTournament(tournament: JuggerTournament): Promise<JuggerMatch[]> {
  return [];
}

(async () => {
  const allTournaments = await getPastJuggerTournaments();

  console.log(allTournaments);

  /*
  // TODO: need to validate if teams have consistent names across tournaments
  const teams = new Map<string, JuggerTeam>();
  for (const tournament of allTournaments) {
    const tournamentTeams = await getTeamsForTournament(tournament);
    for (const team of tournamentTeams) {
      teams.set(team.slug, team);
    }
  }
  */
})();
