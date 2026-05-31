# ADR-003: FastAPI (Python) for AI Pipeline

## Status: ACCEPTED

## Context
Talanted needs:
- LLM orchestration with 14 specialized agents
- Multi-provider support (Groq, Gemini, OpenAI, Ollama)
- Real-time streaming of generation progress
- Easy prototyping and iteration
- Integration with ML/data science libraries

Language choice: Python vs Node.js vs Go vs Java?

## Decision
Use **FastAPI (Python)** + Uvicorn as the AI pipeline backend.

## Justification

### Why Python?

#### 1. **LLM Ecosystem** (most mature)
All major LLM providers have official Python SDKs:
```python
from groq import Groq  # Groq SDK
from anthropic import Anthropic  # Claude SDK
from openai import OpenAI  # OpenAI SDK
from google.generativeai import GenerativeModel  # Gemini SDK
```

#### 2. **ML/Data Science Libraries** (native support)
- **NumPy, Pandas**: Data processing (semi-structured UI data)
- **Scikit-learn**: Validation, scoring, quality metrics
- **Pillow**: Image manipulation, resizing
- **pytesseract**: OCR for PDF/image import
- **LangChain**: LLM orchestration framework
- **Vector DBs**: Pinecone, Weaviate, Chroma (all have Python clients)

#### 3. **Speed to Market** (10x faster prototyping)
```python
# Python: 4 lines
@app.post("/generate")
def generate(prompt: str):
    result = llm.generate(prompt)
    return result

# Go: ~30 lines for same functionality
# Java: ~50 lines
```

#### 4. **Large Community**
- 80% of ML engineers know Python
- Stack Overflow: 1000+ questions/day about Python ML
- Easy to find developers

### Why FastAPI (not Flask/Django)?

| Feature | Flask | Django | FastAPI |
|---------|-------|--------|---------|
| **Async** | Limited | No | ✅ Built-in |
| **Auto Docs** | No | No | ✅ OpenAPI/Swagger |
| **Performance** | Slow | Medium | Fast (100+ req/s) |
| **Type hints** | No | Basic | ✅ Full support |
| **Learning curve** | Easy | Hard | Medium |

FastAPI advantages:
- **Async**: Handle multiple concurrent requests
- **Auto docs**: `/docs` endpoint = free Swagger UI
- **Type validation**: Pydantic validates inputs automatically
- **Performance**: 2-3x faster than Flask

### Alternative Languages - Why Rejected?

**Node.js**:
- ✅ Fast, async, good for APIs
- ❌ LLM ecosystem scattered (not unified)
- ❌ ML libraries immature (numpy-js is mediocre)
- ❌ Large ML engineering community is Python-first

**Go**:
- ✅ Extreme performance (10k req/s vs 100 req/s)
- ✅ Simple concurrency model
- ❌ LLM SDKs less mature
- ❌ ML libraries weak
- ❌ Prototyping slow (more boilerplate)

**Java**:
- ✅ Spring ecosystem mature
- ❌ LLM SDKs available but not first-class
- ❌ Verbose (100+ lines for simple task)
- ❌ ML ecosystem less mature than Python
- ❌ Performance overhead (JVM startup)

## Trade-offs

### PROS (Python + FastAPI):
✅ Comprehensive LLM ecosystem
✅ Mature ML/data science libraries
✅ **Fastest time to market** (10x vs Go)
✅ Easy debugging (dynamic typing helps)
✅ Large community + Stack Overflow support
✅ Excellent for AI/ML tasks

### CONS (Python + FastAPI):
❌ Performance: ~100 req/s (vs Go 10k+ req/s)
❌ GIL limits true parallelism (for CPU-bound tasks)
❌ Memory footprint higher than Go
❌ Cold start slower (interpreter overhead)

## Performance Analysis

**Will Python be fast enough?**

Current bottlenecks:
- LLM API call: 3-5 seconds (network, not Python)
- Python execution: < 100ms
- Total per request: ~3-5 seconds

Users NEVER see Python overhead → only AI latency.

If peak load = 100 req/s (realistic for MVP):
- Python can handle this easily
- LLM API cost becomes bottleneck before Python

**Threshold to migrate**: > 10k req/s (not planned for 5 years)

## Future Evolution
- **S12**: Performance baseline established (3-5s per request) ✓
- **S13**: If peak load > 10k req/s → Rewrite hot path in Go
- **S13+**: Keep Python for prototyping, Go for production

## References
- FastAPI docs: https://fastapi.tiangolo.com
- Python vs Go article: https://go.dev/blog/toward-go2
- LLM ecosystem comparison: https://python.langchain.com
