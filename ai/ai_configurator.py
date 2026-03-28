import json
import os
import re

from openai import OpenAI

from errors import AiConfigError
from models import AiConfig, OnboardingRequest

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
- send_message: {"message": str}
- collect_text: {"message": str}
- options: {"text": str, "options": [{"label": str, "next": int}]}
  REGRA: 'next' é o índice (0-based) do bloco em custom_steps para onde essa opção leva.
  Exemplo: se options está no índice 2 e "Vendas" deve ir para o bloco no índice 4, use next:4.
  NUNCA coloque blocos intermediários entre options e seus destinos — options deve apontar diretamente para os primeiros blocos de cada branch.

- sector_transfer: {"sector_name": str}  (use um dos setores gerados em 'sectors')

- tag: {"option": "Add"|"Remove", "tag_names": [str]}  (use nomes de 'labels')
  REGRA: tag avança automaticamente para o próximo bloco sequencial — não use tag como destino de options.

- time_of_day: {"timezone": "America/Sao_Paulo", "ranges": [{"start": "HH:MM", "end": "HH:MM", "next": int}]}
  REGRAS OBRIGATÓRIAS:
  1. Sempre exatamente 2 ranges cobrindo as 24h de forma contígua.
  2. O end do range 1 DEVE ser igual ao start do range 2, e o end do range 2 DEVE ser igual ao start do range 1 (wrap circular).
  3. Cada range deve ter 'next' explícito apontando para o índice correto.
  Exemplo válido (horário comercial 09:00–18:00):
    {"ranges": [{"start": "09:00", "end": "18:00", "next": 7}, {"start": "18:00", "end": "09:00", "next": 11}]}
  Onde next:7 = bloco "dentro do horário", next:11 = bloco "fora do horário".

- day_of_week: {"timezone": "America/Sao_Paulo", "days": [int|null]}  (7 elementos, índice 0=domingo; null=sem destino)

- wait: {"interval": "HH:MM:SS"}

- close_chat: {}
"""


class AiConfigurator:
    async def generate(self, request: OnboardingRequest) -> AiConfig:
        if request.chatbot_description is not None:
            return await self._generate_custom_flow(request)
        return await self._generate_standard(request)

    async def _generate_standard(self, request: OnboardingRequest) -> AiConfig:
        example = _EXAMPLES.get(request.segment, {"sectors": [], "labels": []})

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

        prompt = (
            f"Você é um especialista em atendimento ao cliente.\n"
            f"Configure um chatbot personalizado para o seguinte negócio:\n\n"
            f"- Nome: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo principal: {request.goal}\n"
            f"- Abordagem desejada: {request.approach}\n\n"
            f"Setores de referência para o segmento: {example['sectors']}\n\n"
            f"Descrição do fluxo desejado pelo cliente:\n{request.chatbot_description}\n\n"
            f"INSTRUÇÕES:\n"
            f"1. Gere setores (entre 3 e 5) e etiquetas (entre 4 e 6) personalizados.\n"
            f"2. Monte o fluxo como uma lista de blocos em 'custom_steps' (máximo 15 blocos).\n"
            f"3. O primeiro bloco DEVE ser send_message (boas-vindas).\n"
            f"4. O último bloco de cada branch DEVE ser sector_transfer ou close_chat.\n"
            f"5. Cada nome em 'sectors' e 'labels' deve ter no máximo 24 caracteres.\n"
            f"6. Os índices em 'next' são SEMPRE 0-based, referenciando a posição EXATA do bloco em custom_steps.\n"
            f"   Bloco 0 = primeiro bloco, bloco 1 = segundo, etc.\n"
            f"   ANTES de escrever cada 'next', conte os blocos na lista e confirme o índice.\n"
            f"7. REGRA CRÍTICA DE BRANCHES: cada branch deve ter seu próprio caminho completo e independente.\n"
            f"   - Se options tem opção A e opção B: A deve ir para blocos da branch A, B para blocos da branch B.\n"
            f"   - NUNCA faça a branch A apontar para um bloco que pertence à branch B e vice-versa.\n"
            f"   - Se ambas as branches convergem (ex: mensagem de fora do horário), use o MESMO índice para ambas.\n"
            f"8. REGRA CRÍTICA DE time_of_day:\n"
            f"   - range in-hours 'next' deve apontar para o próximo bloco DENTRO da mesma branch (ex: sector_transfer).\n"
            f"   - range out-of-hours 'next' deve apontar para o bloco de encerramento compartilhado (ex: send+close_chat).\n"
            f"   Exemplo CORRETO com 2 opções e horário comercial:\n"
            f"   [0:send_msg(boas-vindas), 1:collect_text(nome), 2:collect_text(email),\n"
            f"    3:options(Vendas→4, Suporte→7),\n"
            f"    4:time_of_day(in:09-18→5, out:18-09→10),  5:sector_transfer(Vendas),\n"
            f"    6:send_msg(fora_horário_A - NÃO USE, use o bloco 10 compartilhado),\n"
            f"    7:time_of_day(in:09-18→8, out:18-09→10),  8:sector_transfer(Suporte),\n"
            f"    9:send_msg(atendente_disponível - NÃO USE se não necessário),\n"
            f"    10:send_msg(fora do horário comercial), 11:close_chat]\n"
            f"   Note: 'in:09-18→5' significa range 09:00-18:00 com next=5. '→' indica o valor de 'next'.\n\n"
            f"Tipos de bloco disponíveis: {_CUSTOM_STEP_TYPES}\n"
            f"Parâmetros por tipo:\n{_CUSTOM_STEP_PARAMS}\n"
            f"Responda APENAS com JSON puro, sem markdown, sem texto extra, "
            f"com exatamente estes campos:\n"
            f'{{"chatbot_name": "...", "chatbot_approach": "...", "explanation": "...", '
            f'"sectors": ["...", "..."], "labels": ["...", "..."], '
            f'"welcome_message": "...", '
            f'"custom_steps": [{{"type": "...", "params": {{}}}}]}}'
        )

        return await self._call_and_parse(prompt, max_tokens=2000)

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

        # Remove stray periods between a closing quote and a comma/brace: "value"., → "value",
        text = re.sub(r'(")\s*\.\s*,', r'",', text)

        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError) as exc:
            raise AiConfigError(f"Resposta do modelo não é JSON válido: {text!r}") from exc

        return AiConfig(**data)
