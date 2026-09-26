export type InstagramBrowserItem = {
  id: string;
  userId?: string;
  username: string;
  nome: string;
  fotoPerfil: string | null;
  legenda: string;
  tipo: "image" | "video";
  duracaoSegundos?: number | null;
  urlMidia: string | null;
  miniatura: string | null;
  permalink: string | null;
  timestamp: string | null;
  likes: number;
  gostei: boolean;
  comentarios: number;
  assets?: { urlMidia: string; tipo: "image" | "video" }[];
};

export type InstagramBrowserComment = { id: string; userId?: string; username: string; text: string; timestamp: string | null; replies?: InstagramBrowserComment[] };

export type InstagramBrowserProfile = { id: string; username: string; nome: string; foto: string | null; biografia: string; mediaCount: number | null; followers: number | null; following: number | null; feed: InstagramBrowserItem[]; cursor?: string | null; hasMore?: boolean };

export type InstagramBrowserStory = {
  id: string;
  username: string;
  nome: string;
  foto: string | null;
  atualizadoEm: string | null;
  temStory: boolean;
};

export type InstagramBrowserHome = {
  perfil: { id: string; username: string; nome: string; foto: string | null };
  feed: InstagramBrowserItem[];
  stories: InstagramBrowserStory[];
  nextMaxId?: string | null;
  hasMore?: boolean;
  atualizadoEm: string;
};

type Acao = "ping" | "home" | "more" | "story" | "story_like" | "story_unlike" | "story_reply" | "profile" | "profile_more" | "avatar" | "comments" | "comment" | "like" | "unlike";

export function instagramViaNavegador<T>(acao: Acao, argumentos: Record<string, string> = {}): Promise<T> {
  if (typeof window === "undefined") return Promise.reject(new Error("Instagram pelo navegador só está disponível no cliente."));
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const encerrar = (fn: () => void) => {
      window.removeEventListener("message", receber);
      window.clearTimeout(timer);
      fn();
    };
    const receber = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.canal !== "cecchin-instagram-bridge" || event.data?.id !== id) return;
      if (!("resposta" in event.data) && !event.data.erro) return;
      if (event.data.erro) return encerrar(() => reject(new Error(String(event.data.erro))));
      const resposta = event.data.resposta;
      if (resposta?.erro) return encerrar(() => reject(new Error(String(resposta.erro))));
      encerrar(() => resolve(resposta?.data as T));
    };
    const timer = window.setTimeout(() => encerrar(() => reject(new Error("Extensão Cecchin Instagram Bridge não respondeu a tempo."))), acao === "ping" ? 1_500 : acao === "like" || acao === "unlike" ? 35_000 : 20_000);
    window.addEventListener("message", receber);
    window.postMessage({ canal: "cecchin-instagram-bridge", id, acao, argumentos }, window.location.origin);
  });
}
