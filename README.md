# Obsidian GPT Bridge

Starter kit para salvar notas de um GPT no seu vault do Obsidian com `Vercel + dominio proprio + Google Drive API`.

## O que tem aqui

- API pronta para deploy na Vercel em [api/notes.mjs](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/api/notes.mjs)
- rota de health em [api/health.mjs](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/api/health.mjs)
- integracao com Google Drive API em [src/google-drive.js](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/src/google-drive.js)
- helper para gerar refresh token em [scripts/get-google-refresh-token.js](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/scripts/get-google-refresh-token.js)
- schema OpenAPI pronto para a Action do GPT em [openapi/obsidian-gpt-bridge.openapi.yaml](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/openapi/obsidian-gpt-bridge.openapi.yaml)
- privacy policy pronta para deploy em [public/privacy-gpt-notes.html](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/public/privacy-gpt-notes.html)
- passo a passo em portugues em [docs/setup-pessoal.md](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/docs/setup-pessoal.md)

## Como rodar localmente

1. Copie `.env.example` para `.env`
2. Preencha as credenciais do Google e o `API_TOKEN`
3. Gere o refresh token:

```powershell
npm run google:auth
```

4. Rode a API local:

```powershell
npm start
```

5. Teste a criacao de nota:

```powershell
powershell -ExecutionPolicy Bypass -File .\examples\test-create-note.ps1
```

## Verificacao

```powershell
npm run check
npm test
```
