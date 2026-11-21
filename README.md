# royale

## Testing on your phone (from anywhere)

A Cloudflare quick tunnel gives your Mac's dev server a public URL your phone can open on any network. The Mac has to stay on and online.

**One-time setup:** `brew install cloudflared`

**Start** (two terminal windows, from the project folder):

1. Dev server: `npx vite --port 5190`
2. Tunnel: `cloudflared tunnel --url http://localhost:5190`

The tunnel prints an address like `https://some-random-words.trycloudflare.com`. On your phone, open it with `/royale/` on the end:

- Game: `https://<address>/royale/`
- A story: `https://<address>/royale/?scene=Dialogue&storyKey=final-battle`
- FX Lab: `https://<address>/royale/?scene=FxLab`

Edits to the project show up when you reload the page on your phone.

**Stop:** press `Ctrl+C` in both windows. If they were started in the background, run `pkill cloudflared` and `lsof -ti tcp:5190 | xargs kill`.

**Good to know:**

- Anyone with the link can open the game. The address is random, so only share it with people you want testing.
- The address changes every time the tunnel restarts, for example after a reboot. Start the tunnel again and use the new address.
- If the page says the host is blocked, check that `vite.config.ts` still lists `.trycloudflare.com` under `server.allowedHosts`.
