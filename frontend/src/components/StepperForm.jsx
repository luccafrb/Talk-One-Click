import { useState, useEffect, useRef } from 'react'
import { TEMPLATES } from '@/data/templates'

const SEGMENTS = [
  { value: 'beleza',      label: '💄 Beleza (salões, estéticas)' },
  { value: 'saude',       label: '🏥 Saúde (clínicas, consultórios)' },
  { value: 'ecommerce',   label: '🛍️ E-commerce' },
  { value: 'educacao',    label: '📚 Educação' },
  { value: 'imobiliaria', label: '🏠 Imobiliária' },
  { value: 'juridico',    label: '⚖️ Jurídico' },
  { value: 'financeiro',  label: '💰 Financeiro' },
  { value: 'restaurante', label: '🍽️ Restaurante / Alimentação' },
  { value: 'logistica',   label: '🚚 Logística' },
  { value: 'tecnologia',  label: '💻 Tecnologia' },
  { value: 'construcao',  label: '🏗️ Construção' },
  { value: 'automotivo',  label: '🚗 Automotivo' },
  { value: 'eventos',     label: '🎉 Eventos' },
  { value: 'pet',         label: '🐾 Pet' },
  { value: 'outro',       label: '🏢 Outro' },
]

const APPROACHES = [
  { value: 'consultivo', emoji: '🧠', label: 'Consultivo',  desc: 'Guia o cliente com perguntas e diagnóstico' },
  { value: 'direto',     emoji: '⚡', label: 'Direto',      desc: 'Respostas objetivas, sem rodeios' },
  { value: 'empatico',   emoji: '💙', label: 'Empático',    desc: 'Foco no lado humano e emocional' },
  { value: 'tecnico',    emoji: '🔧', label: 'Técnico',     desc: 'Linguagem precisa para especialistas' },
  { value: 'comercial',  emoji: '💰', label: 'Comercial',   desc: 'Foco em conversão e vendas' },
  { value: 'educativo',  emoji: '📚', label: 'Educativo',   desc: 'Explica, orienta e ensina o cliente' },
]

const STEPS = [
  { label: 'Negócio',      title: 'Sobre seu negócio',  subtitle: 'Informações básicas da empresa' },
  { label: 'Atendimento',  title: 'Seu atendimento',    subtitle: 'Como você se comunica com seus clientes' },
  { label: 'Criar',        title: 'O que configurar',   subtitle: 'Escolha o que deseja criar automaticamente' },
  { label: 'Revisão',      title: 'Revisão final',      subtitle: 'Confira tudo antes de configurar' },
]

const LABEL_COLORS = [
  { name: 'Blue',      hex: '#3b82f6' },
  { name: 'Green',     hex: '#22c55e' },
  { name: 'Tomato',    hex: '#ef4444' },
  { name: 'Gold',      hex: '#eab308' },
  { name: 'Tangerine', hex: '#f97316' },
  { name: 'Pink',      hex: '#ec4899' },
  { name: 'Violet',    hex: '#8b5cf6' },
  { name: 'Cyan',      hex: '#06b6d4' },
  { name: 'Umblerito', hex: '#4C70DA' },
  { name: 'Gray',      hex: '#6b7280' },
]

const INITIAL = {
  business_name: '',
  segment: '',
  goal: '',
  approach: '',
  create_sectors: true,
  sectors_description: '',
  create_labels: true,
  label_items: [{ name: '', color: '' }],
  create_chatbot: true,
  chatbot_description: '',
  create_channel: false,
  channel_name: '',
  invite_members: false,
  member_emails_raw: '',
}

function ProgressBar({ step }) {
  return (
    <div style={{ marginBottom: 20, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {STEPS.map((s, i) => {
          const done    = i < step
          const active  = i === step
          const lineColor = done ? '#4C70DA' : '#2A2D32'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 13, fontWeight: 700,
                  background: done ? '#4C70DA' : active ? 'rgba(76,112,218,0.15)' : '#1A1C20',
                  border: active ? '2px solid #4C70DA' : done ? '2px solid #4C70DA' : '2px solid #2A2D32',
                  color: done ? '#fff' : active ? '#4C70DA' : '#555a65',
                  transition: 'all 0.3s ease',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  color: active ? '#FFFFFF' : done ? '#8E92A4' : '#555a65',
                  whiteSpace: 'nowrap', transition: 'color 0.3s',
                }}>
                  {s.label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 48, height: 2, margin: '-16px 4px 0',
                  background: lineColor, transition: 'background 0.3s',
                  flexShrink: 0,
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AiTag() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      background: 'rgba(76,112,218,0.12)', color: '#7b93e8',
      border: '1px solid rgba(76,112,218,0.25)', marginLeft: 6, verticalAlign: 'middle',
      letterSpacing: '0.01em',
    }}>✨ Preenchido por IA</span>
  )
}

function FieldLabel({ children, ai }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: '#ACADBD', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}{ai && <AiTag />}
    </p>
  )
}

function inputStyle(focused) {
  return {
    width: '100%', boxSizing: 'border-box',
    background: '#141619', border: `1px solid ${focused ? '#4C70DA' : '#2A2D32'}`,
    borderRadius: 8, padding: '12px 14px',
    color: '#FFFFFF', fontSize: 14, outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }
}

function SelectField({ value, onChange, options, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused), cursor: 'pointer', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238E92A4' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function TextField({ value, onChange, placeholder, multiline }) {
  const [focused, setFocused] = useState(false)
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Tag
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      rows={multiline ? 3 : undefined}
      style={{ ...inputStyle(focused), resize: multiline ? 'vertical' : undefined, minHeight: multiline ? 80 : undefined }}
    />
  )
}

function ToggleSection({ checked, onChange, icon, title, desc, children, ai }) {
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${checked ? 'rgba(76,112,218,0.4)' : '#2A2D32'}`,
      background: checked ? 'rgba(76,112,218,0.06)' : '#141619',
      transition: 'all 0.15s',
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 2,
          border: `2px solid ${checked ? '#4C70DA' : '#3A3D45'}`,
          background: checked ? '#4C70DA' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', marginBottom: 2 }}>
            {icon} {title}{ai && <AiTag />}
          </div>
          <div style={{ fontSize: 12, color: '#8E92A4', lineHeight: 1.5 }}>{desc}</div>
        </div>
      </label>
      {checked && children && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(76,112,218,0.15)', paddingTop: 12, animation: 'expandIn 0.18s ease' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function LabelItemsEditor({ items, onChange }) {
  function setItem(i, field, val) {
    const next = items.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
    onChange(next)
  }
  function addItem() { onChange([...items, { name: '', color: '' }]) }
  function removeItem(i) { onChange(items.length > 1 ? items.filter((_, idx) => idx !== i) : [{ name: '', color: '' }]) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={item.name}
            onChange={e => setItem(i, 'name', e.target.value)}
            placeholder={`Etiqueta ${i + 1}, ex: Urgente`}
            style={{
              flex: 1, background: '#0f1114', border: '1px solid #2a2d32', borderRadius: 6,
              padding: '8px 10px', color: '#FFFFFF', fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#4C70DA' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2a2d32' }}
          />
          {/* Color dots */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {LABEL_COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => setItem(i, 'color', item.color === c.name ? '' : c.name)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c.hex,
                  border: item.color === c.name ? '2px solid #FFFFFF' : '2px solid transparent',
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                  boxShadow: item.color === c.name ? `0 0 0 1px ${c.hex}` : 'none',
                  transition: 'border-color 0.1s',
                }}
              />
            ))}
          </div>
          {/* Remove */}
          <button
            type="button"
            onClick={() => removeItem(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555a65', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555a65' }}
          >✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        style={{
          background: 'none', border: '1px dashed #2a2d32', borderRadius: 6,
          color: '#8E92A4', fontSize: 12, padding: '7px', cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.color = '#7b93e8' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d32'; e.currentTarget.style.color = '#8E92A4' }}
      >
        + Adicionar etiqueta
      </button>
    </div>
  )
}

function TemplateCard({ tpl, onApply }) {
  const [applied, setApplied] = useState(false)
  function apply() {
    onApply(tpl)
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }
  return (
    <div style={{
      marginTop: 4,
      background: applied ? 'rgba(76,112,218,0.1)' : '#1A1C20',
      border: `1px solid ${applied ? 'rgba(76,112,218,0.4)' : '#2A2D32'}`,
      borderRadius: 8, padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      animation: 'expandIn 0.2s ease both',
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{tpl.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: applied ? '#4C70DA' : '#8E92A4', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {applied ? '✓ Template aplicado' : `Template: ${tpl.label}`}
        </p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
          {tpl.description}
        </p>
      </div>
      {!applied && (
        <button
          type="button"
          onClick={apply}
          style={{
            flexShrink: 0, background: 'transparent', border: '1px solid #4C70DA',
            color: '#4C70DA', borderRadius: 6, fontSize: 12, padding: '5px 12px',
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#4C70DA'; e.currentTarget.style.color = '#FFFFFF' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4C70DA' }}
        >
          Aplicar
        </button>
      )}
    </div>
  )
}

function ReviewRow({ label, value, empty }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #1e2126' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#8E92A4', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 13, color: empty ? '#555a65' : '#FFFFFF', fontStyle: empty ? 'italic' : 'normal', margin: 0, lineHeight: 1.5 }}>
        {value || '—'}
      </p>
    </div>
  )
}

export default function StepperForm({ initialForm, onSubmit, onBack, aiFilledFields }) {
  const ai = aiFilledFields ?? new Set()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ ...INITIAL, ...(initialForm ?? {}) })
  const [dir, setDir] = useState(1)   // 1 = forward, -1 = backward
  const [visible, setVisible] = useState(true)
  const [errors, setErrors] = useState({})

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e = {}
    if (step === 0) {
      if (!form.business_name.trim()) e.business_name = 'Obrigatório'
      if (!form.segment) e.segment = 'Obrigatório'
    }
    if (step === 1) {
      if (!form.goal.trim()) e.goal = 'Obrigatório'
      if (!form.approach) e.approach = 'Obrigatório'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function transition(nextStep, direction) {
    if (!validate()) return
    setDir(direction)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setErrors({})
      setDir(direction)
      setVisible(true)
    }, 180)
  }

  function handleNext() { transition(step + 1, 1) }
  function handleBack() {
    if (step === 0) { onBack(); return }
    transition(step - 1, -1)
  }

  function handleSubmit() {
    const member_emails = form.invite_members
      ? form.member_emails_raw.split(/[\n,]/).map(e => e.trim()).filter(Boolean)
      : []
    onSubmit({
      ...form,
      label_items: form.label_items.filter(l => l.name.trim()),
      member_emails,
    })
  }

  const segLabel = SEGMENTS.find(s => s.value === form.segment)?.label.replace(/^[^\s]+ /, '') ?? '—'
  const approachLabel = APPROACHES.find(a => a.value === form.approach)?.label ?? '—'
  const namedLabels = form.label_items.filter(l => l.name.trim())
  const labelSummary = form.create_labels
    ? namedLabels.length > 0
      ? namedLabels.map(l => l.name.trim()).join(', ')
      : 'Sim (IA decide)'
    : 'Não'
  const sectorSummary = form.create_sectors
    ? form.sectors_description.trim() || 'Sim (IA decide)'
    : 'Não'
  const chatbotSummary = form.create_chatbot
    ? form.chatbot_description.trim() || 'Sim (IA decide)'
    : 'Não'

  const slideStyle = {
    animation: visible
      ? `stepIn${dir > 0 ? 'Right' : 'Left'} 0.22s ease both`
      : `stepOut${dir > 0 ? 'Left' : 'Right'} 0.18s ease both`,
  }

  return (
    <div style={{ height: '100svh', background: '#141619', display: 'flex', justifyContent: 'center', padding: '0 24px', overflow: 'hidden' }}>
      <style>{`
        @keyframes stepInRight  { from { opacity:0; transform:translateX(32px) } to { opacity:1; transform:translateX(0) } }
        @keyframes stepInLeft   { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
        @keyframes stepOutLeft  { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(-24px) } }
        @keyframes stepOutRight { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(24px) } }
        @keyframes expandIn     { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 540, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 80, paddingBottom: 24, boxSizing: 'border-box' }}>

        {/* Top nav */}
        <button
          onClick={handleBack}
          style={{ position: 'fixed', top: 20, left: 24, zIndex: 100, background: 'rgba(26,28,32,0.8)', border: '1px solid #2A2D32', borderRadius: 8, cursor: 'pointer', color: '#8E92A4', fontSize: 13, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.background = '#1A1C20' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8E92A4'; e.currentTarget.style.borderColor = '#2A2D32'; e.currentTarget.style.background = 'rgba(26,28,32,0.8)' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
          {step === 0 ? 'Voltar' : STEPS[step - 1].label}
        </button>

        <ProgressBar step={step} />

        {/* Step header */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {STEPS[step].title}
          </h1>
          <p style={{ fontSize: 13, color: '#8E92A4', margin: 0 }}>{STEPS[step].subtitle}</p>
        </div>

        {/* Step content */}
        <div style={{ ...slideStyle, flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <FieldLabel ai={ai.has('business_name')}>Nome do negócio *</FieldLabel>
                <TextField
                  value={form.business_name}
                  onChange={v => setField('business_name', v)}
                  placeholder="Ex: Studio Bella, Clínica Saúde Total..."
                />
                {errors.business_name && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>Obrigatório</p>}
              </div>
              <div>
                <FieldLabel ai={ai.has('segment')}>Segmento *</FieldLabel>
                <SelectField
                  value={form.segment}
                  onChange={v => setField('segment', v)}
                  options={SEGMENTS}
                  placeholder="Escolha o segmento..."
                />
                {errors.segment && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>Obrigatório</p>}
              </div>

              {/* Template sugerido */}
              {form.segment && TEMPLATES[form.segment] && (
                <TemplateCard
                  tpl={TEMPLATES[form.segment]}
                  onApply={tpl => setForm(f => ({
                    ...f,
                    goal: tpl.goal,
                    approach: tpl.approach,
                    create_sectors: tpl.create_sectors,
                    create_labels: tpl.create_labels,
                    create_chatbot: tpl.create_chatbot,
                  }))}
                />
              )}
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <FieldLabel ai={ai.has('goal')}>Objetivo principal *</FieldLabel>
                <TextField
                  value={form.goal}
                  onChange={v => setField('goal', v)}
                  placeholder="Ex: Organizar suporte, agendar consultas, qualificar leads..."
                  multiline
                />
                {errors.goal && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>Obrigatório</p>}
              </div>
              <div>
                <FieldLabel ai={ai.has('approach')}>Abordagem do atendimento *</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {APPROACHES.map(a => (
                    <label key={a.value} style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      background: form.approach === a.value ? 'rgba(76,112,218,0.1)' : '#1A1C20',
                      border: `1px solid ${form.approach === a.value ? '#4C70DA' : '#2A2D32'}`,
                      transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="approach" value={a.value} checked={form.approach === a.value} onChange={() => setField('approach', a.value)} style={{ display: 'none' }} />
                      <span style={{ fontSize: 16 }}>{a.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{a.label}</span>
                      <span style={{ fontSize: 11, color: '#8E92A4', lineHeight: 1.4 }}>{a.desc}</span>
                    </label>
                  ))}
                </div>
                {errors.approach && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>Escolha uma abordagem</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ToggleSection
                checked={form.create_sectors}
                onChange={e => setField('create_sectors', e.target.checked)}
                icon="🏢"
                title="Setores de atendimento"
                desc="Cria setores personalizados para organizar seu time"
                ai={ai.has('create_sectors') || ai.has('sectors_description')}
              >
                <textarea
                  value={form.sectors_description}
                  onChange={e => setField('sectors_description', e.target.value)}
                  placeholder="Ex: Suporte N1, Suporte N2, Comercial, Financeiro... (opcional — a IA sugere se vazio)"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: '#0f1114', border: '1px solid #2a2d32', borderRadius: 6,
                    padding: '8px 10px', color: '#FFFFFF', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4C70DA' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2a2d32' }}
                />
              </ToggleSection>

              <ToggleSection
                checked={form.create_labels}
                onChange={e => setField('create_labels', e.target.checked)}
                icon="🏷️"
                title="Etiquetas de classificação"
                desc="Etiquetas coloridas para categorizar atendimentos"
                ai={ai.has('create_labels') || ai.has('label_items')}
              >
                <LabelItemsEditor
                  items={form.label_items}
                  onChange={v => setField('label_items', v)}
                />
              </ToggleSection>

              <ToggleSection
                checked={form.create_chatbot}
                onChange={e => setField('create_chatbot', e.target.checked)}
                icon="🤖"
                title="Chatbot de recepção"
                desc="Fluxo para recepcionar e direcionar clientes automaticamente"
                ai={ai.has('create_chatbot') || ai.has('chatbot_description')}
              >
                <textarea
                  value={form.chatbot_description}
                  onChange={e => setField('chatbot_description', e.target.value)}
                  placeholder="Ex: Recebe o cliente, pergunta o motivo do contato e direciona para o setor correto (opcional)"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: '#0f1114', border: '1px solid #2a2d32', borderRadius: 6,
                    padding: '8px 10px', color: '#FFFFFF', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4C70DA' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2a2d32' }}
                />
              </ToggleSection>

              <ToggleSection
                checked={form.create_channel}
                onChange={e => setField('create_channel', e.target.checked)}
                icon="📡"
                title="Canal de atendimento"
                desc="Canal de WhatsApp para receber mensagens dos clientes"
                ai={ai.has('create_channel') || ai.has('channel_name')}
              >
                <input
                  value={form.channel_name}
                  onChange={e => setField('channel_name', e.target.value)}
                  placeholder="Nome do canal, ex: WhatsApp Comercial (opcional)"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0f1114', border: '1px solid #2a2d32', borderRadius: 6,
                    padding: '8px 10px', color: '#FFFFFF', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4C70DA' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2a2d32' }}
                />
              </ToggleSection>

              <ToggleSection
                checked={form.invite_members}
                onChange={e => setField('invite_members', e.target.checked)}
                icon="👥"
                title="Convidar atendentes"
                desc="Convida membros da equipe por e-mail para acessar a plataforma"
                ai={ai.has('member_emails')}
              >
                <textarea
                  value={form.member_emails_raw}
                  onChange={e => setField('member_emails_raw', e.target.value)}
                  placeholder={'Um e-mail por linha ou separados por vírgula\nEx: joao@empresa.com, maria@empresa.com'}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: '#0f1114', border: '1px solid #2a2d32', borderRadius: 6,
                    padding: '8px 10px', color: '#FFFFFF', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4C70DA' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2a2d32' }}
                />
              </ToggleSection>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ background: '#1A1C20', border: '1px solid #2A2D32', borderRadius: 10, padding: '4px 20px 8px', marginBottom: 20 }}>
                <ReviewRow label="Empresa"    value={form.business_name} />
                <ReviewRow label="Segmento"   value={segLabel} />
                <ReviewRow label="Objetivo"   value={form.goal} />
                <ReviewRow label="Abordagem"  value={approachLabel} />
                <ReviewRow label="Setores"    value={sectorSummary} />
                <ReviewRow label="Etiquetas"  value={labelSummary} />
                <ReviewRow label="Chatbot"    value={chatbotSummary} />
                <ReviewRow label="Canal"      value={form.create_channel ? (form.channel_name || 'Sim') : 'Não'} />
                <ReviewRow label="Atendentes" value={form.invite_members ? (form.member_emails_raw.trim() || 'Sim') : 'Não'} />
              </div>
              <div style={{ background: 'rgba(76,112,218,0.07)', border: '1px solid rgba(76,112,218,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
                <p style={{ fontSize: 13, color: '#ACADBD', margin: 0, lineHeight: 1.6 }}>
                  A IA vai personalizar a configuração com base no segmento e objetivo da sua empresa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexShrink: 0 }}>
          {step > 0 && (
            <button
              onClick={handleBack}
              style={{
                flex: 1, padding: '13px', borderRadius: 8, fontWeight: 500, fontSize: 14,
                background: 'transparent', color: '#E0E2E6', border: '1px solid #2A2D32', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1A1C20' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              ← Voltar
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              style={{
                flex: step === 0 ? 1 : 2, padding: '13px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                background: '#4C70DA', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3d5ec4' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4C70DA' }}
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{
                flex: 2, padding: '13px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                background: '#4C70DA', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3d5ec4' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4C70DA' }}
            >
              🚀 Configurar agora
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
