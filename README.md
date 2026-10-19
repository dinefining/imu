# imu

Two people on the same black page. Each sees only their own cursor. A row of six pixels at the top tells you how close you are, by distance only and never direction. Find each other.

Plain HTML, CSS and vanilla JS. There's no build step. Multiplayer runs on Supabase Realtime (presence + broadcast). No database tables are needed.

## Files

| file | what |
| --- | --- |
| `index.html` | the page: one canvas plus the scripts |
| `style.css` | black page, hidden system cursor, pixelated rendering |
| `main.js` | the game: rendering, input, rooms, stranger matching, sound |
| `config.js` | your Supabase URL and anon key |

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and the **anon / publishable key** into `config.js`.
3. Realtime is on by default. If you've turned on **Realtime → Settings → "Private channels only"**, turn it off. This game uses public channels (`imu-room-<number>`, plus `imu-lobby` if stranger mode is on).
4. Serve the folder over http(s). Clipboard access and pointer lock don't work reliably from `file://`.

   ```bash
   python3 -m http.server 8000
   ```

   Then open <http://localhost:8000>. To try it alone, use two browser windows.

### GitHub Pages

Push these files to a repo, then go to **Settings → Pages → Deploy from a branch** and pick the branch and folder. The anon key is meant to be public, so committing `config.js` is fine.

## How it plays

- **invite** creates a private room and shows its link, like `…/?imu-this-482913-much`, with a copy icon next to it. The number is random. Click the icon (or the link) to copy it, send it to someone, then click **enter**. Whoever opens the link sees **join**.
- **stranger** (a queue that pairs you with the next person waiting) is built but hidden for now. Set `ENABLE_STRANGER = true` at the top of `main.js` to bring it back.
- **waiting** means you're alone in the dark until the other person arrives.
- Hearts in the top-left corner show who's in the room: one heart for you, and a second appears while the other person is there.
- The meter has 6 steps, from cold blue-grey (far) through pale blue, white, pale yellow and amber to warm orange (close).
- The five boxes in the bottom-left corner set the difficulty. The word **difficulty** appears when you hover over them. The selected one lights up in its colour, from green (easy) to red (hard), and the rest stay dim. It sets how close the cursors must be to see each other. From left (easy) to right (hard) the range is 5%, 3.5%, 2%, 1.2% and 0.7% of the world width. The middle one is the default. The setting is shared, so whoever changed it last sets it for both players, and it's remembered in your browser.
- When the cursors are within that range, you can see each other. If you stay that close for 1 second, you've found each other: both cursors glow with a dithered halo, the meter fills and fades, and the time shows for 3 seconds.
- **again** (bottom) starts a new round, with both cursors respawned far apart.
- **they left** means the other player's presence is gone and the meter goes dark. In an invite room, play picks up again if they come back through the link.
- The speaker icon in the bottom-right corner turns on a soft Web Audio pulse. Its tempo and pitch rise as you get closer. Sound is off by default.

## Implementation notes

- **Shared world.** Positions are normalised to 0–1 on each axis, and the world fills each player's whole screen (left edge to right edge, top to bottom). Players with different screen shapes still line up edge to edge. On a wide screen, the world is just stretched sideways, so the detection range is slightly oval on screen. You can't see it, so it doesn't matter in play.
- **Pointer lock.** On desktop, clicking **invite** or **join** locks the pointer. The cursor then becomes a virtual position inside the world, which is how rounds can respawn it. Press Esc to release it; the cursor then follows the real mouse, and any click locks it again. If the pointer isn't locked, a respawn lasts only until the mouse moves.
- **Touch.** Your position is your finger while touching, and the last spot you touched while not. After a respawn, your next touch moves you to your finger.
- **Networking.** Each client broadcasts its position about 15 times a second (only when it moves, plus a 1 s heartbeat) on `imu-room-<number>`. Presence tracks who's in the room. If a third person joins an invite room, they see **full**.
- **Rounds.** A round number is broadcast, and spawn points are derived from `room id + round`, so both clients agree without a server. Each client checks distance locally. Whichever client first sees 1 s inside the radius broadcasts `found`. The difficulty travels as a `diff` broadcast stamped with the time it was chosen, and the newest choice wins.
- **Stranger matching.** Everyone waiting is tracked as presence on `imu-lobby`, sorted by join time. The client that has waited longest proposes a room id to the next one. That client accepts, and both move into `imu-room-s<nonce>`. If a pairing goes wrong (someone left, or two proposals crossed), the stranded client goes back to the queue after a few seconds. (Hidden for now; see above.)
- **Reduced motion.** With `prefers-reduced-motion`, there's no halo, the meter fills instantly, and the "again" button doesn't fade in.

### About cheating

Each client receives the other player's position and only *chooses* not to draw it. A curious player can read positions in dev tools (the WebSocket frames or `main.js` state). That's fine for a game like this. Hiding positions for real would need a server to compute distances.

### Limits

The Supabase free tier allows plenty of Realtime messages for casual play: two players at about 15 messages per second each. Very busy public use may hit project quotas. Check **Realtime** in your Supabase dashboard.
