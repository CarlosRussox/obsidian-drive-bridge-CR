$headers = @{ "X-API-Key" = "troque-por-um-token-longo-e-dificil" }
$body = @{
  title = "Teste local"
  folder = "Inbox"
  source = "Teste manual"
  tags = @("teste", "obsidian")
  markdown = "# Teste`n`nIsso veio do script PowerShell."
  duplicateStrategy = "reject"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/api/notes" -Headers $headers -Body $body -ContentType "application/json"
