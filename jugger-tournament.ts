import { HTMLElement } from 'node-html-parser';

export default class JuggerTournament {
  public readonly name: string;
  public readonly slug: string;

  constructor(name: string, slug: string) {
    this.name = name;
    this.slug = slug;
  }

  toString() {
    return `JuggerTournament(${this.name}, ${this.slug})`;
  }

  toJSON() {
    return {
      name: this.name,
      slug: this.slug,
    };
  }

  static fromTugenyHtml($tournamentLink: HTMLElement): JuggerTournament {
    const textContent = $tournamentLink.textContent;
    const [name, dates] = textContent.split(' | ');
    if (dates === undefined) {
      throw new Error('tournament dates are undefined');
    }
    // TODO: we could parse dates here as well...

    const href = $tournamentLink.getAttribute('href');
    if (href === undefined) {
      throw new Error('tournament href is undefined');
    }
    const slug = href.split('/')[2];
    return new JuggerTournament(name, slug);
  }
}
