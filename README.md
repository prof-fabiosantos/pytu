# PYTU — Inteligência ambiental para a Amazônia

Piloto de comunicação ambiental para Manaus: mapa de sensores, detecções de fogo, estimativa regional de PM2,5 e conversa em linguagem simples com o Agente Amazônia.

**Aplicação:** https://pytu.ia.br · **Autor:** Prof. Dr. Fabio Santos · **Afiliação:** EST/UEA e LSI · **Contato:** fssilva@uea.edu.br

## Executar localmente

Requer Node.js 22 ou superior e npm.

```sh
git clone https://github.com/prof-fabiosantos/pytu.git
cd pytu
npm ci
```

Copie `.env.example` para `.env` e preencha as chaves. No PowerShell: `Copy-Item .env.example .env`.

```sh
npm start
```

Abra http://127.0.0.1:8766. O comando prepara o diretório de dados sem sobrescrever caches existentes. O cadastro inicial contém somente identificadores, nomes e coordenadas públicas de 13 sensores, sem leituras ambientais antigas. A primeira coleta consulta as fontes reais. Sem credenciais ou sem resposta válida, os recursos correspondentes ficam indisponíveis.

| Variável | Uso |
| --- | --- |
| `GEMINI_API_KEY` | Conversa com Gemini 2.5 Flash |
| `PURPLEAIR_API_KEY` | Chave de leitura dos sensores PurpleAir |
| `TYPESAFE_API_KEY` | Classificação auxiliar Jev / TypeSafe |
| `PORT` | Porta local; padrão 8766 |
| `BLOB_READ_WRITE_TOKEN` | Persistência privada na implantação Vercel |
| `CRON_SECRET` | Autorização da coleta agendada na Vercel |

Credenciais ficam exclusivamente no servidor. Chamadas às APIs podem consumir créditos ou gerar cobrança. O projeto não consulta saldo nem garante a duração de créditos gratuitos.

## Fontes e limites

- **PurpleAir:** 13 sensores externos no cadastro inicial; consultas posteriores com `show_only`, `location_type=0` e campos `pm2.5_10minute,humidity,last_seen`. Uma tentativa por hora. Média de dez minutos sem correção EPA, calibração local ou comparação dos canais A/B. Um ponto não representa todo um bairro. Último contato não é o horário exato da janela de medição.
- **CAMS Global / Open-Meteo:** referência regional próxima de Manaus, resolução aproximada de 45 km, produto nativo de três horas disponibilizado em série horária. A mesma série é usada para todos os bairros; não há estimativa independente por bairro. Horário de emissão não disponível no conector.
- **INPE:** arquivos diários do dia corrente e anterior, filtrados para Amazonas e janela móvel de 24 horas UTC. Remove IDs duplicados; agrega detecções de todos os satélites. Não são incêndios únicos, área queimada ou contribuição para a fumaça. Arquivo corrente parcial.
- **GeoManaus / Prefeitura de Manaus / IMPLURB:** polígonos de 64 bairros, utilizados para associação geográfica dos sensores.
- **OMS:** referência para orientações gerais sobre fumaça e saúde. O agente não substitui aconselhamento individual ou alertas oficiais.

Não há integração operacional com SELVA, previsão própria, dados de vento, atribuição causal da fumaça ou previsão de queimadas. PM2,5 total não confirma origem em queimadas. Dados ausentes não são substituídos por valores sintéticos. Os arquivos reais de teste nunca alimentam a produção.

### Atualidade e faixas indicativas

Após duas horas, dados sem atualização são sinalizados como desatualizados. Sensores também dependem da idade de último contato. Uma divergência entre relógio local e PurpleAir gera aviso; a idade considera o horário da resposta e o tempo decorrido localmente. Horários originais são preservados.

O Jev (`jev-latest`) sugere classes: Boa 0–25; Moderada >25–50; Ruim >50–75; Muito ruim >75–125; Péssima >125 µg/m³. Uma regra numérica confere cada resposta. Divergências são rejeitadas e o cache fica vinculado ao valor e horário exatos. Sem resultado válido, não se inventa classe substituta.

**Essas faixas não são IQAr oficial nem declaração de conformidade regulatória.** A escala histórica de referência pressupõe 24 horas; os sensores aqui fornecem dez minutos e o modelo fornece pontos horários. Nenhuma classe libera a prática de exercícios ou determina a segurança individual. A versão retornada pelo Jev fica registrada; o alias pode mudar.

A comparação temporal CAMS usa diferença de seis horas e limiar descritivo `max(2 µg/m³, 10%)`. Não é tendência observada, limiar médico ou teste estatístico. Consultas horárias de uma média de dez minutos não produzem média horária ou diária.

## Implantação na Vercel

O arquivo `vercel.json` configura funções Node.js, frontend estático, testes no build e uma tarefa diária às 08:00 UTC (sujeita à tolerância do plano). Importe este repositório na Vercel e configure as variáveis da tabela. Conecte um armazenamento Vercel Blob **privado**.

Para uma nova instalação, configure o token do Blob correspondente no ambiente local e execute uma vez:

```sh
npm run init:cloud
```

O comando cria `pytu/evidence.json` e `pytu/chat-budget.json` somente se não existirem. Não sobrescreve dados ou contadores existentes, não copia caches locais e não publica leituras antigas. Depois, publique o projeto. A primeira consulta a `/api/evidence` buscará as fontes reais.

Na produção existente esses documentos já estão configurados. A atualização ocorre no primeiro acesso após uma hora, com cache compartilhado e escritas condicionais por ETag. **Sem acesso, não há promessa de coleta horária contínua.** O cron diário complementa esse mecanismo. O chat possui orçamento compartilhado de 100 tentativas por dia UTC e seis por minuto. A rota de coleta exige `CRON_SECRET`.

O servidor local utiliza arquivos em `data/` e deve ter somente uma instância sobre esse diretório. Ele coleta enquanto está ligado. Hospedar apenas `dist/` não disponibiliza a conversa nem a coleta de dados.

## Estrutura

```text
api/index.mjs          rotas serverless
server.mjs             servidor HTTP local
sources.mjs            CAMS/Open-Meteo e INPE
purpleair.mjs          sensores, validade e associação a bairros
classification.mjs     integração Jev e conferência numérica
agent-instructions.mjs instruções de fundamentação do agente
cloud.mjs              persistência Blob e limites compartilhados
locations.mjs          resolução de bairros
config/sensors.json    metadados públicos iniciais, sem leituras
scripts/               preparação local e inicialização de novo Blob
dist/                  interface, cartografia e Leaflet
tests/                 testes automatizados e respostas reais arquivadas
```

`.env*` (exceto o exemplo vazio), caches, dependências instaladas e metadados locais dos provedores ficam fora do Git. Conversas não são gravadas pelo servidor; conteúdo enviado ao Gemini está sujeito às políticas do provedor. A interface inclui Vercel Web Analytics, cuja ativação depende do painel da hospedagem.

## Verificação

```sh
npm test
```

Os testes cobrem valores e horários reais, ausências, validade temporal, janela e duplicatas INPE, classes de concentração, rejeição de respostas Jev, controle de tentativas e ETag. Não comprovam acurácia ambiental, fidelidade de todas as respostas da IA nem benefício aos usuários. Estudos com especialistas e moradores ainda são necessários.

## Referências e atribuições

- [CAMS / Open-Meteo](https://open-meteo.com/en/docs/air-quality-api)
- [PurpleAir](https://community.purpleair.com/t/api-fields-descriptions/4652)
- [INPE — arquivos diários](https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/)
- [GeoManaus — bairros](https://pmm.manaus.am.gov.br/arcgis/rest/services/TESTES/GeoManaus_Consulta/FeatureServer/0)
- [OMS — incêndios e saúde](https://www.who.int/news-room/fact-sheets/detail/wildfires-and-health)
- [TypeSafe](https://docs.typesafe.ai/introduction/quickstart)
- [CETESB — referência histórica de 24 horas](https://datageo.ambiente.sp.gov.br/geoportal/catalog/search/resource/details.page?uuid=%7B6E506423-23E9-4944-928E-BB3D7079224A%7D)
- Cartografia © colaboradores OpenStreetMap; biblioteca Leaflet 1.9.4, com licença própria.

As fontes e serviços possuem condições de uso próprias; disponibilidade pública não elimina essas condições. Este repositório não atribui uma nova licença aos dados de terceiros.
