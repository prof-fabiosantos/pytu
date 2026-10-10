# PYTU — Inteligência ambiental para a Amazônia

Piloto de comunicação ambiental para Manaus: mapa de sensores, detecções de fogo, estimativa regional de PM2,5 e conversa em linguagem simples com o Agente Amazônia.

**Aplicação:** https://pytu.ia.br · **Autor:** Prof. Dr. Fabio Santos · **Afiliação:** EST/UEA e LSI · **Contato:** fssilva@uea.edu.br

## Instalação e execução local

### 1. Pré-requisitos

- Git para clonar o repositório.
- **Node.js 24** e npm. Esta é a versão usada na verificação da aplicação; o projeto declara Node.js >=22, mas versões antigas dessa linha podem não reconhecer a opção `--env-file-if-exists`.
- Acesso à internet para consultar fontes ambientais e serviços de IA.
- Chaves das APIs para os recursos que deseja habilitar (veja a tabela abaixo).

Confira as ferramentas no terminal:

```sh
node --version
npm --version
git --version
```

### 2. Baixar o projeto e instalar as dependências

```sh
git clone https://github.com/prof-fabiosantos/pytu.git
cd pytu
npm ci
```

Execute os próximos comandos nessa pasta, onde está o arquivo `package.json`. Não é necessário instalar Python, banco de dados ou Vercel CLI para rodar localmente.

### 3. Configurar as chaves

Crie o arquivo `.env` a partir do exemplo **apenas na primeira instalação**, para não sobrescrever sua configuração.

**Windows / PowerShell:**

```powershell
Copy-Item .env.example .env
notepad .env
```

**Linux / macOS:**

```sh
cp .env.example .env
```

Abra `.env` em um editor e preencha os valores depois de `=`. Não coloque chaves no código nem envie esse arquivo para o GitHub.

| Variável | Configuração local | Finalidade |
| --- | --- | --- |
| `GEMINI_API_KEY` | Necessária para o agente | Conversa com Gemini 2.5 Flash |
| `PURPLEAIR_API_KEY` | Necessária para sensores | Chave de leitura da API PurpleAir |
| `TYPESAFE_API_KEY` | Necessária para as faixas indicativas | Classificação Jev / TypeSafe, conferida por regras numéricas |
| `PORT` | `8766` no exemplo | Porta HTTP local |
| `BLOB_READ_WRITE_TOKEN` | Deixe vazio para uso local | Persistência privada na Vercel |
| `CRON_SECRET` | Deixe vazio para uso local | Autorização da coleta agendada na Vercel |

CAMS/Open-Meteo e os arquivos INPE utilizados pelo projeto não exigem chave nesta integração. Sem uma chave de IA ou PurpleAir, o respectivo recurso fica indisponível; o sistema não cria dados de exemplo. Chamadas às APIs podem consumir créditos ou gerar cobrança. O projeto não consulta saldo nem garante duração de créditos gratuitos.

### 4. Iniciar o PYTU

```sh
npm start
```

Aguarde o terminal mostrar o endereço do servidor. A primeira inicialização pode demorar enquanto consulta as fontes. Abra:

- **Mapa e agente:** http://127.0.0.1:8766/
- **Dashboard histórico:** http://127.0.0.1:8766/historico.html

Mantenha o terminal aberto. Para encerrar, pressione **Ctrl+C**. Após alterar as chaves no `.env`, reinicie o servidor. Se mudar `PORT`, use a nova porta no endereço.

`npm start` executa automaticamente a preparação de `data/`, preservando caches existentes. O cadastro inicial contém apenas identificadores, nomes e coordenadas públicas de 13 sensores, sem leituras ambientais antigas. As coletas usam fontes reais.

O servidor fica vinculado a `127.0.0.1`, para acesso no próprio computador. Abrir o HTML diretamente ou hospedar somente `dist/` não disponibiliza a API, o agente nem o histórico.

### 5. Conferir a instalação

```sh
npm test
```

Os testes usam recortes reais arquivados e verificações locais; não precisam das chaves de API. Na interface, confira os horários das fontes e teste uma pergunta ao agente. O histórico começa com as coletas disponíveis e pode inicialmente mostrar apenas um ponto.

Para verificar a API pelo PowerShell, com o servidor em execução:

```powershell
Invoke-RestMethod http://127.0.0.1:8766/api/evidence
```

### Comandos disponíveis

| Comando | O que faz |
| --- | --- |
| `npm ci` | Instala as versões de dependências do lockfile |
| `npm start` | Prepara os arquivos locais e inicia o servidor |
| `npm run setup` | Prepara o cadastro de sensores sem iniciar o servidor |
| `npm test` | Executa a suíte de testes |
| `npm run init:cloud` | Inicializa um Blob privado para uma nova implantação Vercel; não é necessário localmente |

### Uso e persistência

- Escolha um bairro ou clique em **Usar minha localização**. A identificação ocorre no navegador; as coordenadas não são armazenadas nem enviadas ao agente. A permissão pode ser recusada e a seleção manual continua disponível.
- Abra **Histórico** para consultar até 31 dias por vez, filtrar bairro/sensor ou município e baixar CSV por dia ou período.
- Localmente, caches e histórico ficam em `data/`; faça backup dessa pasta se quiser preservar a série. Use somente uma instância do servidor por diretório de dados.
- O histórico local e o histórico da Vercel são independentes: rodar o projeto no computador não baixa automaticamente o arquivo de produção.

### Problemas comuns

| Sintoma | O que conferir |
| --- | --- |
| `node` ou `npm` não encontrado | Instale Node.js e reabra o terminal |
| Opção `--env-file-if-exists` desconhecida | Atualize para Node.js 24 |
| PowerShell bloqueia `npm.ps1` | Use `npm.cmd ci`, `npm.cmd start` ou `npm.cmd test` |
| Porta em uso / `EADDRINUSE` | Encerre a outra instância ou altere `PORT` no `.env` |
| Agente indisponível | Confira `GEMINI_API_KEY`, acesso à API e cota do provedor |
| Sensores ou classificação indisponíveis | Confira as chaves PurpleAir/TypeSafe, cotas, horários e mensagens das fontes |
| Histórico vazio | Aguarde uma coleta válida; não há preenchimento retroativo automático |
| Localização recusada ou imprecisa | Escolha o bairro manualmente; em hospedagem, use HTTPS |

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
history.mjs            registros, deduplicação, datas e CSV
history-cloud.mjs      arquivo diário no Blob privado
history-local.mjs      arquivo diário local em data/history/
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

## Histórico ambiental

Acesse `/historico.html` pelo menu Histórico. A aplicação arquiva as coletas reais em documentos diários no fuso America/Manaus e gera CSV separados para ar e fogo. Na Vercel, os arquivos ficam no Blob privado em `pytu/history/v1/AAAA-MM-DD.json`, `AAAA-MM-DD-air.csv` e `AAAA-MM-DD-fire.csv`; localmente ficam em `data/history/`. O JSON é a fonte canônica; os CSV podem ser regenerados pela API.

`GET /api/history?start=AAAA-MM-DD&end=AAAA-MM-DD` retorna até 31 dias. Acrescente `&csv=air` ou `&csv=fire` para download de todas as observações do período (os filtros visuais não restringem o CSV).

A gravação acompanha a coleta já existente: primeiro acesso após uma hora, além da verificação diária configurada. Não há garantia de coleta horária sem acessos. O recurso não recupera automaticamente dados anteriores à ativação. Dados reais presentes no cache inicial, inclusive detecções do dia anterior, podem entrar na primeira gravação.

As observações são deduplicadas por fonte, sensor e horário; detecções usam identidade, coordenadas, horário e satélite. A primeira observação é preservada. Apenas o ponto corrente do CAMS é arquivado; previsões futuras não são registradas como observações passadas. Falhas de arquivo são sinalizadas em `evidence.history.error` e no mapa.

O gráfico de ar mostra a média aritmética das amostras disponíveis de um único sensor ou do CAMS, sem misturar as fontes. Isso não é uma média contínua de 24 horas nem IQAr oficial. PurpleAir usa último contato como referência temporal, não garantia do horário exato da média de 10 minutos. O CSV preserva avisos de divergência dos relógios. Contagens INPE têm cobertura parcial e não equivalem a incêndios únicos. Lacunas não são convertidas em zero.
