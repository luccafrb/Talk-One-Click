# Deploy — Talk One-Click

## Backend (Railway)

1. Acesse https://railway.app e faça login com GitHub
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Selecione o repositório luccafrb/Talk-One-Click
4. Railway detecta o Dockerfile automaticamente
5. Vá em "Variables" e adicione:
   - `OPENAI_API_KEY` = sua chave OpenAI
   - `TALK_API_BASE_URL` = https://app-utalk.umbler.com/api
   - `ALLOWED_ORIGINS` = (preencher após deploy do Vercel)
6. Clique em "Deploy"
7. Após o deploy, copie a URL gerada (ex: `https://talk-one-click.railway.app`)

## Frontend (Vercel)

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em "Add New Project"
3. Selecione o repositório luccafrb/Talk-One-Click
4. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
5. Em "Environment Variables" adicione:
   - `VITE_API_URL` = URL do Railway copiada acima
6. Clique em "Deploy"
7. Copie a URL do Vercel gerada (ex: `https://talk-one-click.vercel.app`)

## Pós-deploy

1. Volte no Railway → Variables
2. Atualize `ALLOWED_ORIGINS` com a URL do Vercel:
   ```
   ALLOWED_ORIGINS=https://talk-one-click.vercel.app
   ```
3. Railway faz redeploy automático

## Verificação

- Acesse a URL do Vercel e teste o fluxo completo
- Verifique o health check: `https://sua-api.railway.app/health`
