import {
  EditarLocalidades,
  type LocalidadeEditavel,
} from "../components/EditarLocalidades";
import {
  CabecalhoDoPainel,
  FalhaDeLeitura,
  LacunaDeDados,
  SemLinhas,
} from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

interface JanelaPico {
  inicio: string;
  fim: string;
}

/**
 * A configuração de taxa e tempo de estrada, que alimenta o orçamento e a
 * hora de saída. A escrita acontece com o token da gestão para a RLS valer.
 */
export async function LocalidadesView() {
  const sessao = await exigirPapel(["gestao"]);
  const [localidadesR, pico] = await Promise.all([
    consultar<LocalidadeEditavel[]>(
      "localidade?select=id,cidade,bairro,uf,valor,minutos_normal,minutos_pico,ativa" +
        "&order=cidade.asc,bairro.asc&limit=1000",
      sessao.accessToken,
    ),
    consultar<JanelaPico[]>(
      "janela_pico?select=inicio,fim&limit=1",
      sessao.accessToken,
    ),
  ]);
  const leitura = comoLeitura(localidadesR);
  const linhas = leitura.estado === "ok" ? leitura.linhas : [];
  const semTempo = linhas.filter((l) => l.minutos_normal === null).length;
  const semValor = linhas.filter((l) => l.valor === null || Number(l.valor) === 0).length;

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Localidades"
        descricao="Onde a equipe atende, quanto custa chegar e quanto tempo leva."
        contagem={leitura.estado === "ok" ? linhas.length : null}
      />

      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}
      {leitura.estado === "vazio" && (
        <SemLinhas titulo="Nenhuma localidade" detalhe="Vêm da carga da planilha, da aba de deslocamento." />
      )}

      {leitura.estado === "ok" && (
        <>
          {(semTempo > 0 || semValor > 0) && (
            <LacunaDeDados titulo="Nem toda localidade está completa">
              <p>
                {semValor > 0 && <><strong>{semValor}</strong> sem taxa de deslocamento. </>}
                {semTempo > 0 && <><strong>{semTempo}</strong> sem tempo de estrada. </>}
                Deixe em branco até a regra estar confirmada; não há estimativa escondida.
              </p>
            </LacunaDeDados>
          )}
          <EditarLocalidades
            localidades={linhas}
            inicioPico={pico.dados?.[0]?.inicio}
            fimPico={pico.dados?.[0]?.fim}
          />
        </>
      )}
    </div>
  );
}
