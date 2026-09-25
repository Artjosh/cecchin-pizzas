export type InstagramBrowserItem = {
  id: string;
  username: string;
  nome: string;
  fotoPerfil: string | null;
  legenda: string;
  tipo: "image" | "video";
  urlMidia: string | null;
  miniatura: string | null;
  permalink: string | null;
  timestamp: string | null;
  likes: number;
  comentarios: number;
  assets?: { urlMidia: string; tipo: "image" | "video" }[];
};

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
  atualizadoEm: string;
};

type Acao = "ping" | "home" | "story";

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
    const timer = window.setTimeout(() => encerrar(() => reject(new Error("Extensão Cecchin Instagram Bridge não encontrada."))), acao === "ping" ? 1_500 : 20_000);
    window.addEventListener("message", receber);
    window.postMessage({ canal: "cecchin-instagram-bridge", id, acao, argumentos }, window.location.origin);
  });
}
