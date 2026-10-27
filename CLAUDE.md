# fazegregpaul / GregSnap

Read this first. It is the memory for this project, so a fresh chat can pick up where the last one left off.
**Keep it current:** whenever a game is added, renamed or removed, update the game list below in the same PR.

## What this is

- A prop for the owner's parody movie of *The Social Network*. In the movie, Greg Paul builds **GregSnap**, "TikTok for games": a vertical feed where every post is a playable mini-game.
- Live at **https://fazegregpaul.com** (GitHub Pages from `main`, custom domain in `CNAME`). Merging to `main` is deploying.
- Almost everything is in **one file: `index.html`** (~1.7 MB, ~12.5k lines, vanilla JS + canvas, no build step, no libraries except Google Fonts).
- Other files: `cpu.html` (CPU Platformer Quiz), `emt.html` (Morpheme Works), `404.html`, `style.css` (404 page only), `cranberry.mp3`. Leave them alone unless asked.

## House rules (from the owner)

1. **Don't break anything.** Every change is tested before merging (see Testing).
2. **Never make a new repo.** Work on a **new branch** in `fgregpaul/fazegregpaul`.
3. **When done: commit, push, open a PR and merge it.** No need to ask first.
4. **No real game IP.** Games are original takes "inspired by" famous games, with their own names, characters and art (Bloons TD → *Pop Defense*, Stardew Valley → *Petal Isles*). Never use the real game's name, characters or logos in the game.
5. **Galaxies are fake money.** The Galaxy Crate / Galaxy Casino uses play currency only. No real payments, and no borrowing/loans in casino mode (out of galaxies → "open a crate").
6. **Make it good.** The owner wants games that are actually fun and pretty, not stubs. Big requests (a "Stardew", a "Factorio") deserve a real, full game.
7. Works on phones first (touch, full-screen), and on desktop (keyboard + mouse).

## Ship workflow

```bash
git checkout main && git pull
git checkout -b gregsnap-<short-name>
# ...edit index.html, test...
git add index.html && git commit -m "GregSnap: <what changed>"
git push -u origin gregsnap-<short-name>
# `gh pr create` uses GraphQL, which is blocked here; use the REST API:
N=$(gh api repos/fgregpaul/fazegregpaul/pulls -X POST -f title="..." -f head=gregsnap-<short-name> -f base=main -f body="..." --jq .number)
gh api repos/fgregpaul/fazegregpaul/pulls/$N/merge -X PUT -f merge_method=merge
```

## How `index.html` is laid out

The file is too big to read whole. **Find things with grep on these markers**, not line numbers (they drift).

| Marker (grep for it) | What's there |
|---|---|
| `<style>` / `layout v2` | Feed CSS. Phones: full-screen. Desktop (≥700px): TikTok-style card with the rail outside it. |
| `skins: every game gets its own look` | `skin(name, {...})` → `SKINS[name]`. Colours, fonts, patterns. Every game has its own skin so it looks made by a different creator. |
| `const MIX = {` | Shared game mixin: `kick()` (ready→run, dead→retry), `finish()`, `hurt()`, `decay()`. |
| `game loop plumbing` | `mount(canvas, game)`, the host. Sets `g.ctx`, `g.w/g.h` (play area), `g.W/g.H` (full canvas), `g.ox/g.oy` (play-area offset; ctx is already translated so (0,0) is the play area's top-left), `g.d` (DPR). Only the current slide's game gets `tick(dt)` + `draw()`. |
| `game 1: Steady Greg` … `game 8: Hoodie Dash` | The original 8 movie-joke games. |
| `random usernames and realistic comments` | `CPOOL`: comment pools keyed by game `kind` (`CPOOL.gen` = generic). New pools go right before the `    drop: [` line. |
| `const mk = (` / `const NEW_SLIDES = [` | `mk(game, title, skin, desc, tags, likes, comments, shares, kind)` makes a feed post. |
| `stage 2` … `stage 5l`, then one `/* ===== <Name>: ... ===== */` block per big game | Game code, grouped by when it was added. Big games are a `function makeX(sk) { ... return Object.assign({...}, MIX) }` closure. |
| `endless generator` | `PACKS` + `genSlide()`: re-skinned simple games appended forever after the hand-made ones. **New big games are inserted just before this marker.** |
| `const SLIDES = [` | The original 8, then `SLIDES.push(...NEW_SLIDES)`, comments attached, then **the feed is shuffled** on every load. |
| `buildSlide` | Builds each post's DOM (canvas, like/comment/share/donate rail, caption). |
| `?debug` → `window.__gs` | Test hook: `{ games, SLIDES, SKINS, ensureAhead, cur }`, plus `casino: { inst, setGal(n) }` once the casino loads (`inst.cluck` etc. after a tab is opened). Only exists with `?debug` in the URL. |
| `MUS = {` | Per-slide generated chiptune music. |
| `desktop fullscreen` | Fullscreen button (desktop only, under the up/down arrows). In fullscreen `html.fs` is set, the top bar/caption/rail hide, and every game's play area becomes the whole monitor (e.g. 1920x1080), so `layout()` must cope with wide screens: size things by `Math.min(w..., h...)` and centre them. |
| `Galaxy Casino` | The crate sheet's tabs: Crate, Blackjack, Hold'em, Roulette, Slots, Crash, Mines, Cluck Cross. Games built with `g.casino = true`; chips are bound to the galaxy balance. |

### The game object contract

```js
function makeThing(sk) {
  return Object.assign({
    sk, title: 'Thing', how: 'One line of instructions.',
    hold: true,        // optional: canvas gets touch-action:none (game uses drags; feed won't scroll from it)
    noVeil: true,      // optional: game draws its own title/game-over screens instead of the shared veil
    fsAspect: 0.5,     // optional: in desktop fullscreen, cap the play area to this width/height ratio (a centred column) for portrait-only layouts
    state: 'ready', score: 0, best: 0, dead: 0, shake: 0, flash: 0, floats: [],
    layout() {},       // called on resize; this.w/this.h are the play area
    reset() {},        // new run
    enter() {},        // slide scrolled into view
    bind(cv) {},       // add pointer listeners; ptrPos(cv, e) gives play-area coords
    key(e) { return handled; },  // keyboard (WASD is mapped to arrows for games that read arrows)
    tick(dt) {},
    draw() { const c = this.ctx; /* (0,0) = play area top-left */ },
  }, MIX);
}
skin('thing', { bg: ['#..', '#..'], fg: '#..', pal: [...], font: '"Some Font",sans-serif', ... });
NEW_SLIDES.push(mk(makeThing(SKINS.thing), 'Thing', SKINS.thing, 'Short description.', '#tag #tag', 12e9, 3e9, 1e9, 'thing'));
```

Helpers available inside the script: `sfx(freq, dur, vol, type)`, `JING('start'|'over'|'win')`, `txt(c, s, x, y, size, color, align, font)`, `clamp`, `rand`, `pick`, `shuf`, `ptrPos(cv, e)`. Save data goes in `localStorage` under a `gregsnap_<game>_v1` key, always wrapped in try/catch.

Big games are usually made with their own pixel buffer or offscreen canvas (see Moto Seasons, Hollow Path, Deepland, Petal Isles) and scaled up with smoothing off.

## Adding a game (recipe)

1. Check the game list below so it isn't a duplicate.
2. For a big game, write it in separate files in a scratch folder and use a small script that inserts it before `  /* ===== endless generator` and its comment pool before `    drop: [`. That's easier than editing a 1.7 MB file by hand.
3. Give it its own skin, a feed description, tags, big fake like counts and ~12 comments in `CPOOL`.
4. Test (below), then ship (workflow above), then **add it to the list in this file**.

## Testing

Playwright + Chromium are preinstalled in the cloud sandbox (`NODE_PATH=$(npm root -g) node test.js`). Open `file://.../index.html?debug`.

```js
const i = await page.evaluate(t => window.__gs.SLIDES.findIndex(s => s.title === t), 'Petal Isles');
await page.evaluate(i => { window.__gs.ensureAhead(i + 2); const f = document.querySelector('#feed'); f.scrollTo({ top: i * f.clientHeight }); }, i);
// window.__gs.games[i] is the live game object: call its methods, read state, take screenshots.
```

Minimum before merging:
- **Whole-feed check:** scroll through every slide, tap each, and confirm zero `pageerror`s.
- The new or changed game: play it with bots/scripted input, screenshot at phone (390×844, `isMobile`, `hasTouch`) and desktop (1280×800), and check the feed still scrolls past it.
- Real touch input: use CDP `Input.dispatchTouchEvent` (synthetic mouse clicks miss touch-only bugs).
- Google Fonts fail to load in the sandbox. That's expected, not a bug.

## Game list (84 hand-made games, shuffled into the feed on each load)

Plus the 7 Galaxy Casino games (Blackjack, Hold'em, Roulette, Slots, Crash, Mines, Cluck Cross — a chicken-crossing-the-road multiplier game inspired by Shuffle's chicken game) and the endless re-skinned games after them.

| Game | Inspired by | `kind` |
|---|---|---|
| Aim Lab | Aim Lab | `aim` |
| Beat Dash | Geometry Dash | `dash` |
| Beat Drop | Piano Tiles | `beat` |
| Belt Works | Factorio | `factory` |
| Blob Party | Agar.io | `blobs` |
| Block Blast | Block Blast | `blast` |
| Block Isle | Minecraft (3D voxel) | `voxel` |
| Blockfall | Tetris | `blocks` |
| Boost Ball | Rocket League | `cars` |
| Boss Rush | bullet-hell boss fight | `boss` |
| Bowling | bowling | `bowling` |
| Brick Breaker | Breakout | `break` |
| Checkers | checkers | `checkers` |
| Chess | chess | `chess` |
| Circle Beat | osu! | `circles` |
| Content Creator | creator sim | `creator` |
| Crush | Candy Crush | `crush` |
| Dark Pattern | GregSnap original (movie joke) | (one of the original 8) |
| Doodle Chess | chess on hand-drawn notebook paper, tilted 3D view with standing doodle pieces | `doodlechess` |
| Darts | darts | `darts` |
| Deepland | Terraria | `deep` |
| Drop Four | Connect Four | `four` |
| Dungeon Greg | Zelda-like dungeon | `quest` |
| Echo | Simon | `simon` |
| Encore | Guitar Hero | `encore` |
| Fishing | fishing arcade | `fishing` |
| Fizz Street | Schedule I (soda version) | `fizz` |
| Fleet | Battleship | `fleet` |
| Freedom Drop | Helldivers | `drop` |
| Friendbook | feed moderator | `feedgame` |
| Fruit Merge | Suika Game | `merge` |
| Galaxy Hunt 64 | Super Mario 64 / Galaxy | `g64` |
| Gate Hop | Portal | `gate` |
| Glow Worm | Slither.io | `worm` |
| Grand Prix | top-down racer | `race` |
| Greg Clicker | Cookie Clicker | `clicker` |
| Greg Inc. | AdVenture Capitalist | `tycoon` |
| Gregbit | GregSnap original (movie joke) | (one of the original 8) |
| Gregle | Wordle | `gregle` |
| High Card | Balatro | `cards` |
| Hole Hunter | Hole.io | `hole` |
| Hollow Path | Hollow Knight | `hollow` |
| Hoodie Dash | GregSnap original (movie joke) | (one of the original 8) |
| Hoodie Kart | 16-bit kart racers (Mode 7 style faux 3D: floor texture projected per scanline into a low-res buffer, billboard sprites). 4 seasonal tracks in `TRACKS` (Greg Circuit / Sunny Bay / Maple Hollow / Frost Peak with ice), defaults to the real season | `kart` |
| Hop | Doodle Jump (breakable/moving/vanishing platforms, springs, trampolines, propeller hat, jetpack, monsters you stomp or shoot, black holes, wrap-around; `makeHop` is also used by the endless generator) | `hop` |
| Hot Time | SUPERHOT | `hot` |
| Lanes | Crossy Road | `cross` |
| Lawn Lords | Paper.io-style territory grab, done with lawn mowers | `lawn` |
| Log Hop | Frogger | `river` |
| Merge | 2048 | `merge` |
| Moto Seasons | Trials / Moto X3M | `moto` |
| Munch | Pac-Man | `munch` |
| Order Up | burger stacking | `kitchen` |
| Pairs | memory | `pairs` |
| Petal Isles | Stardew Valley + Moonstone Island | `isle` |
| Pig Launch | Angry Birds | `sling` |
| Pinball | pinball | `pinball` |
| Plinko | Plinko | `plinko` |
| Pop Defense | Bloons TD | `td` |
| Putt | mini golf | `putt` |
| Raise Round | GregSnap original (movie joke) | (one of the original 8) |
| Rally | Pong | `pong` |
| Road Rush | traffic racer | `road` |
| Server Fire | GregSnap original (movie joke) | (one of the original 8) |
| Slice | Fruit Ninja | `slice` |
| Snack Attack | Snake | `snake` |
| Solitaire | Klondike | `solitaire` |
| Space Rocks | Asteroids | `rocks` |
| Stack the Interns | GregSnap original (movie joke) | (one of the original 8) |
| Stat Check | Higher or Lower | `hl` |
| Steady Greg | GregSnap original (movie joke) | (one of the original 8) |
| Sudoku | Sudoku | `sudoku` |
| Summit | Celeste | `summit` |
| Survive the Night | Vampire Survivors | `survive` |
| Suspects | Among Us | `sus` |
| Sweeper | Minesweeper | `sweeper` |
| Swipe Ideas | GregSnap original (movie joke) | (one of the original 8) |
| Tic Tac Toe | tic tac toe | `ttt` |
| Tower of Hanoi | Tower of Hanoi | `hanoi` |
| Tower Wobble | Stack | `wobble` |
| Type Rush | typing game | `type` |
| Underworld | Hades | `under` |
| Void Run | shoot-em-up | `shooter` |
| Word Search | word search | `wordsearch` |
