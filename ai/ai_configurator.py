import json
import os

from openai import OpenAI

from errors import AiConfigError
from models import AiConfig, OnboardingRequest

_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


class AiConfigurator:
    async def generate(self, request: OnboardingRequest) -> AiConfig:
        prompt = (
            f"Você é um especialista em atendimento ao cliente.\n"
            f"Configure um chatbot para o seguinte negócio:\n\n"
            f"- Nome: {request.business_name}\n"
            f"- Segmento: {request.segment}\n"
            f"- Objetivo principal: {request.goal}\n"
            f"- Abordagem desejada: {request.approach}\n\n"
            f"Responda APENAS com JSON puro, sem markdown, sem texto extra, "
            f"com exatamente estes campos:\n"
            f'{{"chatbot_name": "...", "chatbot_approach": "...", "explanation": "..."}}'
        )

        response = _client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.choices[0].message.content

        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError) as exc:
            raise AiConfigError(f"Resposta do modelo não é JSON válido: {text!r}") from exc

        return AiConfig(**data)
