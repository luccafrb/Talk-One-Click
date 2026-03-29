import { useIsDesktop } from '@/hooks/useIsDesktop'

const SEGMENT_LABELS = {
  beleza: 'Beleza & Estética',
  saude: 'Saúde & Bem-estar',
  ecommerce: 'E-commerce',
  educacao: 'Educação',
  imobiliaria: 'Imobiliária',
  juridico: 'Jurídico',
  financeiro: 'Financeiro',
  restaurante: 'Restaurante & Delivery',
  logistica: 'Logística & Transporte',
  tecnologia: 'Tecnologia & SaaS',
  construcao: 'Construção & Reforma',
  automotivo: 'Automotivo',
  eventos: 'Eventos & Festas',
  pet: 'Pet Shop & Veterinário',
  outro: 'Outro',
}

const SECTORS_BY_SEGMENT = {
  beleza:      ['Agendamentos', 'Atendimento', 'Financeiro'],
  saude:       ['Triagem', 'Consultas', 'Administrativo'],
  ecommerce:   ['Vendas', 'Suporte', 'Trocas e Devoluções'],
  educacao:    ['Matrículas', 'Suporte ao Aluno', 'Financeiro'],
  imobiliaria: ['Vendas', 'Locação', 'Avaliação'],
  juridico:    ['Triagem', 'Consultoria', 'Contencioso'],
  financeiro:  ['Atendimento', 'Crédito', 'Cobrança'],
  restaurante: ['Pedidos', 'Reservas', 'Delivery'],
  logistica:   ['Cotação', 'Rastreamento', 'Ocorrências'],
  tecnologia:  ['Suporte N1', 'Suporte N2', 'Comercial'],
  construcao:  ['Comercial', 'Projetos', 'Obras'],
  automotivo:  ['Vendas', 'Serviços', 'Financiamento'],
  eventos:     ['Comercial', 'Planejamento', 'Logística'],
  pet:         ['Agendamentos', 'Veterinário', 'Loja'],
  outro:       ['Atendimento', 'Comercial', 'Suporte'],
}

const LABEL_COLORS = ['#4C70DA', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

const LABELS_BY_SEGMENT = {
  beleza:      ['Agendado', 'Retorno', 'VIP', 'Novo cliente'],
  saude:       ['Consulta', 'Retorno', 'Urgente', 'Particular'],
  ecommerce:   ['Comprador', 'Troca', 'Reclamação', 'VIP'],
  educacao:    ['Prospect', 'Matriculado', 'Inadimplente', 'Formando'],
  imobiliaria: ['Comprador', 'Locatário', 'Proprietário', 'Visita'],
  juridico:    ['Novo caso', 'Urgente', 'Aguardando docs', 'Em andamento'],
  financeiro:  ['Lead', 'Proposta', 'Aprovado', 'Inadimplente'],
  restaurante: ['Delivery', 'Mesa', 'Reclamação', 'Reserva'],
  logistica:   ['Em trânsito', 'Entregue', 'Ocorrência', 'Reentrega'],
  tecnologia:  ['Bug', 'Dúvida', 'Churning', 'Onboarding'],
  construcao:  ['Orçamento', 'Em execução', 'Garantia', 'Vistoria'],
  automotivo:  ['Test drive', 'Revisão', 'Orçamento', 'Pronto'],
  eventos:     ['Orçamento', 'Confirmado', 'Pendência', 'Feedback'],
  pet:         ['Banho e tosa', 'Consulta', 'Vacina', 'Retorno'],
  outro:       ['Novo contato', 'Em andamento', 'Resolvido', 'Aguardando'],
}

const CHATBOT_GREETINGS = {
  consultivo: 'Olá! Como posso te ajudar hoje? Vou entender sua necessidade antes de indicar a melhor solução. 😊',
  direto:     'Oi! Me diga o que precisa. Resolvemos rápido.',
  empatico:   'Olá! Que bom ter você aqui. Como posso ajudar? Estou à disposição. 💙',
  tecnico:    'Olá. Por favor, descreva detalhadamente sua solicitação para que eu possa analisar corretamente.',
  comercial:  'Oi! Temos ótimas opções para você hoje. O que te trouxe até nós? 🚀',
  educativo:  'Olá! Vou te guiar passo a passo. Por onde você prefere começar?',
}

function SectionLabel({ icon, text }) {
  return (
    <p style={{ fontSize: 12, color: '#ACADBD', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{icon}</span> {text}
    </p>
  )
}

export default function ConfigPreview({ businessName, segment, goal, approach, createSectors, createLabels, createChatbot }) {
  const isDesktop = useIsDesktop()
  if (!isDesktop) return null

  const sectors = SECTORS_BY_SEGMENT[segment] ?? []
  const labels = LABELS_BY_SEGMENT[segment] ?? []
  const greeting = CHATBOT_GREETINGS[approach] ?? 'Olá! Como posso te ajudar?'
  const segmentLabel = SEGMENT_LABELS[segment]
  const displayName = businessName?.trim() || null

  const hasSectors = createSectors && sectors.length > 0
  const hasLabels = createLabels && labels.length > 0

  return (
    <div style={{
      background: 'var(--talk-bg-secondary)',
      border: '1px solid var(--talk-border)',
      borderRadius: 16,
      padding: 24,
      minHeight: 200,
    }}>
      <style>{`
        @keyframes previewFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes previewPillIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .preview-section { animation: previewFadeIn 0.25s ease forwards; }
        .preview-pill    { animation: previewPillIn 0.2s ease forwards; opacity: 0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#ACADBD', textTransform: 'uppercase', marginBottom: 8 }}>
          Preview da configuração
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: displayName ? '#FFFFFF' : '#ACADBD' }}>
            {displayName ?? 'Seu negócio'}
          </span>
          {segmentLabel && (
            <span style={{
              background: 'rgba(76,112,218,0.15)', color: '#7b93e8',
              border: '1px solid rgba(76,112,218,0.3)', borderRadius: 999,
              padding: '2px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              {segmentLabel}
            </span>
          )}
        </div>
      </div>

      {/* Setores */}
      {createSectors && (
        <div key={`sectors-${segment}`} className="preview-section" style={{ borderTop: '1px solid var(--talk-border)', paddingTop: 16, marginBottom: 16 }}>
          <SectionLabel icon="📂" text="Setores" />
          {hasSectors ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sectors.map((s, i) => (
                <span
                  key={s}
                  className="preview-pill"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    background: 'var(--talk-bg-hover)',
                    border: '1px solid var(--talk-border-light)',
                    borderRadius: 999, padding: '4px 12px',
                    fontSize: 12, fontWeight: 500, color: '#FFFFFF',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ background: 'var(--talk-bg-hover)', border: '1px solid var(--talk-border)', borderRadius: 999, padding: '4px 16px', fontSize: 12, color: '#ACADBD' }}>···</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Etiquetas */}
      {createLabels && (
        <div key={`labels-${segment}`} className="preview-section" style={{ borderTop: '1px solid var(--talk-border)', paddingTop: 16, marginBottom: 16 }}>
          <SectionLabel icon="🏷️" text="Etiquetas" />
          {hasLabels ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {labels.map((label, i) => {
                const color = LABEL_COLORS[i % LABEL_COLORS.length]
                return (
                  <span
                    key={label}
                    className="preview-pill"
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      color,
                      borderRadius: 999, padding: '4px 12px',
                      fontSize: 12, fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3].map(i => (
                <span key={i} style={{ background: 'var(--talk-bg-hover)', border: '1px solid var(--talk-border)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#ACADBD' }}>···</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chatbot */}
      {createChatbot && (
        <div key={`chatbot-${createChatbot}`} className="preview-section" style={{ borderTop: '1px solid var(--talk-border)', paddingTop: 16, marginBottom: 16 }}>
          <SectionLabel icon="🤖" text="Chatbot" />
          <div style={{ background: 'var(--talk-bg-primary)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              alignSelf: 'flex-start', background: 'var(--talk-bg-hover)',
              borderRadius: '16px 16px 16px 4px', padding: '8px 12px',
              fontSize: 13, color: '#FFFFFF', maxWidth: '85%', lineHeight: 1.45,
            }}>
              {greeting}
            </div>
            <div style={{
              alignSelf: 'flex-end', background: '#4C70DA',
              borderRadius: '16px 16px 4px 16px', padding: '8px 12px',
              fontSize: 13, color: '#FFFFFF', maxWidth: '70%',
            }}>
              Quero saber mais informações
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#ACADBD', marginTop: 8 }}>
            Bot — {displayName ?? 'Seu negócio'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--talk-border)', paddingTop: 12, marginTop: 4 }}>
        <p style={{ fontSize: 11, color: '#ACADBD', textAlign: 'center' }}>
          ✦ A IA vai personalizar com base nas suas respostas
        </p>
      </div>
    </div>
  )
}
