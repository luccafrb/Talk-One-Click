from __future__ import annotations

import json
import logging
import os
import re

from openai import OpenAI

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


def _strip_markdown(text: str) -> str:
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0].strip()
    return text


async def generate_insights(
    kpis: dict,
    heatmap: list[dict],
    agents: list[dict],
    tags: list[dict],
    bot_stats: dict,
    days: int,
) -> list[dict]:
    """Generate AI-powered insights from analytics data. Returns list of insight dicts."""

    # Find peak hour from heatmap
    peak = max(heatmap, key=lambda x: x["count"]) if heatmap else {}
    peak_str = f"hora {peak.get('hour', '?')}h (dia {peak.get('weekday', '?')})" if peak else "desconhecido"

    top_tags = ", ".join(t["name"] for t in tags[:5]) if tags else "nenhuma"
    top_agents = ", ".join(
        f"{a['name']} ({a['resolved']} resolvidos)" for a in agents[:3]
    ) if agents else "nenhum"

    avg_wait = kpis.get("avg_wait_time_seconds", 0)
    avg_frt = kpis.get("avg_first_response_seconds", 0)
    resolution = kpis.get("resolution_rate", 0)
    bot_rate = kpis.get("bot_resolution_rate", 0)
    csat = kpis.get("avg_csat")
    csat_str = f"{csat:.1f}" if csat is not None else "sem dados"

    prompt = (
        f"Você é um especialista em operações de atendimento ao cliente. "
        f"Analise os dados abaixo do período de {days} dias e gere de 4 a 6 insights acionáveis.\n\n"
        f"DADOS:\n"
        f"- Total de conversas: {kpis.get('total_conversations', 0)}\n"
        f"- Aguardando agora: {kpis.get('waiting_now', 0)}\n"
        f"- Taxa de resolução: {resolution:.1%}\n"
        f"- Taxa de resolução pelo bot: {bot_rate:.1%}\n"
        f"- Tempo médio de espera: {avg_wait:.0f}s ({avg_wait/60:.1f} min)\n"
        f"- Tempo médio primeira resposta: {avg_frt:.0f}s ({avg_frt/60:.1f} min)\n"
        f"- CSAT médio: {csat_str}\n"
        f"- Agentes ativos: {kpis.get('active_agents', 0)}\n"
        f"- Horário de pico: {peak_str}\n"
        f"- Top etiquetas: {top_tags}\n"
        f"- Top agentes: {top_agents}\n"
        f"- Bot: {bot_stats.get('initiated', 0)} iniciados, "
        f"{bot_stats.get('resolved_without_human', 0)} resolvidos sem humano, "
        f"{bot_stats.get('transferred', 0)} transferidos\n\n"
        f"Retorne APENAS JSON puro, sem markdown, sem texto extra:\n"
        f'[{{"type": "warning|success|danger|info", "title": "título curto", '
        f'"description": "descrição do problema ou observação", '
        f'"metric": "métrica relevante em destaque", '
        f'"recommendation": "ação concreta recomendada"}}]'
    )

    try:
        response = _client.chat.completions.create(
            model=_model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _strip_markdown(response.choices[0].message.content.strip())
        data = json.loads(raw)
        return data if isinstance(data, list) else data.get("insights", [])
    except json.JSONDecodeError as exc:
        # Try to extract JSON array from text
        match = re.search(r"\[[\s\S]*\]", raw if "raw" in dir() else "")
        if match:
            try:
                return json.loads(match.group(0))
            except (json.JSONDecodeError, TypeError):
                pass
        logger.warning("generate_insights: falha ao parsear JSON: %s", exc)
        raise AiConfigError(f"Falha ao parsear insights: {exc}")
    except Exception as exc:
        logger.warning("generate_insights: falha na chamada ao modelo: %s", exc)
        raise AiConfigError(str(exc))
