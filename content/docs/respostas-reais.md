# Respostas reais capturadas

Todos os payloads abaixo foram obtidos com `curl` contra `https://mrcp-engine.vercel.app` durante a escrita desta documentação. Nenhum é inventado, nenhum é "exemplo ilustrativo".

```bash
curl -s "https://mrcp-engine.vercel.app/api/code-health?repo=https://github.com/expressjs/express"
```

## `/api/code-health` — 200, 1,35 s

```json
{
  "status": "success",
  "code_health": {
    "repoUrl": "https://github.com/expressjs/express",
    "maintainabilityIndex": 89,
    "maintainabilityRating": "EXCELLENT",
    "technicalDebtScore": 11,
    "letterGrade": "A",
    "summary": {
      "totalFiles": 32,
      "totalLinesOfCode": 4945,
      "totalFunctions": 0,
      "averageComplexityPerFile": 8,
      "testToCodeRatio": 0,
      "godModulesCount": 0
    },
    "cognitiveLoadDistribution": { "low": 38, "moderate": 63, "high": 0, "extreme": 0 },
    "topRefactoringPriorities": [
      {
        "file": "src/graph/provider.ts",
        "cyclomaticComplexity": 10,
        "linesOfCode": 324,
        "couplingDegree": 1,
        "cognitiveLoad": "MODERATE",
        "estimatedEffortHours": 3.1,
        "primaryIssue": "Alta densidade de complexidade ciclomática",
        "recommendedAction": "Decompor funções longas e extrair módulos auxiliares"
      }
    ]
  }
}
```

Renderizado pelo terminal, o mesmo payload vira:

```
repoUrl: https://github.com/expressjs/express
maintainabilityIndex: 89
maintainabilityRating: EXCELLENT
technicalDebtScore: 11
letterGrade: A

fonte: $.topRefactoringPriorities
┌───────────────────────┬────────────┬──────┬───────────────────────────────┐
│ file                  │ cognitiveLoad │ … │ recommendedAction          │
├───────────────────────┼────────────┼──────┼───────────────────────────────┤
│ src/graph/provider.ts │ MODERATE   │ …    │ Decompor funções longas e… │
│ src/core/index-2.ts   │ MODERATE   │ …    │ Decompor funções longas e… │
└───────────────────────┴────────────┴──────┴───────────────────────────────┘
```

## `/api/security-audit` — 200, 9,4 s

```json
{
  "status": "success",
  "security_audit": {
    "repoUrl": "https://github.com/expressjs/express",
    "auditPassed": true,
    "totalVulnerabilities": 0,
    "vulnerabilities": [],
    "summary": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "isApplicable": true,
    "message": "Auditoria estática de segurança APROVADA. 0 vulnerabilidades críticas ou altas encontradas."
  }
}
```

## `/api/env-validator` — 200, 24 s

```json
{
  "status": "success",
  "env_contract": {
    "repoUrl": "https://github.com/expressjs/express",
    "totalVariablesDetected": 2,
    "undocumentedVariables": ["NODE_ENV", "NO_DEPRECATION"],
    "variables": [
      {
        "name": "NODE_ENV",
        "occurrencesCount": 14,
        "inferredType": "string",
        "isRequired": false,
        "isExposedToClient": false,
        "hasDefaultInCode": true
      }
    ]
  }
}
```

O endpoint também devolve um `generatedDotEnvExample` e um `zodSchemaSnippet` prontos para uso.

## `/api/dead-code-pruner` — 200, 1,29 s

```json
{
  "status": "success",
  "dead_code_analysis": {
    "repoUrl": "https://github.com/expressjs/express",
    "totalDeadSymbolsFound": 0,
    "estimatedBytesRemovable": 0,
    "deadSymbols": [],
    "pruneRecommendationCommand": "npx mrcp-engine prune --auto"
  }
}
```

## `/api/architecture-drift` — 200, 1,13 s

```json
{
  "status": "success",
  "architecture_drift": {
    "repoUrl": "https://github.com/expressjs/express",
    "architectureType": "CLEAN_ARCHITECTURE",
    "complianceScore": 100,
    "cyclicDependenciesFound": 0,
    "violations": []
  }
}
```

## `/api/analyze` — 200, 1,17 s (com ressalva importante)

```json
{
  "analysis": {
    "id": "expressjs-express-main-1789786335805",
    "repoUrl": "https://github.com/expressjs/express",
    "branch": "main",
    "status": "partial",
    "quality": "degraded",
    "sourceUsed": "deterministic",
    "attempted": [
      { "id": "github-api", "ok": false, "reason": "Repository or branch not found." },
      { "id": "local-dir", "ok": false, "reason": "not applicable" },
      { "id": "deterministic", "ok": true }
    ],
    "limitations": [
      "Deterministic fallback: shape is derived from the URL, not the repository contents."
    ]
  }
}
```

**Honestidade acima de tudo:** quando o engine não consegue acessar o repositório (branch inexistente, rate limit, repo privado sem token), ele cai num modo determinístico que infere a forma a partir da URL — e **diz isso explicitamente** nos campos `status`, `quality` e `limitations`.

O terminal não esconde esse fato: os escalares de status aparecem no cabeçalho do bloco. Se você vir `status: partial`, o grafo é uma inferência, não o conteúdo real do repositório.

## `/api/api-contract` — 200, 0,84 s (em `typicode/json-server`)

```json
{
  "status": "success",
  "api_contract": {
    "repoUrl": "https://github.com/typicode/json-server",
    "frameworksDetected": [],
    "totalRoutes": 0,
    "routes": [],
    "isApplicable": false,
    "message": "Nenhuma rota ou framework de API (Next.js, Express, Fastify, Hono, FastAPI, Flask) foi detectada no repositório."
  }
}
```

O campo `isApplicable: false` é o mecanismo do engine para dizer "analisei, e esse relatório não se aplica a este repo". Trate como dado, não como erro.

## `/api/clone` — 200, PageCloner Pro

```bash
curl -s "https://mrcp-engine.vercel.app/api/clone?url=https://example.com"
```

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "lang": "en",
  "tokens": {
    "colors": [
      { "color": "#eee", "count": 2 },
      { "color": "#348", "count": 2 }
    ],
    "fonts": [{ "fontFamily": "system-ui,sans-serif", "count": 1 }],
    "borderRadii": [],
    "shadows": []
  },
  "interactivity": {
    "buttons": [],
    "links": [{ "text": "Learn more", "href": "https://iana.org/domains/example", "isExternal": true }]
  },
  "semantics": { "headingStructure": [{ "level": "H1", "text": "Example Domain" }] }
}
```

Sem `url`, o endpoint responde 400 com `{"error_code":"MISSING_TARGET","message":"Forneça o parâmetro 'url' ou o corpo com 'html'."}`.

## Extensões oficiais (verificadas)

| Asset | URL `raw` | Tamanho |
| :--- | :--- | :--- |
| VS Code (`.vsix`) | `github.com/faelscarpato/mrcp-engine/raw/main/apps/vscode/mrcp-vscode-2.6.1.vsix` | 210.805 bytes |
| Chrome (`.zip`) | `github.com/faelscarpato/mrcp-engine/raw/main/mrcp-chrome-extension/mrcp-chrome-extension-v2.6.1.zip` | 396.721 bytes |

Ambos retornaram HTTP 200 (o `.zip` com cabeçalho `PK`, o `.vsix` como `application/octet-stream`). Usamos URL `raw`, não `blob`: `blob` entrega uma página HTML, `raw` entrega o binário.

## Latências observadas

| Rota | Tempo |
| :--- | :--- |
| `code-health` | 1,35 s |
| `security-audit` | 9,44 s |
| `env-validator` | 23,98 s |
| `dead-code-pruner` | 1,29 s |
| `api-contract` | 1,38 s |
| `architecture-drift` | 1,13 s |
| `analyze` | 1,17 s |

`env-validator` passou de 23 segundos — é exatamente por isso que o transporte padrão é **direto** do navegador: em uma função serverless com teto de 60 s (ou 10 s no plano Hobby), uma análise longa viraria 504.
