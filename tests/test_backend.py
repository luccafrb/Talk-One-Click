import os
import pytest
import httpx

BASE = "http://127.0.0.1:8002"
CLIENT = httpx.Client(base_url=BASE, timeout=60.0)

# Helper: minimal valid draft
EMPTY_DRAFT = {
    "business_name": None, "segment": None, "goal": None, "approach": None,
    "suggested_sectors": [], "suggested_labels": [],
    "create_chatbot": None, "chatbot_description": None,
    "create_channel": None, "channel_name": None, "member_emails": [],
    "create_quick_answers": None, "quick_answers_hint": None,
    "close_chat_message": None, "confidence": 0
}

def test_health():
    r = CLIENT.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_chat_start_returns_200():
    r = CLIENT.post("/onboarding/chat/start")
    assert r.status_code == 200

def test_chat_start_has_message_and_draft():
    r = CLIENT.post("/onboarding/chat/start")
    data = r.json()
    assert "message" in data
    assert "draft" in data
    assert isinstance(data["message"], str)
    assert len(data["message"]) > 0
    assert isinstance(data["draft"], dict)

def test_chat_start_draft_has_required_fields():
    r = CLIENT.post("/onboarding/chat/start")
    draft = r.json()["draft"]
    for field in ["business_name", "segment", "goal", "approach", "confidence"]:
        assert field in draft, f"Missing field: {field}"

def test_chat_message_basic():
    messages = [{"role": "user", "content": "Tenho uma clínica odontológica"}]
    r = CLIENT.post("/onboarding/chat/message", json={"messages": messages, "draft": EMPTY_DRAFT})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "draft" in data
    assert "ready" in data

def test_chat_message_confidence_is_number():
    messages = [{"role": "user", "content": "Tenho uma clínica odontológica"}]
    r = CLIENT.post("/onboarding/chat/message", json={"messages": messages, "draft": EMPTY_DRAFT})
    confidence = r.json()["draft"]["confidence"]
    assert isinstance(confidence, (int, float))
    assert 0 <= confidence <= 100

def test_chat_message_confidence_increases():
    # Multi-turn conversation
    messages = [
        {"role": "user", "content": "Tenho uma clínica odontológica com 3 dentistas"},
        {"role": "assistant", "content": "Ótimo! Qual é o principal objetivo de vocês com a plataforma?"},
        {"role": "user", "content": "Organizar agendamentos e reduzir tempo de resposta no WhatsApp"},
        {"role": "assistant", "content": "Entendi! Vocês têm setores separados, tipo Clínica Geral e Ortodontia?"},
        {"role": "user", "content": "Sim, temos Clínica Geral, Ortodontia e Implantes"},
    ]
    draft = dict(EMPTY_DRAFT)
    # First message
    r1 = CLIENT.post("/onboarding/chat/message", json={"messages": messages[:1], "draft": EMPTY_DRAFT})
    c1 = r1.json()["draft"]["confidence"]
    # After 5 messages
    r2 = CLIENT.post("/onboarding/chat/message", json={"messages": messages, "draft": r1.json()["draft"]})
    c2 = r2.json()["draft"]["confidence"]
    assert c2 >= c1, f"Confidence should not decrease: {c1} -> {c2}"

def test_chat_finalize():
    messages = [
        {"role": "user", "content": "Tenho uma clínica odontológica chamada Sorrir Mais"},
        {"role": "assistant", "content": "Que ótimo! Qual o principal objetivo de vocês?"},
        {"role": "user", "content": "Organizar agendamentos e atendimento pelo WhatsApp"},
        {"role": "assistant", "content": "Perfeito! Vocês têm setores separados?"},
        {"role": "user", "content": "Sim: Clínica Geral, Ortodontia e Implantes"},
    ]
    draft = {
        "business_name": "Sorrir Mais", "segment": "saude", "goal": "Organizar agendamentos",
        "approach": "empatico", "suggested_sectors": ["Clínica Geral", "Ortodontia", "Implantes"],
        "suggested_labels": ["Consulta Marcada", "Urgente", "Retorno"],
        "create_chatbot": True, "chatbot_description": None,
        "create_channel": False, "channel_name": None, "member_emails": [],
        "create_quick_answers": None, "quick_answers_hint": None,
        "close_chat_message": None, "confidence": 85
    }
    r = CLIENT.post("/onboarding/chat/finalize", json={"messages": messages, "draft": draft})
    assert r.status_code == 200
    data = r.json()
    for field in ["business_name", "segment", "goal", "approach"]:
        assert field in data, f"Missing field: {field}"

def test_surprise_returns_200():
    payload = {"segment": "saude", "business_name": "Clínica Teste", "description": "Clínica odontológica com 3 dentistas"}
    r = CLIENT.post("/onboarding/surprise", json=payload)
    assert r.status_code == 200

def test_surprise_valid_approach():
    payload = {"segment": "saude", "business_name": "Clínica Teste", "description": "Clínica odontológica com 3 dentistas"}
    r = CLIENT.post("/onboarding/surprise", json=payload)
    data = r.json()
    valid = {"consultivo", "direto", "empatico", "tecnico", "comercial", "educativo"}
    assert data.get("approach") in valid, f"Invalid approach: {data.get('approach')}"

def test_surprise_required_fields():
    payload = {"segment": "saude", "business_name": "Clínica Teste", "description": "Clínica odontológica"}
    r = CLIENT.post("/onboarding/surprise", json=payload)
    data = r.json()
    for field in ["goal", "approach", "create_sectors", "create_labels", "create_chatbot"]:
        assert field in data, f"Missing field: {field}"

def test_maturity_score():
    messages = [
        {"role": "user", "content": "Tenho uma clínica odontológica"},
        {"role": "assistant", "content": "Ótimo! Qual o objetivo principal?"},
        {"role": "user", "content": "Organizar agendamentos"},
    ]
    onboarding_result = {
        "status": "ok", "sectors_created": 3, "labels_created": 4,
        "chatbot_created": True, "channel_id": None, "members_invited": 0,
        "members": [], "errors": []
    }
    r = CLIENT.post("/onboarding/chat/maturity", json={"messages": messages, "onboarding_result": onboarding_result})
    assert r.status_code == 200
    data = r.json()
    for field in ["score", "nivel", "resumo", "pontos_fortes", "oportunidades", "proximo_passo"]:
        assert field in data, f"Missing field: {field}"
    assert 0 <= data["score"] <= 100

def test_onboarding_full():
    # Load .env
    from dotenv import dotenv_values
    env = dotenv_values(os.path.join(os.path.dirname(__file__), "..", ".env"))
    api_key = env.get("TALK_API_KEY") or env.get("talk_api_key")
    org_id = env.get("ORGANIZATION_ID") or env.get("organization_id")
    if not api_key or not org_id:
        pytest.skip("TALK_API_KEY or ORGANIZATION_ID not set in .env")
    payload = {
        "business_name": "Empresa Teste Automatizado",
        "segment": "tecnologia",
        "goal": "teste automatizado",
        "approach": "direto",
        "talk_api_key": api_key,
        "organization_id": org_id,
        "create_sectors": False,
        "create_labels": False,
        "create_chatbot": False,
        "create_quick_answers": False,
        "create_custom_fields": False,
        "configure_org_preferences": False,
    }
    r = CLIENT.post("/onboarding", json=payload, timeout=120.0)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("ok", "partial"), f"Unexpected status: {data['status']}"
    for field in ["status", "errors"]:
        assert field in data
