import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function CredentialsGate({ onConnect, sharedConfigBanner, onDismissBanner }) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('talk_api_key') || '')
  const [orgId, setOrgId] = useState(() => sessionStorage.getItem('talk_organization_id') || '')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState(null)
  const [showDemoBadge, setShowDemoBadge] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setApiKey('demo-mode-active')
        setOrgId('DEMO-ORG-123')
        setShowDemoBadge(true)
        setTimeout(() => onConnect('demo-mode-active', 'DEMO-ORG-123'), 500)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onConnect])

  const canConnect = apiKey.trim() !== '' && orgId.trim() !== '' && !validating

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canConnect) return
    setError(null)
    setValidating(true)
    try {
      const res = await fetch(`${API_URL}/onboarding/validate-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talk_api_key: apiKey.trim(), organization_id: orgId.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        onConnect(apiKey.trim(), orgId.trim(), data.organization_name)
      } else {
        setError(data.error || 'Credenciais inválidas.')
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#141619',
      display: 'flex',
      justifyContent: 'center',
      padding: '0 24px',
      overflow: 'hidden',
    }}>
      {sharedConfigBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: '#4C70DA15', borderBottom: '1px solid #4C70DA33',
          padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#4C70DA' }}>
            📋 Configuração compartilhada detectada — conecte sua conta para aplicá-la
          </span>
          <button onClick={onDismissBanner} style={{ background: 'none', border: 'none', color: '#4C70DA', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}
      {showDemoBadge && (
        <div style={{
          position: 'fixed', top: 12, right: 12, zIndex: 9999,
          background: '#4C70DA22', border: '1px solid #4C70DA44',
          borderRadius: 20, fontSize: 11, color: '#4C70DA',
          padding: '4px 12px',
        }}>
          🎬 Modo Demo
        </div>
      )}
      <style>{`
        @keyframes cgFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cgSpin { to { transform: rotate(360deg) } }
        .cg-card { animation: cgFadeIn 0.4s ease both; }
        .cg-input {
          width: 100%;
          box-sizing: border-box;
          background: var(--talk-bg-primary);
          border: 1px solid var(--talk-border);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--talk-text-primary);
          font-size: 16px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .cg-input:focus { border-color: #4C70DA; }
        .cg-input.cg-error { border-color: #ef444488; }
        .cg-input::placeholder { color: #555a65; }
        .cg-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .cg-btn-connect {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 16px;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
          background: var(--talk-accent);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .cg-btn-connect:disabled {
          background: var(--talk-bg-hover);
          color: var(--talk-text-muted);
          cursor: not-allowed;
          opacity: 0.8;
        }
        .cg-btn-connect:not(:disabled):hover { background: var(--talk-accent-hover); }
        .cg-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FFFFFF;
          animation: cgSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .cg-eye-btn {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #6b7280; padding: 4px; line-height: 1; font-size: 16px;
          transition: color 0.15s;
        }
        .cg-eye-btn:hover { color: #ACADBD; }
        .cg-link { font-size: 12px; color: #7b93e8; text-decoration: none; }
        .cg-link:hover { text-decoration: underline; }
      `}</style>

      <div className="cg-card" style={{
        width: '100%',
        maxWidth: 540,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 80,
        paddingBottom: 24,
        boxSizing: 'border-box',
      }}>
        {/* Scrollable Form Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Logo / title */}
          <div>
            <h1 style={{
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: '#FFFFFF',
              marginBottom: 8,
              marginTop: 16
            }}>
              BootTalk
            </h1>
            <p style={{ color: '#8E92A4', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
              Conecte sua conta Talk para configurar sua empresa.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 20px', background: '#1A1C20', border: '1px solid #2A2D32', borderRadius: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Credenciais de Acesso</p>
            {/* API Key */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#ACADBD' }}>API Key</label>
                <a href="https://rc-app-talk.umbler.com/profile" target="_blank" rel="noreferrer" className="cg-link">
                  Perfil → Tokens de Acesso ↗
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className={`cg-input${error ? ' cg-error' : ''}`}
                  type={showKey ? 'text' : 'password'}
                  placeholder="Cole sua chave de API aqui"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setError(null) }}
                  autoComplete="off"
                  disabled={validating}
                  style={{ paddingRight: 38 }}
                />
                <button type="button" className="cg-eye-btn" onClick={() => setShowKey(v => !v)} tabIndex={-1}>
                  {showKey ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Organization ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#ACADBD' }}>Organization ID</label>
                <a href="https://rc-app-talk.umbler.com/preferences/organization" target="_blank" rel="noreferrer" className="cg-link">
                  Configurações ↗
                </a>
              </div>
              <input
                className={`cg-input${error ? ' cg-error' : ''}`}
                type="text"
                placeholder="Ex: acgO02Im8Z46U3YA"
                value={orgId}
                onChange={e => { setOrgId(e.target.value); setError(null) }}
                autoComplete="off"
                disabled={validating}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{flexShrink: 0}}>✕</span>
                {error}
              </div>
            )}
            
            <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', margin: 0 }}>
              🔒 Suas credenciais não são armazenadas após a sessão.
            </p>
          </form>
        </div>

        {/* Bottom Navbar */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            className="cg-btn-connect"
            disabled={!canConnect}
            style={{ width: '100%', padding: '14px', borderRadius: 8, fontWeight: 600, fontSize: 15 }}
          >
            {validating ? (
              <>
                <div className="cg-spinner" />
                Verificando credenciais...
              </>
            ) : 'Conectar API →'}
          </button>
        </div>
      </div>
    </div>
  )
}
