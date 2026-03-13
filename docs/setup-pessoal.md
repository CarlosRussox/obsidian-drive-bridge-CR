# Setup pessoal com Vercel

Este projeto cria a ponte:

GPT -> Action -> Vercel -> Google Drive API -> vault do Obsidian

Esse desenho e o melhor para o seu caso quando voce quer:

- dominio proprio
- endpoint publico estavel
- nao depender do seu PC ligado
- gravar direto no Google Drive onde o vault vive

## 1. O que voce precisa antes

- Node.js 20 ou superior
- um projeto na Vercel
- um dominio proprio
- um vault do Obsidian armazenado no Google Drive
- acesso ao construtor do seu GPT no ChatGPT
- uma conta Google com permissao para a pasta do vault

## 2. Estrategia recomendada de dominio

Use um subdominio dedicado, por exemplo:

`notes.seudominio.com`

Isso evita misturar a API do GPT com o seu site principal.

## 3. Crie o projeto no Google Cloud

1. Crie um projeto no Google Cloud
2. Ative a Google Drive API nesse projeto
3. Configure a OAuth consent screen como `External` se for conta pessoal
4. Crie um OAuth Client ID do tipo `Web application`
5. Adicione este redirect URI:

`http://127.0.0.1:53682/oauth2callback`

Guarde:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 4. Descubra o folder ID da pasta raiz do vault

Abra no navegador a pasta do vault no Google Drive.

A URL fica parecida com:

`https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp`

O trecho final e o valor de:

`GOOGLE_VAULT_ROOT_FOLDER_ID`

Recomendacao pratica:

- use a pasta raiz do vault
- deixe o GPT gravar primeiro em `Inbox`

## 5. Configure o projeto localmente

1. Copie `.env.example` para `.env`
2. Preencha:

`DEFAULT_FOLDER=Inbox`

`API_TOKEN=um-token-bem-grande`

`GOOGLE_CLIENT_ID=...`

`GOOGLE_CLIENT_SECRET=...`

`GOOGLE_VAULT_ROOT_FOLDER_ID=...`

3. Ainda deixe `GOOGLE_REFRESH_TOKEN` em branco por enquanto

## 6. Gere o refresh token do Google

Com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`, rode:

```powershell
npm run google:auth
```

O script vai:

- abrir um mini callback local em `127.0.0.1:53682`
- imprimir a URL de autorizacao
- esperar o retorno do Google
- mostrar o `refresh token` no terminal

Cole esse valor em:

`GOOGLE_REFRESH_TOKEN`

Se o Google nao devolver refresh token, revogue o app nas permissoes da sua conta Google e rode de novo.

## 7. Teste localmente antes do deploy

Com `.env` completo, rode:

```powershell
npm start
```

Depois teste:

```powershell
powershell -ExecutionPolicy Bypass -File .\examples\test-create-note.ps1
```

Se estiver certo:

- a API responde com `ok: true`
- um arquivo `.md` aparece dentro da pasta `Inbox` no Google Drive
- o Google Drive sincroniza esse arquivo para o seu vault local
- o Obsidian passa a enxergar a nota

## 8. Suba para a Vercel

Voce pode usar dashboard ou CLI. Pela CLI o fluxo fica simples:

```powershell
npx vercel
```

Depois adicione as env vars no projeto da Vercel:

- `API_TOKEN`
- `DEFAULT_FOLDER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_VAULT_ROOT_FOLDER_ID`

Se quiser fazer pela CLI:

```powershell
vercel env add API_TOKEN production
vercel env add DEFAULT_FOLDER production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REFRESH_TOKEN production
vercel env add GOOGLE_VAULT_ROOT_FOLDER_ID production
```

## 9. Aponte o dominio proprio para a Vercel

Recomendacao:

- use `notes.seudominio.com`

No geral, para subdominio, a Vercel pede um `CNAME`. Para dominio raiz, normalmente usa `A record`.

Quando terminar, teste:

`https://notes.seudominio.com/api/health`

## 10. Publique a privacy policy

Este projeto ja inclui:

- [public/privacy-gpt-notes.html](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/public/privacy-gpt-notes.html)

Depois do deploy, a URL fica assim:

`https://notes.seudominio.com/privacy-gpt-notes.html`

## 11. Configure o GPT no ChatGPT

No editor do GPT:

1. Va em `Configure`
2. Abra `Actions`
3. Crie uma nova Action
4. Cole [obsidian-gpt-bridge.openapi.yaml](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/openapi/obsidian-gpt-bridge.openapi.yaml)
5. Troque o `servers.url` para `https://notes.seudominio.com`
6. Configure autenticacao como `API Key`
7. Use o header `X-API-Key`
8. Cole o mesmo valor de `API_TOKEN`

Instrucoes sugeridas para o GPT:

- [docs/gpt-instructions.md](/I:/Meu%20Drive/Obs%20CR/3.%20RECURSOS%20CR/Assets/Notas%20Automation/docs/gpt-instructions.md)

## 12. Builder Profile e dominio verificado

No Builder Profile da OpenAI:

- verifique o dominio que vai hospedar a Action
- informe a URL publica da privacy policy

Exemplo:

- dominio: `seudominio.com`
- privacy policy: `https://notes.seudominio.com/privacy-gpt-notes.html`

## 13. Teste ponta a ponta

No chat com o seu GPT, mande:

`Organize esta anotacao e salve no Obsidian na pasta Inbox`

Verifique:

- se a Action foi chamada
- se a resposta voltou com `ok: true`
- se o arquivo apareceu na pasta do Google Drive
- se o Google Drive sincronizou
- se o Obsidian exibiu a nota

## 14. Como lidar com duplicatas

Padrao recomendado:

- `reject`

Quando voce quiser permitir variacoes automaticas:

- `suffix`

So use:

- `overwrite`

## 15. Se algo falhar

Cheque nesta ordem:

1. `https://notes.seudominio.com/api/health` responde
2. as env vars da Vercel estao corretas
3. `API_TOKEN` da Action bate com o `API_TOKEN` da Vercel
4. `GOOGLE_REFRESH_TOKEN` ainda esta valido
5. `GOOGLE_VAULT_ROOT_FOLDER_ID` aponta para a pasta certa
6. sua conta Google tem permissao na pasta do vault
7. o Google Drive Desktop continua sincronizando o vault local

## 16. Limites praticos da Action

Considere estes limites ao escrever o prompt do GPT:

- cada request precisa responder em ate 45 segundos
- request e response devem ficar abaixo de 100.000 caracteres
- a Action trabalha com texto, nao com imagens ou video
