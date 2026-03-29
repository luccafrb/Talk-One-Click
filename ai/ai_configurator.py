import copy
import json
import logging
import os
import re

from openai import OpenAI

from errors import AiConfigError
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)

_provider = os.environ.get("AI_PROVIDER", "openai")

if _provider == "gemini":
    _client = OpenAI(
        api_key=os.environ.get("GEMINI_API_KEY", ""),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    _model = "gemini-2.0-flash"
else:
    _client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    _model = "gpt-4o"

_EXAMPLES = {
    "beleza": {
        "sectors": ["Agendamentos", "Atendimento", "Financeiro"],
        "labels": ["Novo Cliente", "Retorno", "Agendado", "VIP"],
    },
    "saude": {
        "sectors": ["Consultas", "Exames", "Administrativo"],
        "labels": ["Consulta Marcada", "Exame Pendente", "Urgente"],
    },
    "ecommerce": {
        "sectors": ["Vendas", "Suporte", "Trocas e Devoluções"],
        "labels": ["Novo Pedido", "Aguardando Pagamento", "Reclamação"],
    },
    "educacao": {
        "sectors": ["Matrículas", "Suporte Acadêmico", "Financeiro"],
        "labels": ["Interessado", "Matriculado", "Inadimplente"],
    },
}

_CUSTOM_STEP_TYPES = (
    "send_message, options, sector_transfer, collect_text, tag, "
    "time_of_day, day_of_week, wait, close_chat"
)

_CUSTOM_STEP_PARAMS = """
Cada bloco tem um campo obrigatório "id" com nome único em snake_case descritivo (ex: "boas_vindas", "check_hora_vendas").
Todos os campos "next" referenciam o "id" de outro bloco — NUNCA use números inteiros como "next".

- send_message: {"message": str}
  (envia mensagem sem aguardar resposta; avança automaticamente — sem campo "next")
  Use para: boas-vindas, confirmações, avisos, mensagens de fora do horário.

- collect_text: {"message": str}
  (exibe pergunta E aguarda digitação do cliente; avança automaticamente — sem campo "next")
  Use para: coletar nome, e-mail, telefone, etc. NUNCA use send_message para isso.

- options: {"text": str, "options": [{"label": str, "next": "<id_do_bloco_destino>"}]}
  REGRA: 'next' é o "id" do primeiro bloco de cada branch. NUNCA use números.

- sector_transfer: {"sector_name": str}  (use um dos setores gerados em 'sectors')

- tag: {"option": "Add"|"Remove", "tag_names": [str]}
  (avança automaticamente para o próximo bloco — sem campo "next")

- time_of_day: {"timezone": "America/Sao_Paulo",
                "ranges": [{"start": "HH:MM", "end": "HH:MM", "next": "<id_do_bloco_destino>"}]}
  REGRAS OBRIGATÓRIAS:
  1. Sempre exatamente 2 ranges cobrindo as 24h de forma contígua (wrap circular).
  2. 'next' de cada range é o "id" do bloco destino — NUNCA o id do próprio bloco.
  Exemplo (09:00-18:00 horário comercial):
    {"ranges": [{"start": "09:00", "end": "18:00", "next": "sector_suporte"},
                {"start": "18:00", "end": "09:00", "next": "msg_fora_horario"}]}

- day_of_week: {"timezone": "America/Sao_Paulo", "days": ["<id>"|null, ...]}
  7 elementos, índice 0=domingo. null=sem destino (use para sáb/dom).
  Use o "id" do time_of_day da mesma branch nos dias úteis.
  Exemplo: {"days": [null, "check_hora_suporte", "check_hora_suporte", "check_hora_suporte",
                      "check_hora_suporte", "check_hora_suporte", null]}
  (domingo=null, seg-sex="check_hora_suporte", sábado=null)

- wait: {"interval": "HH:MM:SS"}

- close_chat: {}
"""


# ── Named-reference resolution ─────────────────────────────────────────────────

def _resolve_named_refs(custom_steps: list[dict]) -> list[dict]:
    """Convert named string 'next' references to integer indices.

    Backwards-compatible: integer 'next' values are passed through unchanged.
    Unknown string refs → sentinel -1 (chatbot_module guards handle it).
    Duplicate 'id' values → first occurrence wins.
    """
    steps = copy.deepcopy(custom_steps)

    id_to_index: dict[str, int] = {}
    for i, block in enumerate(steps):
        block_id = block.get("id")
        if isinstance(block_id, str) and block_id:
            if block_id not in id_to_index:
                id_to_index[block_id] = i
            else:
                logger.warning("_resolve_named_refs: id duplicado '%s' (blocos %d e %d)", block_id, id_to_index[block_id], i)

    def resolve(ref, context: str) -> int:
        if ref is None:
            return None  # type: ignore[return-value]
        if isinstance(ref, int):
            return ref
        if isinstance(ref, str):
            idx = id_to_index.get(ref)
            if idx is None:
                logger.warning("_resolve_named_refs: referência '%s' não encontrada em %s", ref, context)
                return -1
            return idx
        logger.warning("_resolve_named_refs: tipo inesperado %r em %s", ref, context)
        return -1

    for i, block in enumerate(steps):
        btype = block.get("type", "")
        params = block.get("params", {})
        block_id = block.get("id", f"bloco_{i}")

        if btype == "options":
            for opt in params.get("options", []):
                opt["next"] = resolve(opt.get("next"), f"options[{block_id}]")

        elif btype == "time_of_day":
            for r in params.get("ranges", []):
                r["next"] = resolve(r.get("next"), f"time_of_day[{block_id}]")

        elif btype == "day_of_week":
            params["days"] = [
                resolve(d, f"day_of_week[{block_id}]") if d is not None else None
                for d in params.get("days", [])
            ]

    return steps


def _remove_orphans(custom_steps: list[dict]) -> list[dict]:
    """Remove steps unreachable from index 0 via BFS. Must be called after _resolve_named_refs.

    Remaps all integer refs after compaction.
    day_of_week refs to removed steps → None; options/time_of_day → -1.
    """
    n = len(custom_steps)
    if n == 0:
        return custom_steps

    def get_refs(block: dict, idx: int) -> list[int]:
        btype = block.get("type", "")
        params = block.get("params", {})
        if btype in ("send_message", "collect_text", "tag", "wait"):
            return [idx + 1] if idx + 1 < n else []
        if btype == "options":
            return [o["next"] for o in params.get("options", []) if isinstance(o.get("next"), int) and 0 <= o["next"] < n]
        if btype == "time_of_day":
            return [r["next"] for r in params.get("ranges", []) if isinstance(r.get("next"), int) and 0 <= r["next"] < n]
        if btype == "day_of_week":
            return [d for d in params.get("days", []) if isinstance(d, int) and 0 <= d < n]
        return []  # sector_transfer, close_chat → terminal

    reachable: set[int] = set()
    queue = [0]
    while queue:
        current = queue.pop()
        if current in reachable:
            continue
        reachable.add(current)
        queue.extend(get_refs(custom_steps[current], current))

    if len(reachable) == n:
        return custom_steps

    orphans = sorted(set(range(n)) - reachable)
    logger.info("_remove_orphans: removendo %d bloco(s) órfão(s): índices %s", len(orphans), orphans)

    kept = sorted(reachable)
    old_to_new: dict[int, int] = {old: new for new, old in enumerate(kept)}

    new_steps = []
    for old_idx in kept:
        block = copy.deepcopy(custom_steps[old_idx])
        btype = block.get("type", "")
        params = block.get("params", {})

        if btype == "options":
            for opt in params.get("options", []):
                nxt = opt.get("next")
                opt["next"] = old_to_new[nxt] if isinstance(nxt, int) and nxt in old_to_new else -1

        elif btype == "time_of_day":
            for r in params.get("ranges", []):
                nxt = r.get("next")
                r["next"] = old_to_new[nxt] if isinstance(nxt, int) and nxt in old_to_new else -1

        elif btype == "day_of_week":
            params["days"] = [
                old_to_new[d] if isinstance(d, int) and d in old_to_new else None
                for d in params.get("days", [])
            ]

        new_steps.append(block)

    return new_steps


# ── Main configurator ──────────────────────────────────────────────────────────

class AiConfigurator:
    async def generate(self, request: OnboardingRequest) -> AiConfig:
        if request.chatbot_description is not None:
            return await self._generate_custom_flow(request)
        return await self._generate_standard(request)

    async def _generate_standard(self, request: OnboardingRequest) -> AiConfig:
        example = _EXAMPLES.get(request.segment, {"sectors": [], "labels": []})

        sectors_hint = (
            f"- Instruções específicas para setores: {request.sectors_description}\n"
            if request.sectors_description else ""
        )
        labels_hint = (
            f"- Instruções específicas para etiquetas: {request.labels_description}\n"
            if request.labels_description else ""
        )

        prompt = (
            f"Você é um especialista em atendimento ao cliente.\n"
            f"Configure um chatbot para o seguinte negócio:\n\n"
            f"- Nome: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo principal: {request.goal}\n"
            f"- Abordagem desejada: {request.approach}\n\n"
            f"Gere setores de atendimento (entre 3 e 5) e etiquetas de conversa (entre 4 e 6) "
            f"personalizados para este negócio.\n\n"
            f"Exemplos de referência para o segmento '{request.segment}':\n"
            f"- Setores: {example['sectors']}\n"
            f"- Etiquetas: {example['labels']}\n\n"
            f"{sectors_hint}"
            f"{labels_hint}"
            f"Adapte os nomes ao contexto específico do negócio '{request.business_name}'.\n\n"
            f"IMPORTANTE: cada nome em 'sectors' e 'labels' deve ter no máximo 24 caracteres.\n\n"
            f"Responda APENAS com JSON puro, sem markdown, sem texto extra, "
            f"com exatamente estes campos:\n"
            f'{{"chatbot_name": "...", "chatbot_approach": "...", "explanation": "...", '
            f'"sectors": ["...", "..."], "labels": ["...", "..."], '
            f'"welcome_message": "mensagem de boas-vindas personalizada para o negócio, máximo 200 caracteres"}}'
        )

        return await self._call_and_parse(prompt)

    async def _generate_custom_flow(self, request: OnboardingRequest) -> AiConfig:
        example = _EXAMPLES.get(request.segment, {"sectors": [], "labels": []})
        sectors_hint = (
            f"- Instruções específicas para setores: {request.sectors_description}\n"
            if request.sectors_description else ""
        )
        labels_hint = (
            f"- Instruções específicas para etiquetas: {request.labels_description}\n"
            if request.labels_description else ""
        )

        prompt = (
            f"Você é um especialista em atendimento ao cliente.\n"
            f"Configure um chatbot personalizado para o seguinte negócio:\n\n"
            f"- Nome: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo principal: {request.goal}\n"
            f"- Abordagem desejada: {request.approach}\n\n"
            f"Setores de referência para o segmento: {example['sectors']}\n"
            f"{sectors_hint}"
            f"{labels_hint}\n"
            f"Descrição do fluxo desejado pelo cliente:\n{request.chatbot_description}\n\n"
            f"INSTRUÇÕES:\n"
            f"1. Gere setores (entre 3 e 5) e etiquetas (entre 4 e 6) personalizados.\n"
            f"2. Monte o fluxo como uma lista de blocos em 'custom_steps' (máximo 15 blocos).\n"
            f"3. O primeiro bloco DEVE ser send_message (boas-vindas pura — sem perguntas de coleta).\n"
            f"4. O último bloco de cada branch DEVE ser sector_transfer ou close_chat.\n"
            f"5. Cada nome em 'sectors' e 'labels' deve ter no máximo 24 caracteres.\n"
            f"6. COLETA DE DADOS: use collect_text (NUNCA send_message) para coletar nome, e-mail, etc.\n"
            f"   O bloco de boas-vindas é APENAS saudação. Dados são coletados por collect_text a seguir.\n"
            f"   ERRADO: send_message('Bem-vindo! Pode me informar seu nome?')\n"
            f"   CORRETO: send_message('Bem-vindo!') → collect_text('Qual é o seu nome?')\n"
            f"7. NOMEAÇÃO: cada bloco DEVE ter um campo 'id' único em snake_case descritivo.\n"
            f"   Exemplos: 'boas_vindas', 'coleta_nome', 'menu_opcoes', 'check_dia_vendas', 'sector_suporte'.\n"
            f"8. REFERÊNCIAS POR NOME: todos os campos 'next' usam o 'id' do bloco destino (string).\n"
            f"   NUNCA use números inteiros. Escreva: \"next\": \"check_hora_suporte\"\n"
            f"   NUNCA escreva \"next\": 3 ou qualquer número.\n"
            f"9. REGRA DE BRANCHES: cada branch tem seu próprio caminho completo e independente.\n"
            f"   - options aponta cada opção para o id do primeiro bloco da respectiva branch.\n"
            f"   - Se branches convergem (ex: encerramento compartilhado), ambas apontam para o MESMO id.\n"
            f"10. REGRA DE time_of_day:\n"
            f"    - in-hours 'next' = id do setor/próximo passo DENTRO da branch.\n"
            f"    - out-of-hours 'next' = id do bloco de encerramento.\n"
            f"    - NUNCA use o id do próprio bloco como 'next' (loop infinito).\n"
            f"11. HORÁRIO COMERCIAL: use day_of_week + time_of_day SOMENTE se o cliente mencionar\n"
            f"    explicitamente horário de atendimento, dias úteis ou restrição de horário.\n"
            f"    Se o cliente NÃO mencionar horário, vá direto para sector_transfer — sem validações.\n"
            f"    Quando necessário: day_of_week.days = id do time_of_day nos dias úteis, null para sáb/dom.\n"
            f"    Exemplo CORRETO com 2 opções (Vendas e Suporte), seg-sex 09-18h:\n"
            f'    [{{"id":"boas_vindas","type":"send_message","params":{{"message":"Olá!"}}}},\n'
            f'     {{"id":"menu_opcoes","type":"options","params":{{"text":"Como posso ajudar?","options":['
            f'{{"label":"Vendas","next":"check_dia_vendas"}},{{"label":"Suporte","next":"check_dia_suporte"}}]}}}},\n'
            f'     {{"id":"check_dia_vendas","type":"day_of_week","params":{{"timezone":"America/Sao_Paulo",'
            f'"days":[null,"check_hora_vendas","check_hora_vendas","check_hora_vendas","check_hora_vendas","check_hora_vendas",null]}}}},\n'
            f'     {{"id":"check_hora_vendas","type":"time_of_day","params":{{"timezone":"America/Sao_Paulo",'
            f'"ranges":[{{"start":"09:00","end":"18:00","next":"sector_vendas"}},{{"start":"18:00","end":"09:00","next":"msg_fora_horario"}}]}}}},\n'
            f'     {{"id":"sector_vendas","type":"sector_transfer","params":{{"sector_name":"Vendas"}}}},\n'
            f'     {{"id":"check_dia_suporte","type":"day_of_week","params":{{"timezone":"America/Sao_Paulo",'
            f'"days":[null,"check_hora_suporte","check_hora_suporte","check_hora_suporte","check_hora_suporte","check_hora_suporte",null]}}}},\n'
            f'     {{"id":"check_hora_suporte","type":"time_of_day","params":{{"timezone":"America/Sao_Paulo",'
            f'"ranges":[{{"start":"09:00","end":"18:00","next":"sector_suporte"}},{{"start":"18:00","end":"09:00","next":"msg_fora_horario"}}]}}}},\n'
            f'     {{"id":"sector_suporte","type":"sector_transfer","params":{{"sector_name":"Suporte"}}}},\n'
            f'     {{"id":"msg_fora_horario","type":"send_message","params":{{"message":"Fora do horário."}}}},\n'
            f'     {{"id":"encerrar","type":"close_chat","params":{{}}}}]\n\n'
            f"Tipos de bloco disponíveis: {_CUSTOM_STEP_TYPES}\n"
            f"Parâmetros por tipo:\n{_CUSTOM_STEP_PARAMS}\n"
            f"Responda APENAS com JSON puro, sem markdown, sem texto extra, "
            f"com exatamente estes campos:\n"
            f'{{"chatbot_name": "...", "chatbot_approach": "...", "explanation": "...", '
            f'"sectors": ["...", "..."], "labels": ["...", "..."], '
            f'"welcome_message": "...", '
            f'"custom_steps": [{{"id": "...", "type": "...", "params": {{}}}}]}}'
        )

        config = await self._call_and_parse(prompt, max_tokens=2500)

        if config.custom_steps:
            verified = await self._verify_custom_steps(config.custom_steps, request)
            resolved = _resolve_named_refs(verified)
            config.custom_steps = _remove_orphans(resolved)

        return config

    async def _verify_custom_steps(
        self, custom_steps: list[dict], request: OnboardingRequest
    ) -> list[dict]:
        """Second-pass: ask the AI to review and fix both structural and semantic errors."""
        n = len(custom_steps)

        existing_ids = [s.get("id", f"bloco_{i}") for i, s in enumerate(custom_steps)]

        summary_lines = []
        for i, step in enumerate(custom_steps):
            btype = step.get("type", "?")
            params = step.get("params", {})
            block_id = step.get("id", f"bloco_{i}")

            if btype in ("send_message", "collect_text"):
                detail = repr(params.get("message", "")[:60])
            elif btype == "options":
                opts = ", ".join(
                    f"{o['label']}→{o['next']}" for o in params.get("options", [])
                )
                detail = f"text={repr(params.get('text',''))[:40]}, options=[{opts}]"
            elif btype == "sector_transfer":
                detail = f"sector={params.get('sector_name')}"
            elif btype == "tag":
                detail = f"option={params.get('option')}, tags={params.get('tag_names')}"
            elif btype == "time_of_day":
                ranges = "; ".join(
                    f"{r['start']}-{r['end']}→{r.get('next')}"
                    for r in params.get("ranges", [])
                )
                detail = f"ranges=[{ranges}]"
            elif btype == "day_of_week":
                detail = f"days={params.get('days')}"
            elif btype == "close_chat":
                detail = ""
            else:
                detail = str(params)[:60]
            summary_lines.append(f"  {i}: [{block_id}] {btype}  {detail}")

        summary = "\n".join(summary_lines)

        prompt = (
            f"Você é um revisor de fluxos de chatbot. Analise os {n} blocos abaixo e corrija TODOS os erros — "
            f"tanto estruturais quanto semânticos.\n\n"
            f"PEDIDO ORIGINAL DO CLIENTE:\n"
            f"- Negócio: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo: {request.goal}\n"
            f"- Abordagem: {request.approach}\n"
            f"- Descrição do fluxo desejado: {request.chatbot_description}\n\n"
            f"IDs VÁLIDOS EXISTENTES: {existing_ids}\n\n"
            f"BLOCOS GERADOS (formato: índice: [id] tipo  detalhes):\n{summary}\n\n"
            f"CHECKLIST DE ERROS A CORRIGIR:\n"
            f"1. SEMÂNTICA: o fluxo condiz com o pedido do cliente? Mensagens, setores e lógica corretos?\n"
            f"   Branches com comportamentos DIFERENTES devem ter seus próprios blocos terminais.\n"
            f"2. AUTO-REFERÊNCIAS (loop infinito):\n"
            f"   a) day_of_week: se 'days' contém o próprio 'id' do bloco → substitua pelo id do time_of_day seguinte.\n"
            f"      Exemplo: bloco 'check_dia_vendas' com days=['check_dia_vendas',...] → corrija para ['check_hora_vendas',...].\n"
            f"   b) time_of_day: se qualquer 'next' em ranges é o próprio 'id' do bloco → corrija para o id do passo seguinte.\n"
            f"3. REFERÊNCIAS INEXISTENTES: todo 'next' deve ser um id da lista de IDs válidos acima.\n"
            f"   Se um 'next' não está na lista, corrija para o id mais adequado.\n"
            f"4. BLOCOS ÓRFÃOS: identifique ids que não são destino de nenhum 'next' (exceto o bloco 0).\n"
            f"   Colete todos os ids referenciados por 'next' (options, time_of_day, day_of_week).\n"
            f"   Qualquer id NÃO presente nessa lista (exceto o primeiro bloco) é órfão — remova-o.\n"
            f"5. IDs DUPLICADOS ou AUSENTES: todo bloco deve ter 'id' único e não-vazio.\n"
            f"6. BRANCHES SEM TERMINAL: toda branch deve terminar em sector_transfer ou close_chat.\n"
            f"7. time_of_day: exatamente 2 ranges contíguos cobrindo 24h.\n"
            f"8. day_of_week: exatamente 7 elementos; null para dias sem destino (sáb/dom).\n"
            f"9. BOAS-VINDAS: o primeiro bloco (send_message) deve ser APENAS saudação — sem perguntas de coleta.\n\n"
            f"JSON COMPLETO DOS BLOCOS:\n"
            f"{json.dumps(custom_steps, ensure_ascii=False)}\n\n"
            f"Responda APENAS com JSON puro: {{\"custom_steps\": [...]}} com os blocos corrigidos.\n"
            f"Mantenha o campo 'id' em todos os blocos. Se não houver erros, retorne como está."
        )

        try:
            response = _client.chat.completions.create(
                model=_model,
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.choices[0].message.content.strip()
            if text.startswith("```"):
                text = text.split("```", 2)[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.rsplit("```", 1)[0].strip()
            text = re.sub(r'(")\s*\.\s*,', r'",', text)
            data = json.loads(text)
            corrected = data.get("custom_steps", custom_steps)
            logger.info(
                "Verificação de custom_steps: %d blocos originais → %d corrigidos",
                n, len(corrected),
            )
            return corrected
        except Exception as exc:
            logger.warning("Falha na verificação de custom_steps, usando original: %s", exc)
            return custom_steps

    async def generate_agent_prompt(self, request: OnboardingRequest, ai_config: AiConfig) -> str:
        """Generate the generalPrompt for the AI agent based on business context."""
        agent_desc = (
            f"\nInstruções específicas do cliente para o agente:\n{request.ai_agent_description}"
            if request.ai_agent_description else ""
        )
        prompt = (
            f"Você é um especialista em criação de agentes de IA para atendimento ao cliente.\n"
            f"Crie um prompt de sistema (generalPrompt) completo para um agente de IA com as seguintes características:\n\n"
            f"- Empresa: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo: {request.goal}\n"
            f"- Abordagem/tom: {request.approach}\n"
            f"- Setores disponíveis: {', '.join(ai_config.sectors)}\n"
            f"- Tipo de agente: {request.ai_agent_type or 'support'}\n"
            f"{agent_desc}\n\n"
            f"O prompt deve:\n"
            f"1. Definir claramente o papel e personalidade do agente\n"
            f"2. Descrever como responder aos clientes conforme a abordagem ({request.approach})\n"
            f"3. Mencionar os setores para os quais pode encaminhar\n"
            f"4. Incluir limites do que o agente pode/não pode fazer\n"
            f"5. Ser escrito em português do Brasil\n"
            f"6. Ter entre 200 e 800 caracteres\n\n"
            f"Responda APENAS com o texto do prompt, sem aspas, sem markdown, sem explicações."
        )
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    async def _call_and_parse(self, prompt: str, max_tokens: int = 1000) -> AiConfig:
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.rsplit("```", 1)[0].strip()

        text = re.sub(r'(")\s*\.\s*,', r'",', text)

        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError) as exc:
            raise AiConfigError(f"Resposta do modelo não é JSON válido: {text!r}") from exc

        return AiConfig(**data)
