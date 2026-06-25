# BIMWeb — Model Routing Guide

## RouteFusion Offload Scoring

```
offload_score = (blast_radius × 3 + ambiguity × 2 + quality_sensitivity × 2) / verification_strength
```

| Axis | 1 | 2 | 3 |
|------|---|---|---|
| blast_radius | local | module | system |
| ambiguity | low | medium | high |
| quality_sensitivity | low | medium | high |
| verification_strength | weak | moderate | strong |

| Score | Tier | Pattern |
|-------|------|---------|
| < 3 | free | Free model |
| 3–5 | flash | DeepSeek V4 Flash alone |
| 5–7 | flash→pro | Flash writes, Pro verifies |
| > 7 | pro | DeepSeek V4 Pro from scratch |

## Provider Setup

| Provider | Access | Models |
|----------|--------|--------|
| **OpenCode Zen** | Built-in (free) | `opencode/deepseek-v4-flash-free` |
| **OpenRouter** | Connected via opencode | `openrouter/...` |
| **Local Ollama** | `ollama pull` | `nanbeige4.1-3b` |

> OpenRouter key is configured in opencode. If API calls fail, run `/connect` → OpenRouter.

## Available Models (Use These Exact Model IDs)

| Model | Model ID | Cost/M | Ctx | License | Best at |
|-------|----------|--------|-----|---------|---------|
| DeepSeek V4 Flash *(free)* | `opencode/deepseek-v4-flash-free` | $0 | 1M | MIT | Free tier: trivial/docs |
| DeepSeek V4 Flash *(paid)* | `openrouter/deepseek/deepseek-v4-flash` | $0.09 | 1M | MIT | Bounded implementation |
| DeepSeek V4 Pro | `openrouter/deepseek/deepseek-v4-pro` | $0.435 | 1M | MIT | Planning, debugging, security review |
| Qwen3 Coder Plus | `openrouter/qwen/qwen3-coder-plus` | $0.65 | 1M | Apache 2.0 | Complex coding (I.90), three.js |
| Qwen3.7 Plus | `openrouter/qwen/qwen3.7-plus` | $0.32 | 1M | Apache 2.0 | All-rounder, Pro alt |
| GLM-5.2 | `openrouter/z-ai/glm-5.2` | $0.15 | 1M | MIT | Cross-repo, 1M context |
| MiMo V2.5 Pro | `openrouter/xiaomi/mimo-v2.5-pro` | $0.435 | 1M | Proprietary | Terminal/build loops |
| Phi-4 | `openrouter/microsoft/phi-4` | $0.07 | 16K | MIT | Small tasks, test gen |
| Gemini 3.5 Flash | `openrouter/google/gemini-3.5-flash` | $0.0375 | 1M | Proprietary | Cheap trivial tasks |
| Nanbeige 4.1 3B | *(local Ollama)* | $0 | — | Apache 2.0 | Private, sensitive material |

## Provider Selection Rules

| Scenario | Use |
|----------|-----|
| Trivial task, no sensitivity | `opencode/deepseek-v4-flash-free` (Zen free) |
| Next.js page, component, SDK wiring | `openrouter/deepseek/deepseek-v4-flash` (OpenRouter) |
| three.js, complex JS/TS features | `openrouter/qwen/qwen3-coder-plus` (OpenRouter) |
| Architecture, security review | `openrouter/deepseek/deepseek-v4-pro` (OpenRouter) |
| Cross-repo integration | `openrouter/z-ai/glm-5.2` or `openrouter/deepseek/deepseek-v4-pro` |
| Exposed credentials / secrets | `nanbeige4.1-3b` (local — never to API) |

## Scaffolding

### Confirm Model Access
```bash
opencode run -m openrouter/deepseek/deepseek-v4-flash "test"
opencode run -m openrouter/deepseek/deepseek-v4-pro "test"
opencode run -m openrouter/qwen/qwen3-coder-plus "test"
```

### Run Checks
```bash
pnpm dev           # Dev server
pnpm build          # Production build — must pass
pnpm lint           # ESLint — must pass
```

## Task-to-Model Routing

| Task | Offload | Tier | Model | Notes |
|------|---------|------|-------|-------|
| Automated tests (vitest/playwright) | 7.0 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | Test scaffolding + coverage check |
| Error boundaries | 4.5 | flash | DeepSeek V4 Flash | Standard Next.js patterns |
| Cloud file storage | 7.0 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | Data integrity — Pro verify |
| Email notifications | 7.0 | flash | DeepSeek V4 Flash | SendGrid/Resend SDK. Override: Flash only. |
| Audit logging | 6.0 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | Schema + middleware — Pro verify |
| Team invites + RBAC | 5.3 | flash→pro | DeepSeek V4 Flash write, **V4 Pro verify** | Security-critical — Pro verify mandatory |
| Shared projects + activity feed | 7.0 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | Real-time collaboration |
| IFC parsing (web-ifc) | 8.0 | pro | DeepSeek V4 Pro | Complex 3D format — debug heavy |
| Measurement + sections + tree | 8.0 | pro | **Qwen3 Coder Plus** | Complex three.js, top coding score I.90 |
| CI/CD pipeline | 7.0 | flash | DeepSeek V4 Flash | GitHub Actions YAML |
| Analytics | 6.0 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | PostHog/custom tracking |
| Multi-tenant workspaces | 10.0 | flash→pro | DeepSeek V4 Pro | Schema isolation — architecture needed |
| Public REST API | 6.3 | flash→pro | DeepSeek V4 Flash write, V4 Pro verify | Security — Pro verify |
| Ecosystem integration (×3 repos) | 10.5 | pro | DeepSeek V4 Pro | Cross-repo. GLM-5.2 alt for 1M ctx. |
| Update AGENTS.md | 7.0 | flash | DeepSeek V4 Flash | Docs update |

## Decision Matrix

| If you need to... | Use this model | Why |
|-------------------|----------------|-----|
| Build a Next.js page/component | DeepSeek V4 Flash | I.88, standard patterns |
| Design component architecture | DeepSeek V4 Pro | P.95 for multi-component features |
| Add three.js 3D features | Qwen3 Coder Plus | I.90 best for complex JS/TS |
| Security/auth code | Flash write + Pro verify | Pro verify mandatory for authZ |
| Write tests | DeepSeek V4 Flash | Standard patterns, low risk |
| Set up CI/CD | DeepSeek V4 Flash | Standard YAML |
| Schema/DB changes | DeepSeek V4 Pro | Data integrity — Pro |
| Cross-repo integration | DeepSeek V4 Pro or GLM-5.2 | GLM for 1M context reading |
| Debug a rendering issue | DeepSeek V4 Pro | D.92 for debugging |
| Handle exposed credentials | Nanbeige-3B (local) | Never send to any API |
| Update documentation | DeepSeek V4 Flash | Cheap, good enough |
