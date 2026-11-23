// Void Traveler – ColoredBlocks sürüm API'si (Cloudflare Worker)
// CurseForge'dan modun en son sürümünü ve değişiklik notunu çeker, sade bir JSON olarak döndürür.
// API anahtarı koda YAZILMAZ: Cloudflare'de "CF_API_KEY" adlı gizli değişken (secret) olarak eklenir.

const MOD_SLUG = 'coloredblocks-by-mcmodder';
const MINECRAFT_GAME_ID = 432;   // CurseForge'da Minecraft'ın oyun numarası
const MODS_CLASS_ID = 6;         // "Mods" kategorisi
const CACHE_SECONDS = 3600;      // Yanıt 1 saat önbellekte tutulur
const LOADERS = ['NeoForge', 'Forge', 'Fabric', 'Quilt'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

async function cf(path, env) {
  const res = await fetch(`https://api.curseforge.com${path}`, {
    headers: { 'Accept': 'application/json', 'x-api-key': env.CF_API_KEY },
  });
  if (!res.ok) throw new Error(`CurseForge ${res.status}`);
  return res.json();
}

// Changelog HTML'ini düz metin satırlarına çevirir (sitede güvenle gösterilsin diye)
function htmlToLines(html) {
  if (!html) return [];
  const text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
  return text.split('\n')
    .map(l => l.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)
    .slice(0, 40);
}

function versionFrom(file) {
  const m = (file.fileName || '').match(/-(\d+\.\d+(?:\.\d+)*)-/) || (file.displayName || '').match(/(\d+\.\d+(?:\.\d+)*)/);
  return m ? m[1] : (file.displayName || file.fileName);
}

async function buildData(env) {
  const search = await cf(`/v1/mods/search?gameId=${MINECRAFT_GAME_ID}&classId=${MODS_CLASS_ID}&slug=${MOD_SLUG}`, env);
  const mod = search.data?.[0];
  if (!mod) throw new Error('Mod bulunamadı');

  // En yeni dosya: önce "Release" olanlar, sonra tarihe göre
  const files = [...(mod.latestFiles || [])].sort((a, b) =>
    (a.releaseType === 1 ? 0 : 1) - (b.releaseType === 1 ? 0 : 1) || new Date(b.fileDate) - new Date(a.fileDate));
  const file = files[0];
  if (!file) throw new Error('Dosya bulunamadı');

  let changelog = [];
  try {
    const cl = await cf(`/v1/mods/${mod.id}/files/${file.id}/changelog`, env);
    changelog = htmlToLines(cl.data);
  } catch (e) { /* changelog alınamazsa boş kalır */ }

  const gv = file.gameVersions || [];
  return {
    name: mod.name,
    modUrl: mod.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${MOD_SLUG}`,
    totalDownloads: mod.downloadCount || 0,
    version: versionFrom(file),
    fileName: file.fileName,
    fileUrl: `https://www.curseforge.com/minecraft/mc-mods/${MOD_SLUG}/files/${file.id}`,
    fileDate: file.fileDate,
    releaseType: ({ 1: 'Release', 2: 'Beta', 3: 'Alpha' })[file.releaseType] || 'Release',
    mcVersions: gv.filter(v => /^\d+\.\d+(\.\d+)?$/.test(v)),
    loaders: gv.filter(v => LOADERS.includes(v)),
    changelog,
    updatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return json({ error: 'Yalnızca GET' }, 405);
    if (!env.CF_API_KEY) return json({ error: 'CF_API_KEY tanımlı değil' }, 500);

    const cache = caches.default;
    const cacheKey = new Request(new URL('/coloredblocks', request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const data = await buildData(env);
      const res = json(data, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  },
};
