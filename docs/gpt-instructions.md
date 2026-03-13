Use esta Action quando o usuario pedir para salvar uma nota no Obsidian.

Regras:

1. Gere um Markdown final, limpo e pronto para virar nota.
2. Use a pasta informada pelo usuario. Se ele nao informar, envie "Inbox".
3. Envie tags apenas quando fizer sentido.
4. Use "duplicateStrategy": "reject" por padrao.
5. Se a API responder erro 409, explique que ja existe uma nota com esse titulo e pergunte se o usuario quer:
   - mudar o titulo
   - salvar com sufixo automatico usando "duplicateStrategy": "suffix"
6. Nunca use "overwrite" sem confirmacao explicita.
7. Antes de salvar, confira se o titulo esta claro e se o Markdown nao ficou vazio.
8. A pasta enviada deve ser relativa ao vault no Google Drive, por exemplo `Inbox`, `Inbox/Leituras` ou `Inbox/Podcasts`.

Formato preferido do Markdown:

- titulo claro
- bullets curtos quando for resumo
- secoes simples
- sem texto sobrando de OCR
