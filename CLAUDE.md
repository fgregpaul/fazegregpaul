# fazegregpaul / GregSnap

Read this first. It is the memory for this project, so a fresh chat can pick up where the last one left off.
**Keep it current:** whenever a game is added, renamed or removed, update the game list below in the same PR.

## What this is

- A prop for the owner's parody movie of *The Social Network*. In the movie, Greg Paul builds **GregSnap**, "TikTok for games": a vertical feed where every post is a playable mini-game.
- Live at **https://fazegregpaul.com** (GitHub Pages from `main`, custom domain in `CNAME`). Merging to `main` is deploying.
- Almost everything is in **one file: `index.html`** (~1.7 MB, ~12.5k lines, vanilla JS + canvas, no build step, no libraries except Google Fonts).
- `dev/sigserver.js` is a tiny local signaling server for testing multiplayer offline (see `GregNet`).
- Other files: `cpu.html` (CPU Platformer Quiz), `emt.html` (Morpheme Works), `404.html` (redirects game links like `/chess` into the app, see `game links:`), `style.css` (404 page only), `cranberry.mp3`. Leave them alone unless asked.
- `stockfish/`: Stockfish 11 compiled to WebAssembly (GPL, from nmrugg/stockfish.js branch `Stockfish11`). Chess loads it as a Web Worker (`SFISH` in index.html). It only works over http(s): from `file://` the game falls back to its built-in engine, so test Stockfish with a local server (`python3 -m http.server`).

## House rules (from the owner)

1. **Don't break anything.** Every change is tested before merging (see Testing).
2. **Never make a new repo.** Work on a **new branch** in `fgregpaul/fazegregpaul`.
3. **When done: commit, push, open a PR and merge it.** No need to ask first.
4. **No real game IP.** Games are original takes "inspired by" famous games, with their own names, characters and art (Bloons TD → *Pop Defense*, Stardew Valley → *Petal Isles*). Never use the real game's name, characters or logos in the game.
5. **Galaxies are fake money.** The Galaxy Crate / Galaxy Casino uses play currency only. No real payments, and no borrowing/loans in casino mode (out of galaxies → "open a crate").
6. **Make it good.** The owner wants games that are actually fun and pretty, not stubs. Big requests (a "Stardew", a "Factorio") deserve a real, full game.
7. Works on phones first (touch, full-screen), and on desktop (keyboard + mouse). **Every game must be fully playable on a phone with touch only**, including big desktop-style games (Storm Isle uses on-screen twin sticks + buttons). Test with real touch events before merging.
8. **Multiplayer:** the owner wants anyone to be able to make a lobby in any game that suits it (chess, a shooter, karts...). Use the shared lobby system (`GregNet`, below) instead of building a new one per game.

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
| `iOS home-screen web app` | iOS 26+ draws its own blur over the status bar and ~40pt below it in installed web apps (can't be turned off). `html.sa` is set in standalone mode: the header gets `--sbx` extra top padding to sit below that blur, and `#sbar` is a solid fixed strip in the skin colour (`--sbc`). Don't put text in the top ~100px of the installed app. |
| `skins: every game gets its own look` | `skin(name, {...})` → `SKINS[name]`. Colours, fonts, patterns. Every game has its own skin so it looks made by a different creator. |
| `const MIX = {` | Shared game mixin: `kick()` (ready→run, dead→retry), `finish()`, `hurt()`, `decay()`. |
| `game loop plumbing` | `mount(canvas, game)`, the host. Sets `g.ctx`, `g.w/g.h` (play area), `g.W/g.H` (full canvas), `g.ox/g.oy` (play-area offset; ctx is already translated so (0,0) is the play area's top-left), `g.d` (DPR). Only the current slide's game gets `tick(dt)` + `draw()`. |
| `game 1: Steady Greg` … `game 8: Greg Dash` | The original 8 movie-joke games. |
| `random usernames and realistic comments` | `CPOOL`: comment pools keyed by game `kind` (`CPOOL.gen` = generic). New pools go right before the `    drop: [` line. |
| `const mk = (` / `const NEW_SLIDES = [` | `mk(game, title, skin, desc, tags, likes, comments, shares, kind)` makes a feed post. |
| `stage 2` … `stage 5l`, then one `/* ===== <Name>: ... ===== */` block per big game | Game code, grouped by when it was added. Big games are a `function makeX(sk) { ... return Object.assign({...}, MIX) }` closure. |
| `endless generator` | `PACKS` + `genSlide()`: re-skinned simple games appended forever after the hand-made ones. **New big games are inserted just before this marker.** |
| `const SLIDES = [` | The original 8, then `SLIDES.push(...NEW_SLIDES)`, comments attached, then one generated game per `TEMPLATES` entry (`genSlide(T)`, marked `gen: true`) is added, then **the feed is shuffled** on every load, so re-skinned games show up near the top as often as hand-made ones. |
| `game links:` | `fazegregpaul.com/<slug>` opens that game first (slug = title lowercased, non-letters → `-`, e.g. `/glow-worm`, `/galaxy-hunt-64`; hyphens optional). GitHub Pages has no such file, so `404.html` redirects to `/?g=<slug>` and the app puts `/<slug>` back with `replaceState`; the address bar follows the current slide. Generated titles work too (`/cosmic-slither`); when a suffix belongs to more than one template the non-first ones get `-<kind>` (`/sprint-drop-four`). `linkOf(s)` makes a slide's link. The share sheet copies "i just played X and got a lot of Dopamine you should try it at fazegregpaul.com/x" (plus a native Share button on phones). Renaming a game changes its link. |
| `buildSlide` | Builds each post's DOM (canvas, like/comment/share/donate rail, caption). |
| `?debug` → `window.__gs` | Test hook: `{ games, SLIDES, SKINS, ensureAhead, cur }`, plus `casino: { inst, setGal(n) }` once the casino loads (`inst.cluck` etc. after a tab is opened). Only exists with `?debug` in the URL. |
| `MUS = {` | Per-slide generated chiptune music. |
| `desktop fullscreen` | Fullscreen button (desktop only, under the up/down arrows). In fullscreen `html.fs` is set, the top bar/caption/rail hide, and every game's play area becomes the whole monitor (e.g. 1920x1080), so `layout()` must cope with wide screens: size things by `Math.min(w..., h...)` and centre them. |
| `GregNet` | Shared multiplayer for any game. `NET` = WebRTC peer-to-peer data channels; signaling (the handshake) goes through the free PeerJS cloud server `wss://0.peerjs.com` using its protocol directly (no library). Star topology: the host relays. `LOBBY.open(game)` shows the Create / Join-with-code / waiting-room sheet (`#glob`). Invite links `fazegregpaul.com/<game>?lobby=CODE` auto-join (404.html keeps the query). Optional game fields for the sheet: `mpMin` (players needed before Start is enabled; 2-player games use 2), `mpSub` (subtitle), `mpNote` (host note, default "Empty spots are filled with bots."). Games with online play: Storm Isle, Dune Strike, Chess, Rally, Drop Four, Checkers, Fleet. **Turn-based 1v1 games use `turnMP(kind, label)`** (grep `turnMP:`), merged into the game's `Object.assign(..., MIX, turnMP(...))`: it gives the PLAY A FRIEND button (`drawFbtn`, `mpTap` first in pointerdown), lobby hooks, rematch, leave handling and the game-over veil (`mpVeil`). The game only adds `mpTurnSide()`, `mpDo(payload, side)` (validate + apply), optional `mpSetup()`/`mpInit(data)`, sends its own moves with `mpLocal(payload)` and calls `mpOver(winnerSide | -1, why)` at the end. Moves are numbered (`seq`) and the host checks whose turn it is before relaying. Easiest way to add online play to another turn-based game. A game opts in with `mp: true`, `mpKind`, and hooks `mpHostStart(players) -> data`, `mpClientStart(data, me, players)`, `mpMsg(from, d)`, `mpLeft(id)`, `mpLobby()`, `mpEnd(reason)`; it sends with `NET.send(d, fast)` (client to host), `NET.bcast(d, fast)` / `NET.to(id, d, fast)` (host). `fast` = unreliable channel for snapshots. `window.__mpGame` keeps ticking while its player scrolls away or opens a sheet. Up to 8 players. **Relays (TURN):** PeerJS's free relay plus Open Relay's public static-auth server (`staticauth.openrelay.metered.ca`, login made in the browser from its published secret in `freshIce()`), on UDP and on TCP/TLS port 443. They matter most when both phones are on the same home Wi-Fi (routers often block phone-to-phone and hairpin traffic); the sandbox can't reach them, so they can only be tested on real phones. `?relay` in the URL forces relay-only. **Backup route (`wsPeer`):** if the host answered but no direct/TURN connection opens within 9s (school/work Wi-Fi usually allows only normal HTTPS), game messages travel over the lobby server's own websocket, packed into CANDIDATE messages (`connectionId: 'gsrelay'`, data in `candidate.candidate` after `gs1:`); `fast` snapshots are thinned to ~9 Hz, pings every 5s, a silent peer is dropped after 20s. `?forcews` uses the backup route straight away (testing). If the lobby server itself is unreachable 3 times, joining fails with a clear 'this Wi-Fi is blocking it, try mobile data' [D] error instead of spinning. The sheet ignores ALL taps for 0.45s after it appears (a phone tap that opened it used to press Create underneath); invite-link auto-join calls `act('join')` directly. Canvas `arc`/`ellipse`/`roundRect` clamp negative radii to 0 and each game's draw is wrapped in try/catch (phones held sideways used to crash app start-up). The lobby sheet has a dark, minimal style (Playfair Display / Figtree / DM Mono, plain non-italic titles, ivory pill buttons, code shown as letter tiles). Test offline: `node dev/sigserver.js` + `?peerhost=ws://localhost:9123`. |
| `Dune Strike:` | First-person 5v5 shooter (see the game list). Flow-field bots, WebGL box world, own HUD; `Float64Array` for the Dijkstra fields (float32 rounding made `d > F[k]` skip nodes). |
| `Storm Isle:` | Top-down battle royale (30 players, bots fill the rest). The island is generated from a seed with deterministic maths only (integer hashing, `Math.sqrt`, hand-rasterised roads; no `Math.pow/hypot/sin` or canvas reads in anything that decides layout) so every phone builds the same map; `worldSum` is compared on join. The host simulates bots, storm, loot and damage; clients move themselves, send actions (`f` fire, `w` swing, `c` chest, `p` pick, `b` build...) and get 15 Hz snapshots plus reliable event batches (`E`). `_dbg` on the game object is a test hook. |
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

## Game list (86 hand-made games, shuffled into the feed on each load)

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
| Checkers | checkers. Online 1v1 via `turnMP` (black's board is turned around) | `checkers` |
| Chess | chess vs Stockfish 11 with a chess.com-style bot Elo slider (250 to MAX, saved in localStorage). This Stockfish build has no UCI_Elo, so `eloPlan()` sets search depth + MultiPV by Elo and `choose()` picks among Stockfish's candidate moves (softmax by score, plus occasional slips at low Elo); MAX = plain best move. Hints are full-strength Stockfish; eval bar. **Online 1v1** via GregNet (`vs friend` button; `mpKind: 'chess'`): host + first joiner play, colours random then swapped each rematch, extra players watch. Black sees the board turned around (`flip`, `vr()/vq()` map logical squares to screen squares). Moves are `{t:'mv', n: ply, fr,fc,tr,tc,p}`; the host checks them and relays. Resign / rematch (host) / lobby buttons replace hint/undo online. One game with 6 switchable arenas in `ARENAS` (arrows up top, saved in localStorage, defaults by season): Walnut Club (flat classic), Doodle (the old Doodle Chess notebook), Pixel Dungeon, Haunted Hollow, Frostbite Village (Christmas pixel art), Neon Grid. Pixel arenas draw the board at 1/3 res and pixelate the piece silhouettes | `chess` |
| Circle Beat | osu! | `circles` |
| Content Creator | creator sim | `creator` |
| Crush | Candy Crush | `crush` |
| Dark Pattern | GregSnap original (movie joke) | (one of the original 8) |
| Darts | darts | `darts` |
| Deepland | Terraria | `deep` |
| Drop Four | Connect Four. The hand-made one (`makeFour(SKINS.park, { mp: true, park: true })`) is set in an autumn park (`parkArt`: cached park background with a stone chess table, oak board drawn over the discs with see-through holes, falling leaves, pigeons, green park sign) and has its own title card with two boxes, Play Computer / Play A Friend (online 1v1 via `turnMP`). Generated ones keep the old look and stay solo | `four` |
| Dungeon Greg | Zelda-like dungeon | `quest` |
| Echo | Simon | `simon` |
| Encore | Guitar Hero | `encore` |
| Facet Rush | browser low-poly track-builder racers (3D time trials). Raw WebGL, flat-shaded meshes built in code. Tracks are turtle strings in `TRACKS` (`S` straight, `L`/`R` sharp 1x1 turns, `l`/`r` medium 2x2 turns, `q`/`p` wide 3x3 turns, `U`/`D` ramps one level up/down, `B` boost, `C` checkpoint, `J` jump gap that drops a level, `F` finish; the start piece is implicit) parsed by `parse()` onto a 24-unit grid, bridges allowed when levels don't overlap. Fixed 120 Hz car physics (`step`) tuned to feel like the real thing: ~300 km/h top speed, steering that weakens with speed (`w = 2.2/(1+sp/50)`), slow steering ramp-in, tyre grip capped per second so carrying too much speed into a corner slides you wide; drift = brake + steer. Leave long straights after boosted jumps (landing into a corner is unfair). The author bot (`pilot`/`authorRun`, brakes using each waypoint's corner radius) drives every track to set Author/Gold/Silver/Bronze times (x1, x1.07, x1.22, x1.5), custom tracks included; results cached in the save (`SAVE.at`, key `p2:<code>`; bump the prefix if physics change). Ghost of your PB (falls back to the author run), checkpoint splits, respawn/restart. Track builder saves one custom track (`SAVE.custom`); 5 themed tracks (Meadow Run, Hairpin Pass, Canyon Leap, Island Flyover, Neon-lit Night Circuit). Save: `gregsnap_facet_v2`. Phones: on-screen steer/gas/brake pads | `facet` |
| Fishing | fishing arcade | `fishing` |
| Fizz Street | Schedule I (soda version) | `fizz` |
| Fleet | Battleship. Online 1v1 via `turnMP`: the host places both fleets at random and sends them in the start data | `fleet` |
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
| Hollow Path | Hollow Knight. One interconnected map of 21 hand-drawn ASCII rooms in `ROOMDEF` (6 areas: Fallen Crossing, Mossgrave, Sunken Cistern, Amber Halls, Glimmer Deep, Guardian's Rest). Swift Cloak (dash) and Thorn Claws (wall jump) gate areas; breakable walls, ambush rooms, a lever shortcut, 4 mask shards, map overlay (M / MAP button), bench saves in localStorage `gregsnap_hollow_v2` | `hollow` |
| Greg Dash | GregSnap original (movie joke) | (one of the original 8) |
| Greg Kart | 16-bit kart racers (Mode 7 style faux 3D: floor texture projected per scanline into a low-res buffer, billboard sprites). 4 seasonal tracks in `TRACKS` (Greg Circuit / Sunny Bay / Maple Hollow / Frost Peak with ice), defaults to the real season | `kart` |
| Dune Strike | classic 5v5 bomb-defusal shooters (first-person, raw WebGL box world + CS-1.6-style amber HUD). Map *Dunes* is a 48x48 cell grid in `GR` (walls, low walls, crates with heights; A and B sites, mid, long, catwalk, tunnels). Founders attack and plant, Suits defend; first to 6 rounds, sides swap after 5. Buy menu (B / BUY in spawn) with original guns (P9, Tac-45, Hand Cannon, Buzz SMG, Viper, Lark, Kestrel AR, Falcon, Longshot), armour, kit, HE/flash/smoke. Recoil punch + spread, headshots, armour soak, money like the classics, dropped guns, bomb plant/defuse. Bots: Dijkstra flow fields (`field()`/`steer()`), T routes in `ROUTES`, CT holds in `HOLDS`, 3 difficulties. Phones: move stick left, drag right to aim, FIRE/JUMP/DUCK/R/swap buttons, light aim assist while firing. **Online** via GregNet (`mpKind: 'strike'`, up to 8 humans split across teams, bots fill to 5v5): host runs everything; clients move themselves, hit-test locally and send `hit`, host applies damage and sends 15 Hz `S` snapshots + reliable `E` event batches. `_dbg` test hook. The lobby opens on `click` (not pointerdown) so the rest of a phone tap can't land on Create | `strike` |
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
| Rally | Pong. The hand-made Rally (`makePong(sk, { mp: true })`) has online 1v1 (PLAY A FRIEND on its title screen, first to 7): the host runs the ball and sends 30 Hz snapshots, the friend sends its paddle; each player sees their own paddle at the bottom. Generated pong games stay solo | `pong` |
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
| Storm Isle | Fortnite (top-down 2D battle royale: Sky Barge drop, 9 named towns, chests, 5 guns in 5 rarities, wall building, shrinking storm, 29 bots; phones: floating move stick on the left + a fixed aim circle bottom-right (`aimGeom()`; push past the dashed ring to shoot); online lobbies with friends via GregNet) | `royale` |
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
