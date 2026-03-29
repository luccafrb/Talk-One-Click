from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import OnboardingRequest, OnboardingResult, ChatSessionRequest, ChatSessionResponse, MaturityRequest, SurpriseRequest
from orchestrator import Orchestrator
from ai.discovery_agent import DiscoveryAgent
from ai.ai_configurator import AiConfigurator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
