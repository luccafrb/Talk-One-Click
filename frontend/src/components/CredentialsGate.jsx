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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: '#141619',
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
          background: #141619;
          border: 1px solid #2a2d32;
          border-radius: 8px;
          padding: 10px 14px;
          color: #FFFFFF;
          font-size: 14px;
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
          padding: 12px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 15px;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
          background: #4C70DA;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .cg-btn-connect:disabled {
          background: #2a3a6a;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .cg-btn-connect:not(:disabled):hover { background: #5a7ee0; }
        .cg-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FFFFFF;
          animation: cgSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .cg-eye-btn {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #6b7280; padding: 4px; line-height: 1; font-size: 15px;
          transition: color 0.15s;
        }
        .cg-eye-btn:hover { color: #ACADBD; }
        .cg-link { font-size: 12px; color: #7b93e8; text-decoration: none; }
        .cg-link:hover { text-decoration: underline; }
      `}</style>

      <div className="cg-card" style={{
        background: '#202326',
        border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : '#2a2d32'}`,
        borderRadius: 18,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        transition: 'border-color 0.2s',
      }}>
        {/* Logo / title */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: '#FFFFFF',
            textShadow: '0 2px 16px rgba(76,112,218,0.35)',
            marginBottom: 8,
          }}>
            Talk One-Click
          </h1>
          <p style={{ color: '#ACADBD', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Conecte sua conta Talk para começar a configuração automática
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* API Key */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>API Key</label>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Organization ID</label>
              <a href="https://rc-app-talk.umbler.com/preferences/organization" target="_blank" rel="noreferrer" className="cg-link">
                Configurações da organização ↗
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
              <span style={{ flexShrink: 0 }}>✕</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="cg-btn-connect"
            disabled={!canConnect}
            style={{ marginTop: 4 }}
          >
            {validating ? (
              <>
                <div className="cg-spinner" />
                Verificando credenciais...
              </>
            ) : 'Conectar →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 20, marginBottom: 0 }}>
          🔒 Suas credenciais não são armazenadas.
        </p>
      </div>
    </div>
  )
}
