# Reasons I love you — a crochet-themed reasons generator

A tiny single-page site: a ball of yarn with a thread she can pull to
reveal a random reason you love her / are proud of her.

## Files

- `index.html` — page structure and the yarn ball SVG
- `style.css` — all visual styling and animation
- `script.js` — the pull interaction and random-reason logic
- `reasons.js` — **edit this one.** Just a plain list of strings.

## Adding your own reasons

Open `reasons.js` and replace the placeholder lines inside the
`REASONS` array. Keep each one in double quotes with a comma after it.
No limit on how many — 40, 60, 100 all work fine. The site won't
repeat a reason until every one in the list has been shown once.

## Previewing locally

Just double-click `index.html` to open it in a browser — no server or
build step needed. (An internet connection is needed once, to load
the two Google Fonts.)

## Hosting on GitHub Pages

1. Create a new GitHub repo (can be private if you want, though
   GitHub Pages on a private repo needs a paid plan — public is
   simplest and fine for this).
2. Push these four files to the repo root (`index.html`, `style.css`,
   `script.js`, `reasons.js`).
3. In the repo, go to **Settings → Pages**.
4. Under **Source**, choose the branch (usually `main`) and folder
   `/ (root)`, then save.
5. GitHub will give you a URL like
   `https://<your-username>.github.io/<repo-name>/` within a minute
   or two — that's the link to send her.
