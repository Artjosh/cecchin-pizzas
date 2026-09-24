"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { centavosDoTexto } from "../../lib/infinitepay";

export type PrecosReserva = { adulto_centavos: number; crianca_centavos: number; sinal_percentual: number; minimo_adultos: number; taxa_11_centavos: number; taxa_14_centavos: number; taxa_22_centavos: number; taxa_78_centavos: number };
const campos = [ ["adulto", "Adulto (R$)"], ["crianca", "Criança (R$)"], ["sinal", "Sinal (%)"], ["minimo", "Mínimo de adultos"], ["taxa_11", "Deslocamento: 11 km (R$)"], ["taxa_14", "Deslocamento: 14 km (R$)"], ["taxa_22", "Deslocamento: 22 km (R$)"], ["taxa_78", "Deslocamento: 78 km (R$)"] ] as const;
export function ConfigurarPrecosReserva({ inicial, admin }: { inicial: PrecosReserva | null; admin: boolean }) {
 const router = useRouter();
 const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(campos.map(([chave]) => {
  const valor = inicial?.[(chave === "sinal" ? "sinal_percentual" : chave === "minimo" ? "minimo_adultos" : `${chave}_centavos`) as keyof PrecosReserva];
  return [chave, valor === undefined ? "" : ["sinal", "minimo"].includes(chave) ? String(valor) : (valor / 100).toFixed(2).replace(".", ",")];
 })));
 const [ocupado, setOcupado] = useState(false); const [mensagem, setMensagem] = useState("");
 return <form className="rounded-xl border border-outline-variant p-4 space-y-3" onSubmit={async e => {
  e.preventDefault(); setOcupado(true); setMensagem("");
  try {
   const dados = Object.fromEntries(campos.map(([c]) => [c, ["sinal", "minimo"].includes(c) ? Number(valores[c]) : /^0([,.]0{1,2})?$/.test(valores[c]) ? 0 : centavosDoTexto(valores[c])]));
   const r = await fetch("/api/operacao/precos-reserva", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
   const b = await r.json(); if (!r.ok) throw new Error(b.mensagem);
   setMensagem("Preços salvos."); router.refresh();
  } catch (err) { setMensagem(err instanceof Error ? err.message : "Falha ao salvar."); } finally { setOcupado(false); }
 }}>
  <h2 className="font-bold">Preços de pré-agendamento</h2>
  <p className="text-sm">Tabela usada para calcular o sinal no site e no WhatsApp. Alterações não modificam cobranças já emitidas.</p>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{campos.map(([c, titulo]) => <label key={c} className="text-sm">{titulo}<input required inputMode="decimal" disabled={!admin || ocupado} value={valores[c]} onChange={e => setValores(v => ({ ...v, [c]: e.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2" /></label>)}</div>
  <p className="text-sm text-on-surface-variant">Entre as faixas, o deslocamento é interpolado. Abaixo de 11 km e acima de 78 km, utiliza o valor da extremidade.</p>
  {admin && <button disabled={ocupado} className="rounded-lg bg-primary px-4 py-2 text-on-primary">{ocupado ? "Salvando…" : "Salvar preços"}</button>}
  <p role="status">{mensagem}</p>
 </form>;
}
