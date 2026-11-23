# coloredblocks-api

A small Cloudflare Worker that shows the latest version of my Minecraft mod
**[ColoredBlocks By McModder](https://www.curseforge.com/minecraft/mc-mods/coloredblocks-by-mcmodder)**
on my personal website.

## What it does

- Reads data for **my own mod only** from the CurseForge API (read-only).
- Returns the latest version, release date, supported Minecraft version and loader,
  download count and changelog as simple JSON.
- Links to the official CurseForge file page. **No mod files are hosted or redistributed.**
- Responses are cached for 1 hour, so the CurseForge API is called about 24 times a day.

## Endpoint

`GET /coloredblocks`

```json
{
  "name": "ColoredBlocks By McModder",
  "version": "1.2.0",
  "fileName": "coloredblocks-1.2.0-neoforge-1.21.1.jar",
  "fileUrl": "https://www.curseforge.com/minecraft/mc-mods/coloredblocks-by-mcmodder/files/...",
  "fileDate": "2026-11-23T00:00:00Z",
  "releaseType": "Release",
  "mcVersions": ["1.21.1"],
  "loaders": ["NeoForge"],
  "totalDownloads": 1234,
  "changelog": ["..."]
}
```

## Setup

1. Create a Cloudflare Worker and paste `worker.js`.
2. Add the CurseForge API key as a **secret** named `CF_API_KEY`
   (the key is never stored in this repository or shown to website visitors).
3. Deploy.

Author: McModder
