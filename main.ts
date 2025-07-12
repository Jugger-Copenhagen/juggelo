import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import util from 'util';

import fetch from 'node-fetch';
import { HTMLElement, parse } from 'node-html-parser';
import JuggerMatch from './jugger-match.ts';
import JuggerTeam from './jugger-team.ts';
import JuggerTournament from './jugger-tournament.ts';

const BASE_URL = 'https://tugeny.org';
const CACHE_DIR = 'cache';

// also includes tournaments that for whatever reason have no "finished" matches
const NON_JUGGER_TOURNAMENTS = ['1-smash-brothers-turnier-zu-muenster','2-paderborner-drei-hasen-cup','2-schattentanz','rookie-spieltag-in-leipzig'];

const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

class JuggerRanking {}

class JuggerElo extends JuggerRanking {}

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

  const $$tournaments = allTournamentsPage.querySelectorAll(
    'li.list-published__single-tournament a'
  );

  return $$tournaments
    .map(JuggerTournament.fromTugenyHtml)
    .filter((tournament) => !NON_JUGGER_TOURNAMENTS.includes(tournament.slug));
}

async function getTeamsForTournament(tournament: JuggerTournament): Promise<JuggerTeam[]> {
  const tournamentAllTeamsPage = await fetchHtmlDocument(
    `/tournaments/${tournament.slug}/all-teams`
  );

  const $$teams = tournamentAllTeamsPage.querySelectorAll('li.view-tournament__single-team a');

  return $$teams.map(JuggerTeam.fromTugenyHtml);
}

async function getMatchesForTournament(
  tournament: JuggerTournament,
  teams: Map<string, JuggerTeam>
): Promise<JuggerMatch[]> {
  const tournamentAllMatchesPage = await fetchHtmlDocument(
    `/tournaments/${tournament.slug}/all-matches`
  );

  const $finishedMatchesHeader = tournamentAllMatchesPage.querySelector(
    '.accordion-item:first-child'
  );
  if ($finishedMatchesHeader === null) {
    return [];
  }

  const $$finishedMatches = $finishedMatchesHeader.querySelectorAll('li.view-match__single-match');

  return $$finishedMatches.map(($match) => JuggerMatch.fromTugenyHtml($match, teams));
}

(async () => {
  const allTournaments = await getPastJuggerTournaments();

  const teams = new Map<string, JuggerTeam>();
  for (const tournament of allTournaments) {
    const tournamentTeams = await getTeamsForTournament(tournament);
    for (const team of tournamentTeams) {
      teams.set(team.slug, team);
    }
  }

  for (const tournament of allTournaments) {
    const matches = await getMatchesForTournament(tournament, teams);
    for (const match of matches) {
      if (match.teams[0].name === '-' || match.teams[1].name === '-') {
        continue;
      }
      match.play();
    }
  }

  const teamsArray = Array.from(teams.values());
  teamsArray.sort((a, b) => b.elo - a.elo);
  console.log('team,elo,matchesPlayed');
  for (const team of teamsArray) {
    if (team.name === '-') {
      continue;
    }
    console.log(`${team.name},${team.elo},${team.numMatchesPlayed}`);
  }
})();
