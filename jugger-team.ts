import { HTMLElement } from 'node-html-parser';

export default class JuggerTeam {
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

  toString() {
    return `JuggerTeam(${this.name}, ${this.slug}, ${this.elo}})`;
  }

  toJSON() {
    return {
      name: this.name,
      slug: this.slug,
      elo: this.elo,
      numMatchesPlayed: this.numMatchesPlayed,
    };
  }

  static getTeamSlug($teamLink: HTMLElement): string {
    const href = $teamLink.getAttribute('href');
    if (href === undefined) {
      throw new Error('team href is undefined');
    }
    const slug = href.split('/').pop();
    if (slug === undefined) {
      throw new Error('team slug is undefined');
    }
    return slug;
  }

  static fromTugenyHtml($teamLink: HTMLElement): JuggerTeam {
    const name = $teamLink.textContent;
    const slug = JuggerTeam.getTeamSlug($teamLink);
    return new JuggerTeam(name, slug);
  }
}
