# PYTU — Inteligência ambiental para a Amazônia

Piloto de comunicação ambiental para Manaus: mapa de sensores, detecções de fogo, estimativa regional de PM2,5, histórico ambiental, IQAr FioAres/MonitorAr, previsão de calor e conversa em linguagem simples com o Agente Amazônia.

Documentação conferida com o código em 30/10/2026. A aplicação usa dados reais; ausência ou falha de uma fonte não é preenchida com dados sintéticos.

## Escolha do ambiente

- **Computador local:** Node.js e arquivos em `data/`; adequado para desenvolvimento e avaliação.
- **Vercel com Supabase:** caminho documentado para reproduzir a implantação atual, com funções serverless e armazenamento persistente separado.
- **Vercel com Blob privado:** alternativa suportada, sujeita às cotas do serviço.
- **Servidor próprio:** usa `server.mjs`, disco persistente e proxy HTTPS; veja as diferenças e a limitação de IQAr ao final.

O repositório contém código, configuração de exemplo e fixtures de testes, não as chaves nem o histórico de produção. Clonar o projeto não copia medições já arquivadas.

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
| `CRON_SECRET` | Deixe vazio para uso local | Segredo aleatório forte para autorizar a coleta na Vercel |
| `PYTU_STORAGE` | `blob` no exemplo; `supabase` para nuvem Supabase | Seleciona armazenamento dos módulos de nuvem; não migra os arquivos locais |
| `SUPABASE_URL` | URL do **seu** projeto, se usar Supabase | Substitua a URL existente no exemplo |
| `SUPABASE_SECRET_KEY` | Necessária quando usar Supabase | Chave secreta exclusiva do servidor; nunca chave publicável |
| `MONITORAR_ENDPOINT` | Opcional; endereço autorizado fornecido pela equipe | Habilita FioAres/MonitorAr; não divulgar seu valor |
| `MONITORAR_HISTORY_ENABLED` | `false` por padrão; `true` para arquivar | Habilita janela móvel de sete dias de IQAr |

CAMS/Open-Meteo e os arquivos INPE utilizados pelo projeto não exigem chave nesta integração. Sem uma chave de IA ou PurpleAir, o respectivo recurso fica indisponível; o sistema não cria dados de exemplo. Chamadas às APIs podem consumir créditos ou gerar cobrança. O projeto não consulta saldo nem garante duração de créditos gratuitos.

### 4. Iniciar o PYTU

```sh
npm start
```

Aguarde o terminal mostrar o endereço do servidor. A primeira inicialização pode demorar enquanto consulta as fontes. Abra:

- **Mapa e agente:** http://127.0.0.1:8766/
- **Dashboard histórico:** http://127.0.0.1:8766/historico.html
- **Calor:** http://127.0.0.1:8766/calor.html

O gráfico de IQAr tem uma limitação de rota no servidor local desta versão; veja “Servidor próprio e diferenças da execução local”.

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
| `npm run init:cloud` | Inicializa documentos de controle no Supabase ou Blob selecionado; não é necessário para o histórico local |

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

O módulo Calor fornece vento e previsões meteorológicas regionais via Open-Meteo. Não há integração operacional com SELVA, previsão própria, modelagem de transporte ou atribuição causal da fumaça, nem previsão de queimadas. PM2,5 total não confirma origem em queimadas. Dados ausentes não são substituídos por valores sintéticos. Os arquivos reais de teste nunca alimentam a produção.

### Atualidade e faixas indicativas

Após duas horas, dados sem atualização são sinalizados como desatualizados. Sensores também dependem da idade de último contato. Uma divergência entre relógio local e PurpleAir gera aviso; a idade considera o horário da resposta e o tempo decorrido localmente. Horários originais são preservados.

O Jev (`jev-latest`) sugere classes: Boa 0–25; Moderada >25–50; Ruim >50–75; Muito ruim >75–125; Péssima >125 µg/m³. Uma regra numérica confere cada resposta. Divergências são rejeitadas e o cache fica vinculado ao valor e horário exatos. Sem resultado válido, não se inventa classe substituta.

**Essas faixas não são IQAr oficial nem declaração de conformidade regulatória.** A escala histórica de referência pressupõe 24 horas; os sensores aqui fornecem dez minutos e o modelo fornece pontos horários. Nenhuma classe libera a prática de exercícios ou determina a segurança individual. A versão retornada pelo Jev fica registrada; o alias pode mudar.

A comparação temporal CAMS usa diferença de seis horas e limiar descritivo `max(2 µg/m³, 10%)`. Não é tendência observada, limiar médico ou teste estatístico. Consultas horárias de uma média de dez minutos não produzem média horária ou diária.

## Implantação na Vercel com Supabase

Este é o roteiro para uma instalação nova. Não substitua as variáveis ou o armazenamento de uma implantação existente sem backup.

1. Clone a versão desejada, execute `npm ci` e `npm test`. Use a pasta que contém `package.json`, `vercel.json` e `api/` como raiz do projeto.
2. Crie um projeto Supabase próprio. No SQL Editor, execute [supabase/schema.sql](supabase/schema.sql). Ele cria `public.pytu_documents`, ativa RLS e restringe acesso aos papéis de cliente. A chave secreta fica somente no servidor.
3. No `.env` local, configure `PYTU_STORAGE=supabase`, `SUPABASE_URL` do novo projeto e `SUPABASE_SECRET_KEY`. Execute `npm run init:cloud`. O script cria apenas documentos de controle ausentes: `pytu/evidence.json` e `pytu/chat-budget.json`. Não sobrescreve registros existentes nem importa medições.
4. Na Vercel, importe o repositório GitHub e selecione a branch de produção pretendida, normalmente `main`. O arquivo `vercel.json` define framework nulo, build `npm test`, saída `dist`, funções em `api/` e reescrita das rotas. Não publique somente a pasta `dist`.
5. Em Environment Variables, ambiente **Production**, configure as três variáveis Supabase e as chaves `GEMINI_API_KEY`, `PURPLEAIR_API_KEY` e `TYPESAFE_API_KEY`. Configure também um `CRON_SECRET` aleatório e forte. Para MonitorAr, adicione o endereço autorizado em `MONITORAR_ENDPOINT` e `MONITORAR_HISTORY_ENABLED=true` se desejar arquivar IQAr. Não prefixe segredos para exposição no frontend.
6. Publique. Mudanças em variáveis exigem nova implantação. Confirme o estado Ready e execute a verificação pós-deploy abaixo. Conecte o domínio próprio no painel da Vercel e configure o DNS conforme as instruções exibidas para esse domínio.
7. Não conecte implantações de teste a um armazenamento de produção por padrão. Use configuração isolada e deixe MonitorAr desabilitado nos previews, evitando consultas duplicadas à fonte.

Para publicar manualmente com Vercel CLI instalado e autenticado, a partir da raiz do projeto:

```sh
vercel link
vercel deploy --prod
```

Confira equipe e projeto antes de confirmar. O login da CLI não transfere automaticamente o `.env` local para as variáveis de produção. Pelo GitHub, um push/merge na branch configurada inicia o deploy se a integração estiver habilitada.

### Alternativa: Blob privado

Configure `PYTU_STORAGE=blob` e `BLOB_READ_WRITE_TOKEN` de um store **privado**, tanto para inicialização quanto na Vercel. Execute `npm run init:cloud` e siga os mesmos passos de chaves e publicação. Não é necessário configurar Supabase nesse modo. Trocar a variável de armazenamento não migra dados. Cotas esgotadas podem interromper leituras e gravações; monitore consumo e preserve o store anterior.

### Coleta e limites operacionais

O cron de `vercel.json` é `0 8 * * *`: uma verificação diária às **08:00 UTC / 04:00 Manaus / 05:00 Brasília**, sujeita à execução do provedor. Não é um cron horário. A rota `GET /api/collect` exige cabeçalho `Authorization: Bearer <CRON_SECRET>`; não coloque o segredo na URL.

Na Vercel, a coleta também ocorre sob demanda, no primeiro acesso elegível após uma hora. Cache compartilhado e reservas condicionais controlam concorrência. **Sem acessos, não há garantia de coleta horária.** Atualização da fonte, consulta do PYTU e exibição após cache têm horários diferentes. Recarregar a página não força uma nova medição. Falha de armazenamento pode impedir consulta às fontes para preservar o controle de frequência.

O agente da versão serverless usa Gemini 2.5 Flash e um orçamento compartilhado de 100 tentativas por dia UTC e seis por minuto. Limites e cobranças dos provedores continuam aplicáveis. Nenhum crédito gratuito ou custo zero é garantido.

## Estrutura

```text
api/index.mjs          rotas serverless
server.mjs             servidor HTTP local
sources.mjs            CAMS/Open-Meteo e INPE
purpleair.mjs          sensores, validade e associação a bairros
classification.mjs     integração Jev e conferência numérica
agent-instructions.mjs instruções de fundamentação do agente
cloud.mjs              coleta de nuvem e limites compartilhados
document-store.mjs     armazenamento Supabase/Blob com revisão condicional
monitorar.mjs          IQAr FioAres/MonitorAr e controle de consultas
monitorar-history.mjs  janela móvel de sete dias de IQAr
heat*.mjs              previsão meteorológica e caches local/nuvem
locations.mjs          resolução de bairros
history.mjs            registros, deduplicação, datas e CSV
history-cloud.mjs      arquivo diário no armazenamento de nuvem selecionado
history-local.mjs      arquivo diário local em data/history/
config/sensors.json    metadados públicos iniciais, sem leituras
supabase/schema.sql    tabela privada de documentos
scripts/               preparação local e inicialização de documentos de nuvem
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

Acesse `/historico.html` pelo menu Histórico. A aplicação arquiva as coletas reais em documentos diários no fuso America/Manaus e gera CSV separados para ar e fogo. Com Blob, os arquivos ficam no store privado em `pytu/history/v1/AAAA-MM-DD.json`, `AAAA-MM-DD-air.csv` e `AAAA-MM-DD-fire.csv`; localmente ficam em `data/history/`. No Supabase, os documentos ficam em JSONB na tabela `pytu_documents`, e os CSV são gerados pela API. O JSON é a fonte canônica; downloads CSV não substituem um backup completo.

`GET /api/history?start=AAAA-MM-DD&end=AAAA-MM-DD` retorna até 31 dias. Acrescente `&csv=air` ou `&csv=fire` para download de todas as observações do período (os filtros visuais não restringem o CSV).

A gravação acompanha a coleta já existente: primeiro acesso após uma hora, além da verificação diária configurada. Não há garantia de coleta horária sem acessos. O recurso não recupera automaticamente dados anteriores à ativação. Dados reais presentes no cache inicial, inclusive detecções do dia anterior, podem entrar na primeira gravação.

As observações são deduplicadas por fonte, sensor e horário; detecções usam identidade, coordenadas, horário e satélite. A primeira observação é preservada. Apenas o ponto corrente do CAMS é arquivado; previsões futuras não são registradas como observações passadas. Falhas de arquivo são sinalizadas em `evidence.history.error` e no mapa.

O gráfico de ar permite comparar todos os sensores disponíveis, filtrar por bairro e selecionar um sensor individual ou o CAMS. Na comparação, cada sensor tem sua própria série; não se calcula uma média representativa de todo o bairro. Cada ponto diário usa a média aritmética das amostras disponíveis daquele sensor ou modelo, sem misturar fontes. Isso não é uma média contínua de 24 horas nem IQAr oficial. PurpleAir usa último contato como referência temporal, não garantia do horário exato da média de 10 minutos. O CSV preserva avisos de divergência dos relógios. Contagens INPE têm cobertura parcial e não equivalem a incêndios únicos. Lacunas não são convertidas em zero.


## Controle de leituras do armazenamento

A página consulta evidências a cada cinco minutos, somente quando a aba está visível. As respostas JSON de evidências e histórico têm cache de cinco minutos na CDN da Vercel; respostas de erro e chat não são compartilhadas. Cada instância mantém também um cache de leitura de cinco minutos, agrega chamadas simultâneas e aguarda um minuto antes de repetir uma leitura que falhou. Downloads CSV reutilizam o cache de documentos diários. A coleta autenticada ignora o cache de evidências, mas preserva o intervalo de coleta e a reserva condicional no armazenamento.

As leituras usadas para reservar coleta, limitar o chat e mesclar arquivos continuam diretas e condicionais: não se usa um valor em cache para autorizar gravações concorrentes. O cache é temporário e não substitui backup. Instâncias diferentes e reinicializações podem gerar novas operações; não há garantia de ficar dentro da cota gratuita. Dados podem demorar alguns minutos adicionais para aparecer.

Se o Blob estiver suspenso por cota, estas otimizações não o desbloqueiam. Preserve o store e os arquivos existentes. Não inicialize o histórico com valores fictícios nem considere falha de armazenamento como ausência de medições. Uma migração exige armazenamento de destino configurado e recuperação dos arquivos originais quando o acesso for restabelecido.

## Supabase como armazenamento alternativo

1. No SQL Editor do projeto Supabase, execute `supabase/schema.sql`. A tabela `pytu_documents` tem RLS ativada e não permite acesso direto por usuários anônimos ou autenticados.
2. Configure somente no servidor: `PYTU_STORAGE=supabase`, `SUPABASE_URL` (URL do projeto) e `SUPABASE_SECRET_KEY` (Secret key, não Publishable key). Não exponha a chave em `dist/` nem no Git.
3. Execute `npm run init:cloud` com essas variáveis. O comando cria somente os documentos de controle ausentes; não sobrescreve dados existentes nem inventa medições.
4. Na Vercel, configure as mesmas três variáveis no ambiente de produção e publique o código atualizado. Preserve as demais chaves das fontes e o `CRON_SECRET`.
5. Verifique `/api/evidence` e `/api/history` depois da primeira coleta. No Supabase, os documentos diários são armazenados como JSONB. Os CSV são gerados pela API a partir deles, sem duplicar arquivos no armazenamento.

A atualização de documentos usa revisão condicional para evitar perda de registros e manter a reserva de coleta e os limites do agente. Falhas no banco não são convertidas em histórico vazio. O armazenamento local usado por `npm start` continua independente.

Durante a migração, os arquivos antigos do Blob devem ser preservados. O novo banco não recupera automaticamente os dias anteriores: a recuperação depende de exportar os JSON originais quando o acesso ao Blob for liberado e mesclá-los sem descartar as novas observações. Não apague o store antigo.


## FioAres / MonitorAr

Integração autorizada para a estação FIOTEC–Amazonas (178586). Configure `MONITORAR_ENDPOINT` exclusivamente no servidor com o endereço fornecido diretamente pela equipe. Não publique o valor em código, logs, documentação ou frontend. A atribuição pública é **FioAres / MonitorAr**, com link para https://monitorar.mma.gov.br.

Uma reserva persistente é gravada antes da consulta: no máximo uma tentativa por hora, inclusive após falha, reinício ou acessos simultâneos. Na Vercel usa documento separado no armazenamento configurado; o cron e os acessos compartilham a reserva. Não há garantia de consultas horárias sem acessos. Localmente, quando `PYTU_STORAGE=supabase`, reutiliza o mesmo controle; caso contrário usa `data/monitorar.json`, com uma única instância. Não execute instalações independentes com o mesmo endpoint, pois suas reservas não seriam compartilhadas.

O IQAr é recebido da fonte com a classificação original e média de 24 horas de MP2,5; não passa pelo Jev e não é concentração. O horário sem fuso recebido é interpretado como Brasília (UTC−3) e convertido para UTC; a interface exibe Manaus (UTC−4). Medição ou coleta com mais de duas horas, ou medição no futuro além da tolerância de cinco minutos, não é apresentada como atual. Valores ausentes e formatos inesperados são recusados, preservando a última leitura com aviso. A estação é mostrada separadamente no mapa e no contexto do agente, sem representar toda a cidade ou um bairro.

A última leitura é preservada para cache e operação. Com `MONITORAR_HISTORY_ENABLED=true`, também são guardadas leituras sucessivas em uma janela móvel de sete dias. O IQAr permanece separado do histórico de concentrações e não é incluído nos CSV de ar/fogo. Nenhum dado de visitante é enviado ao MonitorAr.


### Gráfico de IQAr FIOTEC
A seção independente no Histórico exibe barras por horário de medição, em Manaus, com classificação original, detalhes e tabela acessível. Os períodos de 24 horas e 7 dias são independentes dos filtros de PM2,5. Não mistura IQAr com concentrações nem interpola lacunas.

`MONITORAR_HISTORY_ENABLED=false` é o padrão. Nesse modo, apenas a última leitura do cache pode aparecer, claramente identificada como observação isolada. Para habilitar o recurso, configure `MONITORAR_HISTORY_ENABLED=true` no servidor e reinicie/publique, respeitando as condições da autorização recebida. O coletor passa a guardar uma janela móvel de sete dias no mesmo documento da coleta, sem novas requisições à fonte ou escritas adicionais. Não é um arquivo permanente: observações mais antigas saem da janela. Duplicatas por estação e horário são descartadas, preservando a primeira observação. Falhas não criam novas amostras; horários futuros e valores inválidos são recusados. Não há recuperação retroativa, exportação CSV de IQAr ou garantia de amostras em todas as horas. A ativação não altera a reserva de uma tentativa por hora.


## Calor em Manaus

Acesse /calor.html. O módulo consulta Open-Meteo no servidor, com temperatura a 2 m, sensação térmica, umidade e vento, e exibe 24 ou 48 horas. Não precisa de chave adicional. O serviço gratuito exige uso não comercial e atribuição Open-Meteo (dados CC BY 4.0). A previsão é para Manaus, não uma medição por bairro.

GET /api/heat utiliza cache compartilhado no armazenamento configurado (Supabase ou Blob), com controle de revisão para limitar tentativas a uma por hora, inclusive em falhas. Há cache em memória de um minuto e cache CDN de cinco minutos. Localmente, o cache fica em data/heat.json. A consulta ocorre sob demanda e na coleta agendada já existente; não se promete coleta horária sem acessos. Após duas horas sem sucesso os valores deixam de aparecer como atuais. Não há histórico de medições de calor nesta versão. Falha neste módulo não impede a consulta às fontes de ar.

O agente recebe as previsões e suas limitações. Avisos INMET e orientações do Ministério da Saúde são links oficiais, não alertas importados. Testes: npm test.


## Servidor próprio e diferenças da execução local

O caminho que reproduz a aplicação serverless é Vercel + armazenamento configurado. Em uma VPS, `npm start` executa outro ponto de entrada, `server.mjs`, com persistência e limites distintos:

- Ar, fogo e calor usam arquivos locais em `data/`, mesmo quando `PYTU_STORAGE=supabase`. Essa variável não transfere o histórico local para o banco.
- MonitorAr é uma exceção: quando Supabase está selecionado, compartilha o documento e a reserva de consulta no banco; caso contrário, usa `data/monitorar.json`.
- O servidor escuta somente em `127.0.0.1`. Um proxy reverso deve receber as conexões externas HTTPS e encaminhá-las à porta local.
- Use somente um processo sobre o diretório de dados. Não use cluster ou múltiplas réplicas com esse armazenamento em arquivos.
- O cron da Vercel não roda na VPS. Os temporizadores do servidor funcionam enquanto o processo estiver ativo; Calor também é consultado sob demanda. Limites locais de chat não equivalem ao orçamento persistente serverless.

**Limitação conhecida nesta versão:** `historico.html` carrega `/iqar-history.js`, mas a lista de arquivos permitidos em `server.mjs` ainda não inclui essa rota. Na Vercel o arquivo é servido por `dist/`; na execução local a seção de IQAr não funciona integralmente. Antes de uma implantação própria com todos os recursos, é necessário corrigir a rota estática e validar o gráfico. Este README não altera o código do servidor.

### Roteiro para uma VPS Linux

1. Instale Git, Node.js 24 e npm. Crie um usuário de serviço sem privilégios administrativos e uma pasta persistente, por exemplo `/opt/pytu`, sob sua responsabilidade.
2. Clone o repositório nessa pasta, escolha um commit/branch validado, execute `npm ci` e `npm test`. Configure `.env` a partir do exemplo com suas próprias chaves; restrinja sua leitura ao usuário do serviço.
3. Execute `npm start` e valide em `http://127.0.0.1:8766` pelo próprio servidor. Resolva a limitação de IQAr acima antes de declarar equivalência com produção.
4. Configure um gerenciador de serviços para iniciar o processo no boot e reiniciá-lo em falhas. Exemplo de unidade systemd, ajustando usuário, caminho e executável Node conforme a instalação:

```ini
[Unit]
Description=PYTU
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pytu
WorkingDirectory=/opt/pytu
ExecStartPre=/usr/bin/node scripts/setup.mjs
ExecStart=/usr/bin/node --env-file-if-exists=.env server.mjs
Restart=on-failure
RestartSec=10
KillSignal=SIGINT
UMask=0077

[Install]
WantedBy=multi-user.target
```

5. Instale e configure um proxy como Nginx ou Caddy para encaminhar o domínio a `127.0.0.1:8766`, com certificado HTTPS. Preserve o Host original, configure tempo de resposta compatível com o agente e mantenha a porta Node inacessível externamente. Não sirva a raiz do projeto como pasta pública: ela contém `.env` e `data/`.
6. Ative o serviço e faça a verificação abaixo pelo domínio público. Configure logs, backup e acompanhamento de espaço em disco e cotas. Geolocalização depende de HTTPS ou localhost.

Esse exemplo pressupõe que o usuário, diretório e Node já foram instalados; não é um script automático de provisionamento. Não execute simultaneamente uma cópia de desenvolvimento consultando MonitorAr com uma reserva independente da produção.

## Backup, restauração e atualização

- **Arquivos locais:** pare o processo antes de copiar `data/` para um backup consistente. Guarde também o commit usado e uma cópia protegida da configuração, separada do Git. Para restaurar, use o código compatível, restaure `data/` com permissões corretas e inicie uma única instância.
- **Supabase:** exporte a tabela `pytu_documents` por ferramenta de backup/PostgreSQL apropriada, preservando `path`, `value` e `revision`. Guarde também o schema. Evite gravações concorrentes durante a restauração e teste primeiro em ambiente isolado, com consultas externas desabilitadas.
- **Blob:** preserve/exporte os documentos JSON privados e seus caminhos. Os CSV são úteis para análise, mas não contêm todos os estados de controle necessários para restauração.
- **Migração:** `npm run init:cloud` inicializa documentos ausentes; não importa históricos. Alterar `PYTU_STORAGE` não transfere registros. Mesclar históricos exige deduplicação e preservação dos documentos já existentes; não substitua um banco novo por uma cópia antiga sem revisão.
- **IQAr:** a janela operacional é de sete dias, não um arquivo permanente. Um backup antigo não recria observações que nunca foram coletadas.
- **Atualização do código:** faça backup, confirme que não há alterações locais pendentes, revise a diferença de commits e execute os testes. No servidor próprio, pare o serviço para atualizar dependências e reinicie; na Vercel, confira o deploy da branch configurada. Preserve as variáveis de ambiente e o armazenamento. Um rollback de código não restaura automaticamente o banco.

## Verificação pós-deploy

1. Abra `/`, `/historico.html` e `/calor.html`. Confira navegação, marca, links Akub/Mirá e console/rede do navegador sem arquivos ausentes.
2. Consulte `GET /api/evidence`: verifique mensagens de erro, horários, sensores, estimativa regional, fogo e estado do arquivamento. HTTP 200 sozinho não comprova que todas as fontes responderam.
3. Selecione um bairro e consulte o agente. Confira se ele usa o local e as evidências disponíveis, sem transformar lacunas em dados.
4. No histórico, selecione datas com coletas existentes, compare sensores, confira a tabela e baixe CSV de ar e fogo. Exemplo de rota: `/api/history?start=2026-10-29&end=2026-10-30`; substitua pelas datas que existam na instalação, com intervalo máximo de 31 dias.
5. Com MonitorAr habilitado, confira a atribuição FioAres/MonitorAr, o horário em Manaus e a seção IQAr. Com arquivamento ativo, novas observações válidas formam a série gradualmente; repetições do mesmo horário não criam barras novas.
6. Consulte `GET /api/heat` e confira horários, unidades, validade e atribuição Open-Meteo. Trata-se de previsão regional, não de temperatura medida em cada bairro.
7. Na Vercel, confira logs de build/função e execução de cron; no servidor próprio, logs do serviço. Verifique erros de autenticação, cota e persistência sem registrar chaves ou o endereço privado de MonitorAr.

Sem dados após instalar pode significar fonte/configuração indisponível ou ausência de coleta válida; não conclua que o ar está bom ou que não há fogo. Nenhuma etapa de validação deve preencher o banco com fixtures de testes.
