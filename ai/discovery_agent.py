import json
import logging
import os
import re
import sys

from openai import OpenAI

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from errors import AiConfigError

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


_SYSTEM_PROMPT = """Você é uma consultora experiente em atendimento ao cliente e configuração de plataformas de chat. Seu papel é entender o negócio do cliente através de uma conversa natural e montar a configuração ideal para a plataforma Talk.

TOM: amigável, direto, português brasileiro informal mas profissional. Nunca use jargões técnicos sem explicar.

ESTRATÉGIA DE PERGUNTAS:
- Faça UMA pergunta por vez
- 6 a 10 perguntas no total, adaptadas ao que já sabe
- Nunca faça um questionário fixo — adapte conforme a conversa
- Sequência sugerida de temas (não obrigatória):
  1. O que a empresa vende ou atende
  2. Principal tipo de conversa que recebem
  3. O que o cliente normalmente quer resolver
  4. Objetivo principal: vender, organizar, agendar ou filtrar
  5. Time dividido por áreas ou todos atendem tudo
  6. Quais tipos de conversa naturalmente virariam categorias/etiquetas
  7. Chatbot: proponha proativamente um chatbot com uma sugestão concreta baseada no negócio — ex: "Pelo que você me contou, daria pra criar um chatbot que recepciona o cliente, pergunta se é agendamento ou dúvida e já direciona pro setor certo. Faz sentido pra você?" — se aceitar, peça uma descrição curta de como deve funcionar; se recusar, registre create_chatbot: false
  8. Canal: pergunte se já tem um canal de WhatsApp configurado ou quer criar um agora — se sim, peça o nome do canal (ex: "WhatsApp Principal")
  9. Atendentes: pergunte se quer convidar membros da equipe agora — se sim, peça os e-mails separados por vírgula


QUANDO confidence >= 80: proponha os recursos em vez de perguntar diretamente.
Exemplo: "Pelo que você me contou, faz sentido começar com os setores Vendas, Suporte e Financeiro. Quer manter assim ou prefere ajustar?"
NUNCA pergunte "quais setores você quer?" antes de entender a operação.
CHATBOT: pergunte sempre, mesmo que confidence já seja alta — proponha com uma sugestão concreta adaptada ao segmento e objetivo do cliente. Nunca pergunte "quer um chatbot?" de forma genérica — sempre sugira como ele funcionaria.
CANAL e ATENDENTES: pergunte sempre, mesmo que confidence já seja alta — são perguntas rápidas e importantes.

EXTRAÇÃO CONTÍNUA: a cada mensagem, atualize o rascunho com o que aprendeu.

MAPEAMENTO DE SEGMENTO (infira automaticamente):
- salão, barbearia, estética, cabelo, manicure, spa, beleza → "beleza"
- clínica, médico, consultório, saúde, dentista, psicólogo, terapeuta → "saude"
- loja, produto, e-commerce, venda online, entrega, marketplace → "ecommerce"
- escola, curso, aula, treinamento, educação, faculdade, tutoria → "educacao"
- imóvel, apartamento, casa, corretor, imobiliária, aluguel, locação → "imobiliaria"
- advogado, advocacia, jurídico, direito, escritório de advocacia → "juridico"
- contabilidade, financeiro, seguro, crédito, investimento, banco → "financeiro"
- restaurante, lanchonete, delivery, café, pizzaria, comida → "restaurante"
- frete, transportadora, logística, rastreamento, entrega, carga → "logistica"
- software, SaaS, tecnologia, suporte técnico, desenvolvimento, TI → "tecnologia"
- construtora, reforma, obra, arquitetura, engenharia, construção → "construcao"
- carro, concessionária, oficina, moto, locadora, peças → "automotivo"
- festa, buffet, casamento, evento, cerimonial, formatura → "eventos"
- pet shop, veterinário, banho e tosa, ração, animal → "pet"
- (qualquer outro negócio não listado acima) → "outro"

MAPEAMENTO DE ABORDAGEM (infira com base no tom e contexto do negócio):
- Negócio consultivo/serviços profissionais onde o cliente precisa ser educado → "consultivo"
- Negócio ágil, cliente quer respostas rápidas e objetivas → "direto"
- Negócio sensível (saúde, jurídico, luto, crise) onde empatia é essencial → "empatico"
- Negócio técnico (TI, engenharia, jurídico) onde precisão é crítica → "tecnico"
- Negócio comercial agressivo, foco em conversão → "comercial"
- Negócio onde o cliente precisa aprender a usar o produto/serviço → "educativo"
Nunca pergunte sobre abordagem diretamente — infira pelo contexto.

CÁLCULO DE CONFIDENCE:
- business_name preenchido: +15
- segment inferido: +20
- goal definido: +15
- approach inferida: +10
- suggested_sectors com 2+ itens: +20
- suggested_labels com 2+ itens: +20
Total máximo: 100

RESPOSTA: sempre retorne JSON puro, sem markdown, sem texto extra:
{
  "message": "texto da sua resposta",
  "draft": {
    "business_name": string|null,
    "segment": "beleza"|"saude"|"ecommerce"|"educacao"|"imobiliaria"|"juridico"|"financeiro"|"restaurante"|"logistica"|"tecnologia"|"construcao"|"automotivo"|"eventos"|"pet"|"outro"|null,
    "goal": string|null,
    "approach": "consultivo"|"direto"|"empatico"|"tecnico"|"comercial"|"educativo"|null,
    "suggested_sectors": [],
    "suggested_labels": [],
    "create_chatbot": boolean|null,
    "chatbot_description": string|null,
    "create_channel": boolean|null,
    "channel_name": string|null,
    "member_emails": [],
    "confidence": número de 0 a 100
  },
  "ready": boolean
}

"ready" deve ser true quando confidence >= 80 E business_name, segment, goal, suggested_sectors e suggested_labels estiverem preenchidos.

CRÍTICO: sua resposta deve ser EXCLUSIVAMENTE o JSON acima. Nenhuma palavra antes, nenhuma palavra depois, sem markdown, sem explicações. Se você incluir qualquer texto fora do JSON, o sistema quebrará."""


class DiscoveryAgent:
    def start_session(self) -> dict:
        return {
            "message": "Olá! Vou te ajudar a configurar a Talk para o seu negócio. Para começar: o que sua empresa vende ou atende?",
            "draft": {
                "business_name": None,
                "segment": None,
                "goal": None,
                "approach": None,
                "suggested_sectors": [],
                "suggested_labels": [],
                "create_chatbot": None,
                "chatbot_description": None,
                "create_channel": None,
                "channel_name": None,
                "member_emails": [],
                "confidence": 0,
            },
        }

    async def process_message(self, messages: list[dict], current_draft: dict) -> dict:
        draft_context = json.dumps(current_draft, ensure_ascii=False, indent=2)
        system = (
            _SYSTEM_PROMPT
            + f"\n\nRASCUNHO ATUAL (o que já foi extraído da conversa):\n{draft_context}\n"
            "Atualize o rascunho com tudo que aprender nesta mensagem. Mantenha o que já está preenchido."
        )
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=800,
            messages=[{"role": "system", "content": system}] + messages,
        )
        return self._parse(response.choices[0].message.content, current_draft)

    async def finalize(self, messages: list[dict], draft: dict) -> dict:
        draft_json = json.dumps(draft, ensure_ascii=False, indent=2)
        prompt = (
            "Com base na conversa abaixo e no rascunho atual, gere o payload final de onboarding.\n\n"
            f"RASCUNHO ATUAL:\n{draft_json}\n\n"
            "Retorne APENAS JSON puro com exatamente estes campos:\n"
            '{"business_name": str, "segment": "beleza|saude|ecommerce|educacao|imobiliaria|juridico|financeiro|restaurante|logistica|tecnologia|construcao|automotivo|eventos|pet|outro", '
            '"goal": str, "approach": "consultivo|direto|empatico|tecnico|comercial|educativo", '
            '"sectors_description": str (lista dos setores sugeridos separados por vírgula, ou null), '
            '"labels_description": str (lista das etiquetas sugeridas separadas por vírgula, ou null), '
            '"create_sectors": bool, "create_labels": bool, "create_chatbot": bool, '
            '"chatbot_description": str (descrição resumida do fluxo/abordagem do chatbot, ou null), '
            '"create_channel": bool, "channel_name": str|null, '
            '"member_emails": [] (lista de e-mails dos atendentes, vazia se nenhum)}\n\n'
            "Consolide tudo da conversa. Se um campo não foi mencionado, use valores razoáveis baseados no contexto."
        )
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=600,
            messages=[{"role": "system", "content": prompt}, *messages],
        )
        text = self._strip_markdown(response.choices[0].message.content.strip())
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            sectors = draft.get("suggested_sectors") or []
            labels = draft.get("suggested_labels") or []
            return {
                "business_name": draft.get("business_name") or "",
                "segment": draft.get("segment") or "ecommerce",
                "goal": draft.get("goal") or "",
                "approach": draft.get("approach") or "consultivo",
                "sectors_description": ", ".join(sectors) if sectors else None,
                "labels_description": ", ".join(labels) if labels else None,
                "create_sectors": len(sectors) > 0,
                "create_labels": len(labels) > 0,
                "create_chatbot": draft.get("create_chatbot") if draft.get("create_chatbot") is not None else True,
                "chatbot_description": draft.get("chatbot_description"),
                "create_channel": draft.get("create_channel") or False,
                "channel_name": draft.get("channel_name"),
                "member_emails": draft.get("member_emails") or [],
            }

    def _strip_markdown(self, text: str) -> str:
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.rsplit("```", 1)[0].strip()
        return text

    def _build_result(self, data: dict, fallback_draft: dict) -> dict:
        merged_draft = {**fallback_draft, **data.get("draft", {})}
        ai_ready = data.get("ready", False)
        forced_ready = (
            merged_draft.get("confidence", 0) >= 80
            and bool(merged_draft.get("business_name"))
            and bool(merged_draft.get("segment"))
            and bool(merged_draft.get("goal"))
            and len(merged_draft.get("suggested_sectors") or []) >= 1
            and len(merged_draft.get("suggested_labels") or []) >= 1
        )
        return {
            "message": data.get("message", ""),
            "draft": merged_draft,
            "ready": ai_ready or forced_ready,
        }

    def _parse(self, raw: str, fallback_draft: dict) -> dict:
        text = raw.strip()

        # Tentativa 1: texto inteiro é JSON (ou começa com ```)
        cleaned = re.sub(r'(")\s*\.\s*,', r'",', self._strip_markdown(text))
        try:
            return self._build_result(json.loads(cleaned), fallback_draft)
        except (json.JSONDecodeError, TypeError):
            pass

        # Tentativa 2: extrai bloco ```json ... ``` de qualquer posição
        block = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if block:
            candidate = re.sub(r'(")\s*\.\s*,', r'",', block.group(1).strip())
            try:
                return self._build_result(json.loads(candidate), fallback_draft)
            except (json.JSONDecodeError, TypeError):
                pass

        # Tentativa 3: extrai o último objeto { ... } do texto
        brace = re.search(r'\{[\s\S]*\}', text)
        if brace:
            candidate = re.sub(r'(")\s*\.\s*,', r'",', brace.group(0))
            try:
                return self._build_result(json.loads(candidate), fallback_draft)
            except (json.JSONDecodeError, TypeError):
                pass

        logger.warning("_parse: não foi possível extrair JSON da resposta do modelo")
        return {"message": text, "draft": fallback_draft, "ready": False}

    async def generate_maturity_score(self, messages: list[dict], onboarding_result: dict) -> dict:
        system = (
            "Você é um especialista em operações de atendimento ao cliente. "
            "Com base na conversa de onboarding e na configuração criada, gere um diagnóstico "
            "completo de maturidade de atendimento para este negócio.\n\n"
            "Retorne APENAS JSON puro neste formato exato:\n"
            '{"score": número de 0 a 100, '
            '"nivel": "Iniciante" | "Em desenvolvimento" | "Intermediário" | "Avançado" | "Referência", '
            '"resumo": "frase curta de 1 linha descrevendo o momento atual da operação", '
            '"pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"], '
            '"oportunidades": [{"titulo": "título curto", "descricao": "o que fazer e por que isso vai melhorar o atendimento", '
            '"impacto": "Alto" | "Médio" | "Baixo", "prazo": "Imediato" | "Curto prazo" | "Médio prazo"}], '
            '"proximo_passo": "ação mais importante que o cliente deve tomar agora, em 1 frase"}\n\n'
            "Regras:\n"
            "- score reflete honestamente a maturidade: negócios sem processos definidos = 20-40, "
            "com alguma organização = 40-60, bem estruturados = 60-80, excelência = 80-100\n"
            "- pontos_fortes: exatamente 3 itens, específicos para o negócio descrito\n"
            "- oportunidades: entre 3 e 5 itens, do mais impactante para o menos\n"
            "- seja específico e prático, não genérico\n\n"
            f"RESULTADO DO ONBOARDING:\n{json.dumps(onboarding_result, ensure_ascii=False, indent=2)}"
        )
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=1000,
            messages=[{"role": "system", "content": system}] + messages,
        )
        raw = self._strip_markdown(response.choices[0].message.content.strip())
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            brace = re.search(r'\{[\s\S]*\}', raw)
            if brace:
                try:
                    return json.loads(brace.group(0))
                except (json.JSONDecodeError, TypeError):
                    pass
            raise AiConfigError("Falha ao parsear score de maturidade")
