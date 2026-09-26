const CANAL = "cecchin-instagram-bridge";
const BASE = "https://www.instagram.com";
const APP_ID = "936619743392459";
const ASBD_ID = "359341";
const fotosPerfilCache = new Map();

function erroLegivel(status) {
  if (status === 401 || status === 403) return "A sessão do Instagram expirou. Abra Instagram.com, entre normalmente e atualize esta central.";
  if (status === 0) return "Falha de rede na chamada do Instagram.";
  if (status === 429) return "O Instagram pediu para reduzir a frequência. Aguarde um pouco antes de atualizar.";
  return `O Instagram respondeu HTTP ${status}. Atualize a página e tente novamente.`;
}

async function abaInstagram() {
  const abas = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  return abas.filter((aba) => Number.isInteger(aba.id) && aba.status === "complete")
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.lastAccessed ?? 0) - Number(a.lastAccessed ?? 0))[0] ?? null;
}

async function requisicao(tabId, path, method = "GET", body) {
  let resultado;
  try { [resultado] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [{ path, method, body, appId: APP_ID, asbdId: ASBD_ID }],
    func: async ({ path, method, body, appId, asbdId }) => {
      try {
        const cookie = (name) => document.cookie.split("; ").find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
        const csrf = cookie("csrftoken");
        const headers = { accept: "*/*", "x-ig-app-id": appId, "x-asbd-id": asbdId, "x-csrftoken": csrf, "x-requested-with": "XMLHttpRequest" };
        let params = body ? new URLSearchParams(body) : undefined;
        if (path.includes("graphql")) {
          const modulo = (name) => new Promise((resolve) => {
            let concluido = false;
            const terminar = (valor) => { if (!concluido) { concluido = true; resolve(valor ?? ""); } };
            try { window.requireLazy?.([name], (data) => terminar(data?.token)); } catch { /* usar fallback */ }
            setTimeout(() => terminar(""), 500);
          });
          const scripts = [...document.querySelectorAll("script")].map((item) => item.textContent ?? "").join("");
          const fbDtsg = await modulo("DTSGInitialData") || scripts.match(/"DTSGInitialData"[^}]{0,500}"token"\s*:\s*"([^"]+)"/)?.[1] || "";
          const lsd = await modulo("LSD") || scripts.match(/"LSD"\s*,\s*\[\]\s*,\s*\{"token"\s*:\s*"([^"]+)"/)?.[1] || "";
          params ??= new URLSearchParams();
          if (fbDtsg) {
            params.set("fb_dtsg", fbDtsg);
            params.set("jazoest", `2${[...fbDtsg].reduce((sum, letter) => sum + letter.charCodeAt(0), 0)}`);
          }
          if (lsd) { params.set("lsd", lsd); headers["x-fb-lsd"] = lsd; }
          const actorId = cookie("ds_user_id");
          if (actorId) params.set("av", actorId);
          if (body?.variables && actorId) {
            const variables = JSON.parse(body.variables);
            if (variables.input?.actor_id === "$ACTOR_ID") { variables.input.actor_id = actorId; params.set("variables", JSON.stringify(variables)); }
          }
          params.set("__d", "www"); params.set("__user", "0"); params.set("__a", "1"); params.set("__comet_req", "7");
          params.set("__spin_b", "trunk");
          if (body?.fb_api_req_friendly_name) headers["x-fb-friendly-name"] = body.fb_api_req_friendly_name;
        }
        const response = await fetch(path, {
          method,
          credentials: "include",
          cache: "no-store",
          headers,
          body: params,
        });
        const raw = await response.text();
        let payload = null;
        try { payload = JSON.parse(raw); } catch { payload = { message: raw.slice(0, 180) || "Resposta vazia ou n?o JSON." }; }
        return { ok: response.ok, status: response.status, payload };
      } catch (error) {
        return { ok: false, status: 0, payload: { message: error instanceof Error ? error.message : String(error) } };
      }
    },
  }); } catch (error) { throw new Error(`Falha ao executar a consulta na aba existente: ${error instanceof Error ? error.message : String(error)}`); }
  const response = resultado?.result;
  if (!response) throw new Error("Não foi possível consultar a aba do Instagram.");
  if (!response.ok) {
    const detail = response.payload?.message ?? response.payload?.error_type ?? response.payload?.feedback_message;
    throw new Error(detail ? `${erroLegivel(response.status)} ${String(detail).slice(0, 180)}` : erroLegivel(response.status));
  }
  const payload = response.payload;
  if (Array.isArray(payload?.errors) && payload.errors.length && !payload.data) {
    throw new Error(`O Instagram recusou a ação: ${String(payload.errors[0]?.message ?? "erro na consulta").slice(0, 180)}`);
  }
  if (!payload || payload.status === "fail" || payload.status === "error") {
    const detail = payload?.message ?? payload?.error_type ?? payload?.feedback_message;
    throw new Error(detail ? `O Instagram recusou a ação: ${String(detail).slice(0, 180)}` : "O Instagram não aceitou a consulta. Atualize a sessão oficial e tente novamente.");
  }
  return payload;
}

function itemMidia(raw, fallbackUser = {}) {
  const media = raw?.media_or_ad ?? raw?.media ?? raw;
  if (!media || typeof media !== "object") return null;
  const primeiro = media.carousel_media?.[0] ?? media;
  const imagem = primeiro.image_versions2?.candidates?.[0]?.url ?? primeiro.thumbnail_url ?? media.image_versions2?.candidates?.[0]?.url ?? media.thumbnail_url;
  const video = primeiro.video_versions?.[0]?.url ?? primeiro.video_url ?? media.video_versions?.[0]?.url ?? media.video_url;
  const user = media.user ?? raw?.user ?? media.owner ?? raw?.owner ?? fallbackUser;
  const username = user.username ?? "";
  const shortcode = media.code;
  const stamp = Number(media.taken_at ?? media.taken_at_ts ?? 0);
  const caption = media.caption?.text ?? media.caption_text ?? "";
  const isVideo = Number(primeiro.media_type ?? media.media_type) === 2 || Boolean(video);
  return {
    id: String(media.pk ?? media.id ?? `${username}-${stamp}`),
    userId: String(user.pk ?? user.id ?? media.user_id ?? media.owner?.pk ?? raw?.user_id ?? fallbackUser.pk ?? ""),
    username,
    nome: user.full_name ?? username,
    fotoPerfil: user.profile_pic_url ?? user.profile_pic_url_hd ?? null,
    legenda: caption,
    tipo: isVideo && video ? "video" : "image",
    duracaoSegundos: Number(primeiro.video_duration ?? media.video_duration ?? 0) || null,
    urlMidia: isVideo ? video ?? imagem ?? null : imagem ?? video ?? null,
    miniatura: imagem ?? null,
    permalink: shortcode ? `${BASE}/p/${shortcode}/` : null,
    timestamp: stamp ? new Date(stamp * 1000).toISOString() : null,
    likes: Number(media.like_count ?? 0),
    gostei: Boolean(media.has_liked ?? media.has_liked_story ?? media.has_viewer_liked ?? false),
    comentarios: Number(media.comment_count ?? 0),
    assets: (media.carousel_media ?? []).map((asset) => ({
      urlMidia: asset.video_versions?.[0]?.url ?? asset.video_url ?? asset.image_versions2?.candidates?.[0]?.url ?? asset.thumbnail_url ?? null,
      tipo: asset.video_versions?.length || asset.video_url ? "video" : "image",
    })).filter((asset) => asset.urlMidia),
  };
}

function normalizarFeed(payload, fotosStories = new Map()) {
  const itens = payload.feed_items ?? payload.items ?? payload.sections?.flatMap((section) => section.layout_content?.medias ?? section.media ?? []) ?? [];
  const posts = itens.map(itemMidia).filter((post) => post && (post.urlMidia || post.assets?.length));
  return posts.slice(0, 30).map((post) => ({
    ...post,
    fotoPerfil: post.fotoPerfil ?? fotosStories.get(post.userId) ?? fotosStories.get(post.username) ?? null,
  }));
}

async function completarFotosPerfil(tabId, posts) {
  for (const post of posts) {
    if (post.fotoPerfil && post.userId && fotosPerfilCache.get(post.userId)?.source !== "profile") fotosPerfilCache.set(post.userId, { url: post.fotoPerfil, atualizadoEm: Date.now() });
  }
  const postsComCache = posts.map((post) => ({ ...post, fotoPerfil: fotosPerfilCache.get(post.userId)?.source === "profile" ? fotosPerfilCache.get(post.userId)?.url : post.fotoPerfil ?? fotosPerfilCache.get(post.userId)?.url ?? null }));
  const faltantes = [...new Map(postsComCache.filter((post) => !post.fotoPerfil && post.userId && !fotosPerfilCache.has(post.userId)).map((post) => [post.userId, post])).values()].slice(0, 4);
  for (const post of faltantes) {
    try {
      const resposta = await requisicao(tabId, `/api/v1/users/${encodeURIComponent(post.userId)}/info/`);
      const user = resposta.user ?? resposta.data?.user ?? {};
      fotosPerfilCache.set(post.userId, { url: user.profile_pic_url_hd ?? user.profile_pic_url ?? null, atualizadoEm: Date.now() });
    } catch {
      fotosPerfilCache.set(post.userId, { url: null, atualizadoEm: Date.now() });
    }
  }
  return postsComCache.map((post) => ({ ...post, fotoPerfil: post.fotoPerfil ?? fotosPerfilCache.get(post.userId)?.url ?? null }));
}

function normalizarStories(payload) {
  return (payload.tray ?? payload.items ?? []).map((entry) => {
    const user = entry.user ?? entry.owner ?? {};
    const id = String(user.pk ?? entry.user_id ?? entry.id ?? "");
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

function itensDePerfil(payload) {
  const connection = payload.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
  const items = connection?.edges?.map((edge) => edge.node) ?? payload.items ?? payload.feed_items ?? payload.user?.feed_items ?? payload.timeline_media?.items ?? [];
  return items.map((item) => itemMidia(item)).filter((item) => item?.urlMidia || item?.assets?.length);
}

async function postsPerfil(tabId, username, id, cursor = "") {
  if (username && !cursor.startsWith("rest:")) {
    try {
      const variables = { data: { count: 18, include_relationship_info: true, latest_besties_reel_media: true, latest_reel_media: true }, username, first: 18, after: cursor || null, before: null, last: null };
      const result = await requisicao(tabId, "/graphql/query", "POST", { doc_id: "26442143102071041", fb_api_req_friendly_name: "PolarisProfilePostsTabContentQuery_connection", variables: JSON.stringify(variables) });
      const connection = result.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
      if (connection?.edges) return { feed: itensDePerfil(result), cursor: connection.page_info?.end_cursor ?? null, hasMore: Boolean(connection.page_info?.has_next_page && connection.page_info?.end_cursor) };
    } catch { /* tentar rota alternativa */ }
  }
  if (!id) throw new Error("O Instagram não disponibilizou mais publicações deste perfil agora.");
  const restCursor = cursor.startsWith("rest:") ? cursor.slice(5) : "";
  if (cursor && !restCursor) throw new Error("O Instagram não disponibilizou mais publicações deste perfil agora.");
  const result = await requisicao(tabId, `/api/v1/feed/user/${id}/${restCursor ? `?max_id=${encodeURIComponent(restCursor)}` : ""}`);
  return { feed: itensDePerfil(result), cursor: result.next_max_id ? `rest:${result.next_max_id}` : null, hasMore: Boolean(result.more_available && result.next_max_id) };
}

async function infoPerfilWeb(tabId, id) {
  const result = await requisicao(tabId, "/graphql/query", "POST", { doc_id: "26672929172408668", fb_api_req_friendly_name: "PolarisProfilePageContentQuery", variables: JSON.stringify({ enable_integrity_filters: true, id, __relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider: true, __relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider: false, __relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider: false, __relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider: false }) });
  return result.data?.user ?? null;
}

function normalizarComentario(raw) {
  const user = raw.user ?? raw.owner ?? {};
  return {
    id: String(raw.pk ?? raw.id ?? ""), userId: String(user.pk ?? user.id ?? ""), username: user.username ?? "Instagram",
    text: raw.text ?? "", timestamp: raw.created_at ? new Date(Number(raw.created_at) * 1000).toISOString() : null,
    replies: (raw.preview_child_comments ?? raw.child_comment?.preview_child_comments ?? []).map(normalizarComentario),
  };
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
    const stories = normalizarStories(bandeja);
    const fotosStories = new Map(stories.flatMap((story) => [[story.id, story.foto], [story.username, story.foto]]));
    const publicacoes = await completarFotosPerfil(tabId, normalizarFeed(feed, fotosStories));
    return { perfil: { id: String(user.pk ?? ""), username: user.username ?? "", nome: user.full_name ?? "", foto: user.profile_pic_url ?? user.profile_pic_url_hd ?? null }, feed: publicacoes, stories, nextMaxId: feed.next_max_id ?? null, hasMore: Boolean(feed.more_available && feed.next_max_id), atualizadoEm: new Date().toISOString() };
  }
  if (acao === "more") {
    const cursor = String(argumentos.cursor ?? "");
    if (!cursor || cursor.length > 8192) throw new Error("Cursor de feed inválido.");
    const seenPosts = String(argumentos.seenPosts ?? "").split(",").filter((id) => /^\d+(?:_\d+)?$/.test(id)).slice(-30).join(",");
    const feed = await requisicao(tabId, "/api/v1/feed/timeline/", "POST", { reason: "pagination", max_id: cursor, seen_posts: seenPosts, feed_view_info: "", is_pull_to_refresh: "0" });
    const posts = await completarFotosPerfil(tabId, normalizarFeed(feed));
    return { feed: posts, nextMaxId: feed.next_max_id ?? null, hasMore: Boolean(feed.more_available && feed.next_max_id) };
  }
  if (acao === "story") {
    const id = String(argumentos.userId ?? "");
    if (!/^\d{1,32}$/.test(id)) throw new Error("Perfil de Story inválido.");
    const fallbackUser = { pk: id, username: String(argumentos.username ?? ""), profile_pic_url: String(argumentos.foto ?? "") };
    const extrairItens = (payload) => {
      const reel = payload.reels?.[id] ?? payload.reels_media?.[id] ?? payload.reels_media?.find?.((item) => String(item.user?.pk ?? item.user_id ?? "") === id);
      const dono = reel?.user ?? fallbackUser;
      return (payload.items ?? payload.reel_items ?? reel?.items ?? []).map((item) => itemMidia(item, dono)).filter((item) => item?.urlMidia);
    };
    const payload = await requisicao(tabId, "/api/v1/feed/reels_media/", "POST", { user_ids: JSON.stringify([id]), source: "feed_timeline" });
    const items = extrairItens(payload);
    return { stories: items };
  }
  if (acao === "profile") {
    let id = String(argumentos.userId ?? "");
    const username = String(argumentos.username ?? "");
    if (!/^\d{1,32}$/.test(id) && argumentos.username) {
      const usernameInfo = await requisicao(tabId, `/api/v1/users/${encodeURIComponent(username)}/usernameinfo/`);
      id = String(usernameInfo.user?.pk ?? usernameInfo.user?.id ?? "");
    }
    if (!/^\d{1,32}$/.test(id)) throw new Error("Instagram did not return a profile id.");
    const [infoResult, posts] = await Promise.all([
      requisicao(tabId, "/graphql/query", "POST", { doc_id: "26672929172408668", fb_api_req_friendly_name: "PolarisProfilePageContentQuery", variables: JSON.stringify({ enable_integrity_filters: true, id, __relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider: true, __relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider: false, __relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider: false, __relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider: false }) }).catch(() => null),
      postsPerfil(tabId, username, id).catch(() => null),
    ]);
    const info = infoResult?.data?.user ? infoResult : await requisicao(tabId, `/api/v1/users/${id}/info/`).catch(() => null);
    if (!info && !posts) throw new Error("O Instagram limitou temporariamente as consultas deste perfil. Tente novamente em alguns minutos.");
    const user = info?.data?.user ?? info?.user ?? {};
    const fotoPerfil = user.hd_profile_pic_url_info?.url ?? user.profile_pic_url_hd ?? user.profile_pic_url ?? null;
    if (fotoPerfil) fotosPerfilCache.set(id, { url: fotoPerfil, atualizadoEm: Date.now(), source: "profile" });
    return { perfil: {
      id, username: user.username ?? username, nome: user.full_name ?? user.username ?? "",
      foto: fotoPerfil, biografia: user.biography ?? "",
      mediaCount: user.media_count == null ? null : Number(user.media_count), followers: user.follower_count == null ? null : Number(user.follower_count), following: user.following_count == null ? null : Number(user.following_count),
      feed: posts?.feed ?? [], cursor: posts?.cursor ?? null, hasMore: Boolean(posts?.hasMore),
    }, parcial: !user.pk && !user.id };
  }
  if (acao === "avatar") {
    const id = String(argumentos.userId ?? "");
    if (!/^\d{1,32}$/.test(id)) throw new Error("Perfil inválido para consultar foto.");
    const user = await infoPerfilWeb(tabId, id);
    const foto = user?.hd_profile_pic_url_info?.url ?? user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;
    if (foto) fotosPerfilCache.set(id, { url: foto, atualizadoEm: Date.now(), source: "profile" });
    return { foto };
  }
  if (acao === "profile_more") {
    const id = String(argumentos.userId ?? ""), username = String(argumentos.username ?? ""), cursor = String(argumentos.cursor ?? "");
    if (!/^\d{1,32}$/.test(id) || !cursor || cursor.length > 8192) throw new Error("Cursor do perfil inválido.");
    return postsPerfil(tabId, username, id, cursor);
  }
  if (acao === "comments") {
    const id = String(argumentos.mediaId ?? "");
    if (!/^\d+(?:_\d+)?$/.test(id)) throw new Error("Publicação inválida para consultar comentários.");
    const payload = await requisicao(tabId, `/api/v1/media/${id}/comments/?can_support_threading=true&permalink_enabled=false`);
    return { comments: (payload.comments ?? payload.items ?? []).map(normalizarComentario) };
  }
  if (acao === "like" || acao === "unlike") {
    const id = String(argumentos.mediaId ?? "").split("_")[0];
    if (!/^\d{1,32}$/.test(id)) throw new Error("Publica??o inv?lida para curtir.");
    const shortcode = String(argumentos.permalink ?? "").match(/^https:\/\/www\.instagram\.com\/(?:p|reel|reels)\/([\w-]+)\/?/)?.[1];
    if (!shortcode) throw new Error("Esta publicação não tem um link válido para curtir.");
    const [resultado] = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN", args: [shortcode, acao === "like"],
      func: async (code, gostar) => {
        const article = [...document.querySelectorAll("article")].find((item) =>
          [...item.querySelectorAll('a[href]')].some((link) => link.getAttribute("href")?.match(new RegExp(`^/(?:p|reel|reels)/${code}/?$`)))
        );
        if (!article) return { erro: "Publicação fora do feed carregado na aba existente do Instagram." };
        const estado = () => article.querySelector('svg[aria-label="Unlike"]') ? true : article.querySelector('svg[aria-label="Like"]') ? false : null;
        const atual = estado();
        if (atual === null) return { erro: "Controle de curtida indisponível nesta publicação." };
        if (atual !== gostar) {
          const icone = article.querySelector(`svg[aria-label="${gostar ? "Like" : "Unlike"}"]`);
          icone?.closest('button, [role="button"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 2200));
        }
        return estado() === gostar ? { liked: gostar } : { erro: "O Instagram não confirmou a curtida. A sessão pode precisar de atualização." };
      },
    });
    if (resultado?.result?.erro) throw new Error(resultado.result.erro);
    if (resultado?.result?.liked !== (acao === "like")) throw new Error("Não foi possível confirmar a curtida.");
    return resultado.result;
  }
  if (acao === "comment") {
    const id = String(argumentos.mediaId ?? ""), text = String(argumentos.text ?? "").trim();
    const replyId = String(argumentos.replyToCommentId ?? "");
    if (replyId && !/^\d{1,32}$/.test(replyId)) throw new Error("Comentário de origem inválido.");
    if (!/^\d+(?:_\d+)?$/.test(id)) throw new Error("Publicação inválida para comentar.");
    if (!text || text.length > 2200) throw new Error("Escreva um comentário de até 2.200 caracteres.");
    const payload = await requisicao(tabId, `/api/v1/media/${id}/comment/`, "POST", { comment_text: text, ...(replyId ? { replied_to_comment_id: replyId } : {}) });
    const comment = payload.comment ?? payload.comment_full ?? {};
    return { comment: normalizarComentario(comment) };
  }
  if (acao === "story_like" || acao === "story_unlike") {
    const id = String(argumentos.mediaId ?? "").split("_")[0];
    if (!/^\d{1,32}$/.test(id)) throw new Error("Story inválido para curtir.");
    const gostar = acao === "story_like";
    const result = await requisicao(tabId, "/api/graphql", "POST", { doc_id: gostar ? "26938887309082050" : "26510485515280697", fb_api_req_friendly_name: gostar ? "usePolarisStoriesV4LikeMutationLikeMutation" : "usePolarisStoriesV4LikeMutationUnlikeMutation", variables: JSON.stringify({ input: { actor_id: "$ACTOR_ID", client_mutation_id: "5", media_id: id } }) });
    if (!result.data?.[gostar ? "xig_send_story_like" : "xig_unsend_story_like"]) throw new Error("O Instagram não confirmou a curtida do Story.");
    return { liked: acao === "story_like" };
  }
  if (acao === "story_reply") {
    const mediaId = String(argumentos.mediaId ?? ""), userId = String(argumentos.userId ?? ""), text = String(argumentos.text ?? "").trim();
    if (!/^\d{1,32}(?:_\d{1,32})?$/.test(mediaId) || !/^\d{1,32}$/.test(userId)) throw new Error("Story ou destinatário inválido.");
    if (!text || text.length > 1000) throw new Error("Escreva uma resposta de até 1.000 caracteres.");
    const reaction = argumentos.reaction === "1";
    if (reaction && !["😂", "😮", "😍", "😢", "👏", "🔥", "🎉", "💯"].includes(text)) throw new Error("Reação inválida.");
    const context = ((BigInt(Date.now()) << 22n) | BigInt(Math.floor(Math.random() * 2 ** 22))).toString();
    const result = await requisicao(tabId, "/api/graphql", "POST", { doc_id: "26536543495958378", fb_api_req_friendly_name: "IGDirectStoryShareReplyMutation", variables: JSON.stringify({ send_data: { forwarded_from_thread_id: null, is_forwarded_from_own_message: null, offline_threading_id: context, recipient_users: JSON.stringify([userId]), thread_id: null }, data: { is_shh_mode: false, media_id: mediaId.split("_")[0], reaction_emoji: reaction ? text : null, reel_id: userId, sampled: false, share_client_context: context, text: reaction ? null : text } }) });
    if (!result.data?.direct_story_share_reply_with_slide_message_response) throw new Error("O Instagram não confirmou a resposta ao Story.");
    return { sent: true };
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
