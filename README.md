# Prompt Station — how to put it online

Prompt Station is a small website with its own live multiplayer server. Players don't need an account. They open your site, type the 4-letter room code (or open the join link), and play.

## What's in this folder

| File | What it does |
|---|---|
| `public/index.html` | The game itself |
| `server.js` | Serves the game and runs the live rooms |
| `package.json` | Tells the host to install two packages (`ws` for live rooms, `xlsx` for the Excel export) and run `npm start` |
| `package-lock.json` | Pins the exact package versions |

## Easiest option: Render (free, no coding)

You need a free GitHub account and a free Render account.

1. **Put the files on GitHub**
   - Sign in at github.com and click **New repository**. Name it `prompt-station` and click **Create repository**.
   - Click **uploading an existing file**. Drag in `server.js`, `package.json`, `package-lock.json`, and the whole `public` folder.
   - Click **Commit changes**.
2. **Create the website on Render**
   - Sign in at render.com with your GitHub account.
   - Click **New +** and choose **Web Service**. Pick your `prompt-station` repository.
   - Fill in these settings:
     - **Runtime:** Node
     - **Build command:** `npm install`
     - **Start command:** `npm start`
     - **Instance type:** Free
   - Click **Create Web Service**. After a minute or two, Render gives you an address like `https://prompt-station.onrender.com`.
3. **Play**
   - Open the address, click **Host a room**, and share the code or the **join link** with your players.

**Good to know about the free plan:** the site goes to sleep after about 15 minutes with no visitors. The first visit after that can take up to a minute to load. Open the site yourself a couple of minutes before your session starts. A paid plan keeps it awake.

## Other ways to host

- **Your IT team or any server with Node.js 18 or newer:** copy the folder, run `npm install`, then `npm start`. It listens on port 3000, or on the `PORT` environment variable if one is set. The host must allow WebSocket connections, which most do.
- **Railway, Fly.io, Azure App Service, and similar:** use the same build and start commands as Render.

## Try it on your own computer first

1. Install Node.js from nodejs.org.
2. Open a terminal in this folder and run `npm install`, then `npm start`.
3. Visit `http://localhost:3000` in two browser windows: host in one, join in the other.

## Running a session

1. Open the site and click **Host a room**.
2. Pick a **session time limit** (5–30 minutes, or no limit) and share the code or join link.
3. Click **Start mission**. Everyone gets a countdown, and the time left shows on every screen.
4. When time runs out, the mission ends for everyone automatically. You can also end it early with **End mission**.
5. Click **Export leaderboard to Excel**. You get an `.xlsx` file with two sheets:
   - **Leaderboard:** rank, name, status (Escaped / Did not finish), time, penalty seconds, wrong answers, rooms cleared, last room reached, and whether the player left early.
   - **Session:** room code, date, start time, time limit, player count and how many escaped.

Keep the host screen open until you've exported, because the leaderboard lives on that screen. Players who close their tab mid-game still appear in the export. You can also export at any point during the game with **Export current standings**.

## Editing the game

All questions, lessons, and answers are in `public/index.html`, in the `STAGES` list near the top of the script. The Vault answer key is the `items` line of the Vault stage:

- `0` = Yes
- `1` = Yes, in our organization's Copilot only
- `2` = Only with approval
- `3` = Never

After editing, upload the new file to GitHub. Render redeploys automatically.

## Limits

- **Rooms are kept in memory.** If the server restarts, games in progress end, and players just join a new code.
- **Room size:** up to 150 players per room.
