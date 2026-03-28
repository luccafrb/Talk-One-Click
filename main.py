from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from models import OnboardingRequest, OnboardingResult
from orchestrator import Orchestrator

app = FastAPI()


@app.post("/onboarding", response_model=OnboardingResult)
async def onboarding(request: OnboardingRequest) -> OnboardingResult:
    orchestrator = Orchestrator(request.talk_api_key, request.organization_id)
    return await orchestrator.run(request)
