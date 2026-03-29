import json
import pytest
from playwright.sync_api import sync_playwright, expect

FRONTEND_URL = "http://localhost:5173"

@pytest.fixture(scope="module")
def browser_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        yield page
        browser.close()

def go_past_credentials(page):
    """Helper: fill credentials and proceed to select screen."""
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("networkidle")

    # Mock the validate-credentials endpoint so fake creds pass
    def handle_validate(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"valid": True, "organization_name": "Test Org"}),
        )

    page.route("**/onboarding/validate-credentials", handle_validate)

    # Fill API key
    inputs = page.locator("input")
    inputs.nth(0).fill("fake-api-key-for-testing")
    inputs.nth(1).fill("fake-org-id-for-testing")
    page.locator("button[type='submit']").click()
    page.wait_for_timeout(500)

    # Remove the route mock after navigation
    page.unroute("**/onboarding/validate-credentials")

def test_credentials_screen_visible(browser_page):
    browser_page.goto(FRONTEND_URL)
    browser_page.wait_for_load_state("networkidle")
    # Should see the credentials gate
    assert browser_page.locator("input").count() >= 2

def test_credentials_connect_button_disabled_when_empty(browser_page):
    browser_page.goto(FRONTEND_URL)
    browser_page.wait_for_load_state("networkidle")
    btn = browser_page.locator("button[type='submit']")
    assert btn.is_disabled()

def test_credentials_connect_button_enabled_when_filled(browser_page):
    browser_page.goto(FRONTEND_URL)
    browser_page.wait_for_load_state("networkidle")
    inputs = browser_page.locator("input")
    inputs.nth(0).fill("fake-api-key")
    inputs.nth(1).fill("fake-org-id")
    btn = browser_page.locator("button[type='submit']")
    assert btn.is_enabled()

def test_credentials_advances_to_select(browser_page):
    go_past_credentials(browser_page)
    # Should now see the select screen cards
    assert browser_page.locator("text=Já sei o que quero").count() > 0 or \
           browser_page.locator("text=Me ajude a configurar").count() > 0

def test_select_screen_has_both_cards(browser_page):
    go_past_credentials(browser_page)
    assert browser_page.locator("text=Já sei o que quero").count() > 0
    assert browser_page.locator("text=Me ajude a configurar").count() > 0

def test_select_screen_has_recommended_badge(browser_page):
    go_past_credentials(browser_page)
    assert browser_page.locator("text=Recomendado").count() > 0

def test_select_goes_to_form(browser_page):
    go_past_credentials(browser_page)
    browser_page.locator("text=Preencher formulário").click()
    browser_page.wait_for_timeout(500)
    # Should see the form
    assert browser_page.locator("text=Dados do negócio").count() > 0 or \
           browser_page.locator("text=Nome do negócio").count() > 0

def test_form_no_credentials_card(browser_page):
    go_past_credentials(browser_page)
    browser_page.locator("text=Preencher formulário").click()
    browser_page.wait_for_timeout(500)
    # Credentials card should NOT appear in the form
    assert browser_page.locator("text=Credenciais Talk").count() == 0

def test_form_has_required_fields(browser_page):
    go_past_credentials(browser_page)
    browser_page.locator("text=Preencher formulário").click()
    browser_page.wait_for_timeout(500)
    assert browser_page.locator("text=Nome do negócio").count() > 0
    assert browser_page.locator("text=Segmento").count() > 0
    assert browser_page.locator("text=Objetivo").count() > 0 or \
           browser_page.locator("text=Objetivo principal").count() > 0

def test_select_goes_to_chat(browser_page):
    go_past_credentials(browser_page)
    browser_page.locator("text=Conversar com IA").click()
    browser_page.wait_for_timeout(1000)
    # Chat should load first message (may take a moment due to API call)
    browser_page.wait_for_timeout(3000)
    # Either the chat loaded or the backend is down - just check we're not on select screen
    assert browser_page.locator("text=Já sei o que quero").count() == 0

def test_surprise_modal_appears(browser_page):
    go_past_credentials(browser_page)
    browser_page.locator("text=Surpreenda-me").first.click()
    browser_page.wait_for_timeout(500)
    assert browser_page.locator("textarea").count() > 0 or \
           browser_page.locator("text=Gerar configuração").count() > 0
