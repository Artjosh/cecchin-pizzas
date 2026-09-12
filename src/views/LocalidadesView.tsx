import { Clock, MapPin } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  FalhaDeLeitura,
  LacunaDeDados,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * As 579 localidades atendidas, com taxa e tempo de estrada.
 *
 * É a tabela que decide o preço do deslocamento e a hora de sair da base — as
 * duas informações que a tela de contratação hoje interpola de quatro pontos
 * chutados. Ligar isto substitui o palpite pela regra.
 *
 * `minutos_normal` e `minutos_pico` existem porque a Grande Porto Alegre tem
 * duas realidades de trânsito, e sair no horário errado significa forno frio.
 */

interface Localidade {
  id: string;
  cidade: string;
  bairro: string | null;
  uf: string | null;
  valor: string | number | null;
  minutos_normal: number | null;
  minutos_pico: number | null;
  ativa: boolean;
}

function comoMinutos(m: number | null): string {
  if (m === null) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${h}h${String(resto).padStart(2, "0")}` : `${h}h`;
}

export async function LocalidadesView() {
  const sessao = await exigirPapel(["gestao"]);

  const leitura = comoLeitura(
    await consultar<Localidade[]>(
      "localidade?select=id,cidade,bairro,uf,valor,minutos_normal,minutos_pico,ativa" +
        "&order=cidade.asc,bairro.asc&limit=1000",
      sessao.accessToken,
    ),
  );

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];

  const semTempo = linhas.filter((l) => l.minutos_normal === null).length;
  const semValor = linhas.filter(
    (l) => l.valor === null || Number(l.valor) === 0,
  ).length;

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Localidades"
        descricao="Onde a equipe atende, quanto custa chegar e quanto tempo leva."
        contagem={leitura.estado === "ok" ? linhas.length : null}
      />

      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}

      {leitura.estado === "vazio" && (
        <SemLinhas
          titulo="Nenhuma localidade"
          detalhe="Vêm da carga da planilha, da aba de deslocamento."
        />
      )}

      {leitura.estado === "ok" && (
        <>
          {(semTempo > 0 || semValor > 0) && (
            <LacunaDeDados titulo="Nem toda localidade está completa">
              {semValor > 0 && (
                <p>
                  <strong>{semValor}</strong> sem valor de deslocamento. A tela
                  de contratação interpola a taxa de quatro pontos conhecidos
                  enquanto isso — ver{" "}
                  <code className="font-mono">
                    src/views/booking/contexto.tsx
                  </code>
                  .
                </p>
              )}
              {semTempo > 0 && (
                <p>
                  <strong>{semTempo}</strong> sem tempo de estrada. Sem isso não
                  dá para calcular a hora de sair da base, e forno frio é evento
                  perdido.
                </p>
              )}
            </LacunaDeDados>
          )}

          <Tabela
            colunas={[
              "Cidade",
              "Bairro",
              "UF",
              "Deslocamento",
              "Normal",
              "Pico",
              "Situação",
            ]}
          >
            {linhas.map((l) => (
              <Linha key={l.id}>
                <Celula destaque>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-tertiary shrink-0" />
                    {l.cidade}
                  </span>
                </Celula>
                <Celula>{l.bairro ?? "—"}</Celula>
                <Celula>{l.uf ?? "—"}</Celula>
                <Celula destaque className="text-right whitespace-nowrap">
                  {l.valor !== null && Number(l.valor) > 0
                    ? formatBRL(Number(l.valor))
                    : "—"}
                </Celula>
                <Celula className="whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-tertiary shrink-0" />
                    {comoMinutos(l.minutos_normal)}
                  </span>
                </Celula>
                <Celula className="whitespace-nowrap">
                  {comoMinutos(l.minutos_pico)}
                </Celula>
                <Celula>
                  <Etiqueta tom={l.ativa ? "bom" : "neutro"}>
                    {l.ativa ? "atende" : "não atende"}
                  </Etiqueta>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        </>
      )}
    </div>
  );
}
