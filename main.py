import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import OnboardingRequest, OnboardingResult, ChatSessionRequest, ChatSessionResponse, MaturityRequest, SurpriseRequest, ValidateCredentialsRequest
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
    allow_origins=origins,
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
