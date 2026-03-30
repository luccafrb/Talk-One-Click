import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from models import OnboardingRequest, OnboardingResult, ChatSessionRequest, ChatSessionResponse, MaturityRequest, SurpriseRequest, ValidateCredentialsRequest, UndoRequest
from orchestrator import Orchestrator
from ai.discovery_agent import DiscoveryAgent
from ai.ai_configurator import AiConfigurator
from errors import AiConfigError

app = FastAPI()


@app.exception_handler(AiConfigError)
async def ai_config_error_handler(request: Request, exc: AiConfigError):
    return JSONResponse(status_code=502, content={"detail": exc.message})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger(__name__).error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": str(exc)})

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/onboarding/validate-credentials")
async def validate_credentials(request: ValidateCredentialsRequest):
    from client.talk_client import TalkClient
    from errors import TalkApiError
    client = TalkClient(request.talk_api_key, request.organization_id)
    try:
        data = await client.get(f"/v1/organizations/{request.organization_id}/")
        name = data.get("name") or data.get("Name") or data.get("organizationName") or None
        return {"valid": True, "organization_name": name}
    except TalkApiError as e:
        if e.status_code in (401, 403):
            return {"valid": False, "error": "API Key inválida ou sem permissão."}
        if e.status_code == 404:
            return {"valid": False, "error": "Organization ID não encontrado."}
        return {"valid": False, "error": f"Erro ao conectar ({e.status_code})."}
    except Exception:
        return {"valid": False, "error": "Não foi possível conectar à API Talk."}


@app.post("/onboarding", response_model=OnboardingResult)
async def onboarding(request: OnboardingRequest) -> OnboardingResult:
    orchestrator = Orchestrator(request.talk_api_key, request.organization_id)
    return await orchestrator.run(request)


@app.post("/onboarding/chat/start")
async def chat_start():
    return DiscoveryAgent().start_session()


@app.post("/onboarding/chat/message", response_model=ChatSessionResponse)
async def chat_message(request: ChatSessionRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    return await DiscoveryAgent().process_message(messages, request.draft)


@app.post("/onboarding/chat/finalize")
async def chat_finalize(request: ChatSessionRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    return await DiscoveryAgent().finalize(messages, request.draft)


@app.post("/onboarding/chat/maturity")
async def chat_maturity(request: MaturityRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    return await DiscoveryAgent().generate_maturity_score(messages, request.onboarding_result)


@app.post("/onboarding/surprise")
async def surprise_onboarding(request: SurpriseRequest):
    return await AiConfigurator().generate_surprise(
        request.segment or "",
        request.business_name or "",
        request.description,
    )


@app.post("/onboarding/demo")
async def onboarding_demo():
    import asyncio
    await asyncio.sleep(6)
    return {
        "status": "ok",
        "sectors_created": 3,
        "sectors": [
            {"name": "Suporte N1", "id": "demo-sector-1"},
            {"name": "Suporte N2", "id": "demo-sector-2"},
            {"name": "Comercial", "id": "demo-sector-3"},
        ],
        "labels_created": 4,
        "labels": [
            {"name": "Bug", "id": "demo-label-1", "color": "Tomato"},
            {"name": "Dúvida", "id": "demo-label-2", "color": "Blue"},
            {"name": "Churning", "id": "demo-label-3", "color": "Salmon"},
            {"name": "Onboarding", "id": "demo-label-4", "color": "Green"},
        ],
        "chatbot_created": True,
        "channel_id": "demo-channel-123",
        "members_invited": 0,
        "members": [],
        "quick_answers_created": 0,
        "custom_fields_created": 0,
        "org_preferences_configured": False,
        "ai_agent_created": False,
        "errors": [],
    }


class DemoChatRequest(BaseModel):
    step: int = 0

_DEMO_STEPS = [
    {
        "message": "Olá! Sou a IA de configuração da Talk. Para começar: o que sua empresa vende ou atende?",
        "draft": {"business_name": None, "segment": None, "goal": None, "approach": None, "suggested_sectors": [], "suggested_labels": [], "create_chatbot": None, "chatbot_description": None, "create_channel": None, "channel_name": None, "member_emails": [], "confidence": 0},
        "ready": False,
    },
    {
        "message": "Entendi! Uma empresa de tecnologia com foco em hospedagem. Qual é o principal tipo de conversa que vocês recebem dos clientes hoje?",
        "draft": {"business_name": "Umbler", "segment": "tecnologia", "goal": None, "approach": None, "suggested_sectors": [], "suggested_labels": [], "create_chatbot": None, "chatbot_description": None, "create_channel": None, "channel_name": None, "member_emails": [], "confidence": 25},
        "ready": False,
    },
    {
        "message": "Faz sentido — suporte técnico e dúvidas sobre planos. Quando um cliente entra em contato, o que ele normalmente quer resolver?",
        "draft": {"business_name": "Umbler", "segment": "tecnologia", "goal": "Organizar suporte e separar por nível de complexidade", "approach": None, "suggested_sectors": [], "suggested_labels": [], "create_chatbot": None, "chatbot_description": None, "create_channel": None, "channel_name": None, "member_emails": [], "confidence": 45},
        "ready": False,
    },
    {
        "message": "Ótimo. Seu time é dividido por especialidade ou todo mundo atende qualquer tipo de chamado?",
        "draft": {"business_name": "Umbler", "segment": "tecnologia", "goal": "Organizar suporte técnico, reduzir tempo de resposta e separar atendimento por nível de complexidade", "approach": "tecnico", "suggested_sectors": [], "suggested_labels": [], "create_chatbot": None, "chatbot_description": None, "create_channel": None, "channel_name": None, "member_emails": [], "confidence": 65},
        "ready": False,
    },
    {
        "message": "Perfeito! Com base no que você me contou, faz sentido criar os setores: Suporte N1, Suporte N2 e Comercial. Quer manter assim ou ajustar?",
        "draft": {"business_name": "Umbler", "segment": "tecnologia", "goal": "Organizar suporte técnico, reduzir tempo de resposta e separar atendimento por nível de complexidade", "approach": "tecnico", "suggested_sectors": ["Suporte N1", "Suporte N2", "Comercial"], "suggested_labels": ["Bug", "Dúvida", "Churning", "Onboarding"], "create_chatbot": None, "chatbot_description": None, "create_channel": None, "channel_name": None, "member_emails": [], "confidence": 85},
        "ready": False,
    },
    {
        "message": "Configuração definida! Vou montar tudo agora para a Umbler.",
        "draft": {"business_name": "Umbler", "segment": "tecnologia", "goal": "Organizar suporte técnico, reduzir tempo de resposta e separar atendimento por nível de complexidade", "approach": "tecnico", "suggested_sectors": ["Suporte N1", "Suporte N2", "Comercial"], "suggested_labels": ["Bug", "Dúvida", "Churning", "Onboarding"], "create_chatbot": True, "chatbot_description": "Chatbot de recepção que direciona por nível de suporte", "create_channel": False, "channel_name": None, "member_emails": [], "confidence": 100},
        "ready": True,
    },
]

@app.post("/onboarding/chat/demo")
async def chat_demo(request: DemoChatRequest):
    step = min(request.step, len(_DEMO_STEPS) - 1)
    return _DEMO_STEPS[step]


# ── Analytics ─────────────────────────────────────────────────────────────────

import asyncio as _asyncio

from models import AnalyticsRequest, AnalyticsResult
from modules.analytics_processor import AnalyticsProcessor
from ai.ai_insights import generate_insights
from modules.pdf_exporter import export_report_pdf


@app.post("/analytics/report", response_model=AnalyticsResult)
async def analytics_report(request: AnalyticsRequest) -> AnalyticsResult:
    from client.talk_client import TalkClient as _TalkClient
    client = _TalkClient(request.talk_api_key, request.organization_id)
    errors: list = []

    try:
        chats, ratings, members = await _asyncio.gather(
            client.get_chats(request.days),
            client.get_ratings(request.days),
            client.get_online_members(),
        )
    except Exception as e:
        errors.append({"step": "fetch", "error": str(e)})
        return AnalyticsResult(status="error", errors=errors)

    processor = AnalyticsProcessor(chats, ratings, members)

    kpis = processor.compute_kpis()
    volume = processor.volume_series()
    heatmap = processor.hourly_heatmap()
    agents = processor.agent_ranking()
    tags = processor.tag_distribution()
    channels = processor.channel_distribution()
    bots = processor.bot_stats()

    insights: list = []
    try:
        insights = await generate_insights(kpis, heatmap, agents, tags, bots, request.days)
    except Exception as e:
        errors.append({"step": "insights", "error": str(e)})

    status = "ok" if not errors else "partial"
    return AnalyticsResult(
        status=status,
        kpis=kpis,
        volume_series=volume,
        hourly_heatmap=heatmap,
        agent_ranking=agents,
        tag_distribution=tags,
        channel_distribution=channels,
        bot_stats=bots,
        insights=insights,
        errors=errors,
    )


@app.get("/analytics/report/stream")
async def analytics_report_stream(request: Request, talk_api_key: str, organization_id: str, days: int = 15):
    import json as _json
    from fastapi.responses import StreamingResponse

    async def _generate():
        from client.talk_client import TalkClient as _TalkClient
        client = _TalkClient(talk_api_key, organization_id)
        errors: list = []

        def evt(payload: dict) -> str:
            return f"data: {_json.dumps(payload)}\n\n"

        yield evt({"type": "progress", "pct": 5, "step": "fetch",
                   "label": "Conectando à Talk API..."})

        # ── Etapa 1: buscar dados (paralelo, cancelável) ─────────────────────
        async def _do_fetch():
            return await _asyncio.gather(
                client.get_chats(days),
                client.get_ratings(days),
                client.get_online_members(),
            )
        fetch_task = _asyncio.create_task(_do_fetch())
        while not fetch_task.done():
            if await request.is_disconnected():
                fetch_task.cancel()
                return
            await _asyncio.sleep(0.3)

        try:
            chats, ratings, members = fetch_task.result()
        except _asyncio.CancelledError:
            return
        except Exception as e:
            errors.append({"step": "fetch", "error": str(e)})
            yield evt({"type": "error", "step": "fetch", "message": str(e)})
            return

        if await request.is_disconnected():
            return

        yield evt({"type": "progress", "pct": 45, "step": "fetch",
                   "label": f"{len(chats)} conversas e {len(ratings)} avaliações carregadas"})

        # ── Etapa 2: processar métricas ──────────────────────────────────────
        processor = AnalyticsProcessor(chats, ratings, members)
        kpis    = processor.compute_kpis()
        volume  = processor.volume_series()
        heatmap = processor.hourly_heatmap()
        agents  = processor.agent_ranking()
        tags    = processor.tag_distribution()
        channels = processor.channel_distribution()
        bots    = processor.bot_stats()

        if await request.is_disconnected():
            return

        yield evt({"type": "progress", "pct": 60, "step": "process",
                   "label": "Métricas calculadas"})

        # ── Etapa 3: insights com IA (cancelável) ────────────────────────────
        yield evt({"type": "progress", "pct": 65, "step": "ai",
                   "label": "Gerando insights com IA..."})

        insights: list = []
        ai_task = _asyncio.create_task(generate_insights(kpis, heatmap, agents, tags, bots, days))
        while not ai_task.done():
            if await request.is_disconnected():
                ai_task.cancel()
                return
            await _asyncio.sleep(0.3)

        try:
            insights = ai_task.result()
        except _asyncio.CancelledError:
            return
        except Exception as e:
            errors.append({"step": "insights", "error": str(e)})

        if await request.is_disconnected():
            return

        yield evt({"type": "progress", "pct": 95, "step": "render",
                   "label": "Finalizando relatório..."})

        # ── Resultado final ──────────────────────────────────────────────────
        result = AnalyticsResult(
            status="ok" if not errors else "partial",
            kpis=kpis, volume_series=volume, hourly_heatmap=heatmap,
            agent_ranking=agents, tag_distribution=tags,
            channel_distribution=channels, bot_stats=bots,
            insights=insights, errors=errors,
        )
        yield evt({"type": "done", "data": result.model_dump()})

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/analytics/export/pdf")
async def analytics_export_pdf(talk_api_key: str, organization_id: str, days: int = 15):
    from fastapi.responses import Response as _Response
    req = AnalyticsRequest(talk_api_key=talk_api_key, organization_id=organization_id, days=days)
    result = await analytics_report(req)
    data = result.model_dump()
    try:
        pdf_bytes = export_report_pdf(data)
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})
    return _Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio-atendimento.pdf"},
    )


@app.post("/onboarding/undo")
async def onboarding_undo(request: UndoRequest):
    from client.talk_client import TalkClient
    from errors import TalkApiError
    errors = []
    deleted_sectors = 0
    deleted_labels = 0
    deleted_chatbot = False

    client = TalkClient(request.talk_api_key, request.organization_id)

    for sector_id in request.sector_ids:
        try:
            await client.delete(f"/v1/sectors/{sector_id}/")
            deleted_sectors += 1
        except TalkApiError as e:
            errors.append({"step": f"sector:{sector_id}", "error": str(e)})
        except Exception as e:
            errors.append({"step": f"sector:{sector_id}", "error": str(e)})

    for label_id in request.label_ids:
        try:
            await client.delete(f"/v1/tags/{label_id}/")
            deleted_labels += 1
        except TalkApiError as e:
            errors.append({"step": f"label:{label_id}", "error": str(e)})
        except Exception as e:
            errors.append({"step": f"label:{label_id}", "error": str(e)})

    if request.chatbot_id:
        try:
            await client.delete(f"/v1/bots/{request.chatbot_id}/")
            deleted_chatbot = True
        except TalkApiError as e:
            errors.append({"step": "chatbot", "error": str(e)})
        except Exception as e:
            errors.append({"step": "chatbot", "error": str(e)})

    # channel_id is intentionally ignored — channels should not be auto-deleted

    if errors and deleted_sectors == 0 and deleted_labels == 0 and not deleted_chatbot:
        status = "error"
    elif errors:
        status = "partial"
    else:
        status = "ok"

    return {
        "status": status,
        "deleted_sectors": deleted_sectors,
        "deleted_labels": deleted_labels,
        "deleted_chatbot": deleted_chatbot,
        "errors": errors,
    }
