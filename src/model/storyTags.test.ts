import { describe, expect, it } from 'vitest';
import { checkStory, findTags, parseTag, STAGE_SPOTS, type TagAssets } from './storyTags';

/** A small, fixed world to check tags against. */
const assets: TagAssets = {
  image: (key) => ['backgrounds/forest', 'characters/rena', 'characters/eji', 'characters/eji-angry', 'layers/sakura'].includes(key),
  sound: (key) => ['fire', 'bomb'].includes(key),
  song: (key) => key === 'knight',
  fx: (id) => ['campfire', 'heal-burst', 'moonlight'].includes(id),
  mood: (id) => ['flat', 'night'].includes(id),
  voice: (key) => key === 'witch',
};

const command = (tag: string) => {
  const result = parseTag(tag, assets);
  if (!('command' in result)) throw new Error(`expected a command for #${tag}, got ${JSON.stringify(result)}`);
  return result.command;
};

const problem = (tag: string) => {
  const result = parseTag(tag, assets);
  if (!('problem' in result)) throw new Error(`expected a problem for #${tag}, got ${JSON.stringify(result)}`);
  return result.problem;
};

describe('parseTag: pictures', () => {
  it('sets and removes the background', () => {
    expect(command('bg forest')).toEqual({ kind: 'bg', background: 'forest' });
    expect(command('bg none')).toEqual({ kind: 'bg', background: null });
    expect(problem('bg forrest')).toContain('no image "forrest" in images/backgrounds');
  });

  it('enters a character, with an emotion, and clears the stage', () => {
    expect(command('enter rena')).toEqual({ kind: 'enter', portrait: { character: 'rena', emotion: undefined } });
    expect(command('enter eji angry')).toEqual({ kind: 'enter', portrait: { character: 'eji', emotion: 'angry' } });
    expect(command('enter none')).toEqual({ kind: 'enter', portrait: null });
    expect(problem('enter eji sad')).toContain('no image "eji-sad"');
    expect(problem('enter none angry')).toContain('nothing can follow "none"');
  });

  it('takes a foreground key, backlit, none or a URL', () => {
    expect(command('foreground layers/sakura backlit')).toEqual({ kind: 'foreground', foreground: 'layers/sakura', backlit: true });
    expect(command('foreground none')).toEqual({ kind: 'foreground', foreground: null, backlit: false });
    expect(command('foreground https://example.com/a.png')).toMatchObject({ foreground: 'https://example.com/a.png' });
    expect(problem('foreground layers/sakura glowing')).toContain('can only be "backlit"');
  });
});

describe('parseTag: sound', () => {
  it('plays and stops music', () => {
    expect(command('music knight')).toEqual({ kind: 'music', song: 'knight' });
    expect(command('music stop')).toEqual({ kind: 'music', song: null });
    expect(problem('music palace')).toContain('no song "palace"');
  });

  it('loops ambience with a volume, and stops one or all', () => {
    expect(command('ambience fire')).toEqual({ kind: 'ambience', sound: 'fire', volume: 1 });
    expect(command('ambience fire 0.4')).toEqual({ kind: 'ambience', sound: 'fire', volume: 0.4 });
    expect(command('ambience fire stop')).toEqual({ kind: 'ambienceStop', sound: 'fire' });
    expect(command('ambience stop')).toEqual({ kind: 'ambienceStop' });
    expect(problem('ambience fire 2')).toContain('volume must be a number from 0 to 1');
    expect(problem('ambience wind')).toContain('no sound "wind"');
  });

  it('plays a sound once', () => {
    expect(command('sfx bomb')).toEqual({ kind: 'sfx', sound: 'bomb' });
    expect(problem('sfx boom')).toContain('no sound "boom"');
  });
});

describe('parseTag: lighting', () => {
  it('sets a mood with the default or a given fade', () => {
    expect(command('light night')).toEqual({ kind: 'light', mood: 'night', fade: 500 });
    expect(command('light night 2000')).toEqual({ kind: 'light', mood: 'night', fade: 2000 });
    expect(problem('light campfire')).toContain('no mood "campfire"');
    expect(problem('light night soon')).toContain('fade must be a number of ms');
  });
});

describe('parseTag: fx', () => {
  it('plays with a duration or forever', () => {
    expect(command('fx heal-burst')).toEqual({ kind: 'fx', id: 'heal-burst' });
    expect(command('fx heal-burst 800')).toEqual({ kind: 'fx', id: 'heal-burst', duration: 800 });
    expect(command('fx campfire infinite')).toEqual({ kind: 'fx', id: 'campfire', duration: 'infinite' });
  });

  it('plays on a character, on their chest unless a part is given', () => {
    expect(command('fx heal-burst at rena')).toMatchObject({ at: { character: 'rena', part: 'chest' } });
    expect(command('fx heal-burst at rena face')).toMatchObject({ at: { character: 'rena', part: 'face' } });
    expect(command('fx heal-burst 800 at rena feet')).toEqual({
      kind: 'fx', id: 'heal-burst', duration: 800, at: { character: 'rena', part: 'feet' },
    });
  });

  it('plays at a named spot or exact fractions', () => {
    expect(command('fx campfire at bottom')).toMatchObject({ at: { stage: STAGE_SPOTS.bottom } });
    expect(command('fx campfire at top-left')).toMatchObject({ at: { stage: STAGE_SPOTS['top-left'] } });
    expect(command('fx campfire at 0.5 0.97')).toMatchObject({ at: { stage: [0.5, 0.97] } });
    expect(problem('fx campfire at 0.5')).toContain('needs two numbers');
    expect(problem('fx campfire at nowhere')).toContain('"nowhere" isn\'t a spot');
  });

  it('stops one FX or every FX', () => {
    expect(command('fx moonlight stop')).toEqual({ kind: 'fxStop', id: 'moonlight' });
    expect(command('fx stop')).toEqual({ kind: 'fxStop' });
    expect(problem('fx moonlight stop now')).toContain('nothing can follow "stop"');
    expect(problem('fx sparkles')).toContain('no FX "sparkles"');
  });
});

describe('parseTag: line modifiers and unknown tags', () => {
  it('reads #display and #voice as modifiers', () => {
    expect(parseTag('display', assets)).toEqual({ modifier: 'display' });
    expect(parseTag('voice witch', assets)).toEqual({ modifier: 'voice', voice: 'witch' });
    expect(parseTag('voice none', assets)).toEqual({ modifier: 'voice', voice: 'none' });
    expect(problem('voice nobody')).toContain('no voice "nobody"');
  });

  it('names an unknown tag and lists the real ones', () => {
    expect(problem('dispaly')).toMatch(/unknown tag.*#display/);
  });
});

describe('findTags', () => {
  it('finds tags the way ink reads them, with line numbers', () => {
    const source = [
      'INCLUDE game.ink',
      '#bg forest',
      'Hello there. #display #voice witch',
      'A comment // #not-a-tag',
      'Escaped \\# hash',
      '/* block #hidden',
      'still #hidden */ #sfx bomb',
      '* [Choice] #music knight',
      'Dynamic #{flag}',
    ].join('\n');
    expect(findTags(source)).toEqual([
      { line: 2, tag: 'bg forest' },
      { line: 3, tag: 'display' },
      { line: 3, tag: 'voice witch' },
      { line: 7, tag: 'sfx bomb' },
      { line: 8, tag: 'music knight' },
    ]);
  });
});

describe('checkStory', () => {
  it('reports each problem with its story and line', () => {
    const source = ['#bg forrest', 'Fine. #display', '#light campfire'].join('\n');
    expect(checkStory('test', source, assets)).toEqual([
      { story: 'test', line: 1, problem: expect.stringContaining('forrest') },
      { story: 'test', line: 3, problem: expect.stringContaining('campfire') },
    ]);
  });
});
