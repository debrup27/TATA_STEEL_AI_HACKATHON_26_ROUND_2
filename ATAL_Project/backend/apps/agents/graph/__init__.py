"""
SANSAD LangGraph agentic orchestration — two-tier supervisor/worker.
- Supervisor: MANAS (qwen3.5:9b) — reasoning, tool dispatch, worker spawning.
- Workers: qwen3.5:0.8b — bounded parallel text sub-tasks.

REQ-LLM-003, REQ-SECURITY-003, REQ-FUNCTIONAL-040/041.
"""
