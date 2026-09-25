const CANAL = "cecchin-instagram-bridge";
const BASE = "https://www.instagram.com";
const APP_ID = "936619743392459";
const ASBD_ID = "359341";

function erroLegivel(status) {
  if (status === 401 || status === 403) return "A sessão do Instagram expirou. Abra Instagram.com, entre normalmente e atualize esta central.";
  if (status === 429) return "O Instagram pediu para reduzir a frequência. Aguarde um pouco antes de atualizar.";
  return `O Instagram respondeu HTTP ${status}. Atualize a página e tente novamente.`;
}

async function abaInstagram() {
  const abas = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  return abas.filter((aba) => Number.isInteger(aba.id) && aba.status === "complete")
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.lastAccessed ?? 0) - Number(a.lastAccessed ?? 0))[0] ?? null;
}

async function requisicao(tabId, path, method = "GET", body) {
  const [resultado] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [{ path, method, body, appId: APP_ID, asbdId: ASBD_ID }],
    func: async ({ path, method, body, appId, asbdId }) => {
      const csrf = document.cookie.split("; ").find((item) => item.startsWith("csrftoken="))?.slice("csrftoken=".length) ?? "";
      const response = await fetch(path, {
        method,
        credentials: "include",
        cache: "no-store",
        headers: { accept: "*/*", "x-ig-app-id": appId, "x-asbd-id": asbdId, "x-csrftoken": csrf, "x-requested-with": "XMLHttpRequest" },
        body: body ? new URLSearchParams(body) : undefined,
      });
      const payload = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, payload };
    },
  });
  const response = resultado?.result;
  if (!response) throw new Error("Não foi possível consultar a aba do Instagram.");
  if (!response.ok) throw new Error(erroLegivel(response.status));
  const payload = response.payload;
  if (!payload || payload.status === "fail" || payload.status === "error") throw new Error("O Instagram não aceitou a consulta. Atualize a sessão oficial e tente novamente.");
  return payload;
}

function itemMidia(raw) {
  const media = raw?.media_or_ad ?? raw?.media ?? raw;
  if (!media || typeof media !== "object") return null;
  const primeiro = media.carousel_media?.[0] ?? media;
  const imagem = primeiro.image_versions2?.candidates?.[0]?.url ?? primeiro.thumbnail_url ?? media.image_versions2?.candidates?.[0]?.url ?? media.thumbnail_url;
  const video = primeiro.video_versions?.[0]?.url ?? primeiro.video_url ?? media.video_versions?.[0]?.url ?? media.video_url;
  const username = media.user?.username ?? raw?.user?.username ?? "";
  const shortcode = media.code;
  const stamp = Number(media.taken_at ?? media.taken_at_ts ?? 0);
  const caption = media.caption?.text ?? media.caption_text ?? "";
  return {
    id: String(media.pk ?? media.id ?? `${username}-${stamp}`),
    username,
    nome: media.user?.full_name ?? raw?.user?.full_name ?? username,
    fotoPerfil: media.user?.profile_pic_url ?? raw?.user?.profile_pic_url ?? null,
    legenda: caption,
    tipo: video ? "video" : "image",
    urlMidia: video ?? imagem ?? null,
    miniatura: imagem ?? null,
    permalink: shortcode ? `${BASE}/p/${shortcode}/` : null,
    timestamp: stamp ? new Date(stamp * 1000).toISOString() : null,
    likes: Number(media.like_count ?? 0),
    comentarios: Number(media.comment_count ?? 0),
    assets: (media.carousel_media ?? []).map((asset) => ({
      urlMidia: asset.video_versions?.[0]?.url ?? asset.video_url ?? asset.image_versions2?.candidates?.[0]?.url ?? asset.thumbnail_url ?? null,
      tipo: asset.video_versions?.length || asset.video_url ? "video" : "image",
    })).filter((asset) => asset.urlMidia),
  };
}

function normalizarFeed(payload) {
  const itens = payload.feed_items ?? payload.items ?? payload.sections?.flatMap((section) => section.layout_content?.medias ?? section.media ?? []) ?? [];
  return itens.map(itemMidia).filter(Boolean).slice(0, 30);
}

function normalizarStories(payload) {
  return (payload.tray ?? payload.items ?? []).map((entry) => {
    const user = entry.user ?? entry.owner ?? {};
    const id = String(user.pk ?? entry.user_id ?? "");
    if (!id) return null;
    return {
      id,
      username: user.username ?? "",
      nome: user.full_name ?? user.username ?? "",
      foto: user.profile_pic_url ?? null,
      atualizadoEm: entry.latest_reel_media ? new Date(Number(entry.latest_reel_media) * 1000).toISOString() : null,
      temStory: Boolean(entry.latest_reel_media || entry.has_unseen_besties_media || entry.media_count),
    };
  }).filter((story) => story?.username && story.temStory).slice(0, 50);
}

async function executar(acao, tabId, argumentos = {}) {
  if (acao === "ping") {
    return { instalada: true, sessaoAtiva: true };
  }
  if (acao === "home") {
    const [feed, bandeja, perfil] = await Promise.all([
      requisicao(tabId, "/api/v1/feed/timeline/", "POST", { reason: "cold_start_fetch", is_pull_to_refresh: "0" }),
      requisicao(tabId, "/api/v1/feed/reels_tray/"),
      requisicao(tabId, "/api/v1/accounts/current_user/?edit=true").catch(() => null),
    ]);
    const user = perfil?.user ?? {};
    return { perfil: { id: String(user.pk ?? ""), username: user.username ?? "", nome: user.full_name ?? "", foto: user.profile_pic_url ?? null }, feed: normalizarFeed(feed), stories: normalizarStories(bandeja), atualizadoEm: new Date().toISOString() };
  }
  if (acao === "story") {
    const id = String(argumentos.userId ?? "");
    if (!/^\d{1,32}$/.test(id)) throw new Error("Perfil de Story inválido.");
    const payload = await requisicao(tabId, `/api/v1/feed/user/${id}/reel_media/`);
    const items = (payload.items ?? payload.reel_items ?? []).map(itemMidia).filter(Boolean);
    return { stories: items };
  }
  throw new Error("Ação da extensão desconhecida.");
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.canal !== CANAL || !sender.url?.startsWith("http://localhost:3000/operacional/marketing")) return false;
  if (message.origemApp !== "http://localhost:3000") return false;

  (async () => {
    const aba = await abaInstagram();
    if (!aba?.id) {
      if (message.acao === "ping") return { instalada: true, sessaoAtiva: false };
      throw new Error("Abra Instagram.com em uma aba deste mesmo navegador e entre normalmente.");
    }
    if (message.acao === "ping") return { instalada: true, sessaoAtiva: true };
    return executar(message.acao, aba.id, message.argumentos);
  })().then((data) => respond({ id: message.id, data })).catch((error) => respond({ id: message.id, erro: error instanceof Error ? error.message : "Falha ao consultar Instagram." }));
  return true;
});
