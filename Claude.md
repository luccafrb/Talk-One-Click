# Talk One-Click — Contexto do Projeto

## O que é este sistema

API backend independente que automatiza o onboarding de novos clientes da plataforma Talk.
Recebe os dados do cliente, usa o ChatGPT para gerar uma configuração personalizada e chama a Talk API para criar setores, etiquetas e fluxos de chatbot automaticamente.

O Talk em si é feito em C#/Blazor. Este serviço é separado, em Python, e se comunica com o Talk via API REST.

---

## Stack

- Python 3.11+
- FastAPI + uvicorn
- httpx (chamadas async com retry)
- openai (SDK oficial — modelo gpt-4o)
- pydantic (validação e contratos entre módulos)

---

## Estrutura de pastas

```
talk_one_click/
├── main.py                  # FastAPI app + rota POST /onboarding
├── client/
│   └── talk_client.py       # HTTP client base (httpx + retry + auth)
├── modules/
│   ├── sector_module.py     # Setores + templates por segmento
│   ├── label_module.py      # Etiquetas + templates por segmento
│   └── chatbot_module.py    # Fluxos de chatbot com steps tipados
├── ai/
│   └── ai_configurator.py   # Chama ChatGPT para personalizar configs
├── orchestrator.py          # Coordena módulos, coleta erros por etapa
├── models.py                # Pydantic models compartilhados
├── errors.py                # TalkApiError, AiConfigError
├── requirements.txt
└── .env.example
```

> **Nota:** `board_module.py` foi removido do escopo. Boards são gerenciados via
> `internal-api` (`app-talk.umbler.com/internal-api/...`) sem suporte público,
> usando sessão interna do front-end. Não é seguro nem estável para integração.

---

## Fluxo principal

```
POST /onboarding
      │
      ▼
  Orchestrator.run()
      │
      ├── 1. AiConfigurator.generate()   → chama ChatGPT → retorna config JSON
      ├── 2. SectorModule.create_many()  → cria setores na Talk API
      ├── 3. LabelModule.create_many()   → cria etiquetas na Talk API
      └── 4. ChatbotModule.create()      → cria fluxo de chatbot
```

Cada etapa é independente. Falha em uma não aborta as demais.
Erros são acumulados em `result.errors` com o nome da etapa.

---

## Decisões de arquitetura

### Erros por etapa, nunca try/catch global
O Orchestrator captura erros individualmente por módulo. O resultado final sempre retorna com `status: ok | partial | error` e uma lista de erros por etapa. Nunca usar um try/catch que englobe todo o fluxo.

### Retry com backoff exponencial
O `TalkClient` faz até 3 tentativas com espera de `tentativa * 0.8s` entre elas. Implementado no nível do client, transparente para os módulos.

### Auth por API Key do cliente
A API Key do Talk é recebida no body do request de onboarding (`talk_api_key`). Nunca armazenada em banco. Passada diretamente ao `TalkClient` na criação do Orchestrator.

### ChatGPT retorna JSON puro
O prompt enviado ao AiConfigurator instrui o modelo a retornar apenas JSON, sem markdown, sem texto extra. O parse é feito com `json.loads()` direto. Em caso de falha no parse, lançar `AiConfigError`.

### Templates por segmento
Setores e etiquetas têm templates pré-definidos em dicionários por segmento. A IA enriquece e personaliza em cima desses templates — não cria do zero.

---

## Segmentos suportados

| Chave       | Descrição              |
|-------------|------------------------|
| beleza      | Salões, estéticas      |
| saude       | Clínicas, consultórios |
| ecommerce   | Lojas online           |
| educacao    | Escolas, cursos        |

---

## Endpoints da Talk API (confirmados via docs.json)

Base URL confirmada: `https://app-utalk.umbler.com/api`
Documentação: `https://app-utalk.umbler.com/api/docs/v1/docs.json`

### Regra crítica
**Todo endpoint exige `organizationId` como query parameter obrigatório.**
Exemplo: `GET /v1/sectors/?organizationId=AB_12-xyzEXAMPLE`
O `organizationId` deve ser coletado do cliente junto com a `talk_api_key` no onboarding.

### Setores

| Método | Endpoint                  |
|--------|---------------------------|
| GET    | `/v1/sectors/`            |
| POST   | `/v1/sectors/`            |
| GET    | `/v1/sectors/{id}/`       |
| PUT    | `/v1/sectors/{id}/`       |
| DELETE | `/v1/sectors/{id}/`       |
| PUT    | `/v1/sectors/reorder/`    |

### Etiquetas

> ⚠️ O recurso se chama **tags** na API, não labels.

| Método | Endpoint             |
|--------|----------------------|
| GET    | `/v1/tags/`          |
| POST   | `/v1/tags/`          |
| GET    | `/v1/tags/{id}/`     |
| PUT    | `/v1/tags/{id}/`     |
| DELETE | `/v1/tags/{id}/`     |
| PUT    | `/v1/tags/reorder/`  |

### Bots (Flowchart)

| Método | Endpoint                          |
|--------|-----------------------------------|
| GET    | `/v1/bots/`                       |
| GET    | `/v1/bots/{id}/`                  |
| PUT    | `/v1/bots/{id}/`                  |
| DELETE | `/v1/bots/{id}/`                  |
| GET    | `/v1/bots/flowchart/`             |
| POST   | `/v1/bots/flowchart/`             |
| PUT    | `/v1/bots/flowchart/{id}/`        |
| PUT    | `/v1/bots/reorder/`               |
| GET    | `/v1/bots/snapshot/{snapshotId}/` |
| GET    | `/v1/bots/snapshots/`             |

### Tipos de bot disponíveis na API
A API retorna `oneOf` nos bots: `TaggingBotModel`, `SectorForwardingBotModel`, `GreetingBotModel`, `FlowchartBotModel`. O chatbot de onboarding deve usar `FlowchartBotModel`.

### Boards — fora do escopo
Boards usam uma internal-api não documentada e sem suporte:
`https://app-talk.umbler.com/internal-api/v1/contacts-boards/boards/`
Não integrar. O cliente cria boards manualmente pelo front.

### Auth
`Authorization: Bearer {api_key}` em todos os requests.
Header adicional: `X-Talk-Client: one-click-onboarding/1.0`.

---

## Modelo de IA

- Provedor: OpenAI (ChatGPT)
- Modelo: `gpt-4o`
- Max tokens: 1000
- A OpenAI API Key vem de variável de ambiente: `OPENAI_API_KEY`
- O prompt deve sempre pedir resposta em JSON com os campos: `chatbot_name`, `chatbot_approach`, `explanation`

### Implementação no ai_configurator.py

```python
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

response = client.chat.completions.create(
    model="gpt-4o",
    max_tokens=1000,
    messages=[{"role": "user", "content": prompt}]
)
text = response.choices[0].message.content
```

---

## Variáveis de ambiente

```
OPENAI_API_KEY=
TALK_API_BASE_URL=
```

---

## O que não fazer

- Nunca armazenar a `talk_api_key` ou `organization_id` do cliente em banco ou log
- Nunca chamar a Talk API sem passar `organizationId` como query param — todos os endpoints exigem
- Nunca usar `asyncio.run()` dentro de rotas FastAPI — usar `async def` e `await`
- Nunca fazer parse do retorno do ChatGPT com regex — sempre `json.loads()`
- Nunca adicionar novos segmentos sem criar o template correspondente nos dois módulos (sector, label)
- Nunca englobar o fluxo inteiro em um único try/catch no Orchestrator
- Nunca tentar integrar com boards via internal-api — não é suportado

---

## Como rodar localmente

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Exemplo de request:
```bash
curl -X POST http://localhost:8000/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Studio Bella",
    "segment": "beleza",
    "goal": "agendamentos",
    "volume": "medio",
    "approach": "consultivo",
    "talk_api_key": "sua-api-key-aqui",
    "organization_id": "seu-organization-id-aqui"
  }'
```

---

## Status do projeto

- [x] Arquitetura definida
- [x] Stack escolhida (Python + FastAPI)
- [x] Base URL da Talk API confirmada (`https://app-utalk.umbler.com/api`)
- [x] `organizationId` identificado como parâmetro obrigatório em todos os endpoints
- [x] Endpoints de setores confirmados (`/v1/sectors/`)
- [x] Endpoints de etiquetas confirmados (`/v1/tags/` — não `/v1/labels/`)
- [x] Endpoints de bots confirmados (`/v1/bots/flowchart/` com POST)
- [x] Boards removidos do escopo (internal-api sem suporte)
- [ ] Implementação dos módulos
- [ ] Testes de integração
- [ ] Deploy