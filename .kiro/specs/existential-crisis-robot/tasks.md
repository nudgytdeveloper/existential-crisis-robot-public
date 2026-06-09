# Implementation Plan: Existential Crisis Robot

## Overview

This plan implements a Python web application deployed on Vercel that orchestrates three AI agents (Question, Emotion, Tools) in a comedic pipeline. The implementation follows a bottom-up approach: data models and constants first, then the state store, clients, agents, API layer, dashboard, and finally integration wiring. Property-based tests using `hypothesis` validate correctness properties from the design.

## Tasks

- [ ] 1. Set up project structure, dependencies, and core data models
  - [ ] 1.1 Create project configuration files
    - Create `vercel.json` with Python 3.12 runtime config and routing rules
    - Create `requirements.txt` with all dependencies (openai/anthropic, exa-py, upstash-redis, pydantic, httpx, hypothesis, pytest, fakeredis)
    - Create `.env.example` with placeholder environment variables (LLM_API_KEY, EXA_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN)
    - Create directory structure: `api/`, `agents/`, `models/`, `store/`, `constants/`, `clients/`, `public/`, `tests/unit/`, `tests/property/`, `tests/integration/`
    - _Requirements: 12.3_

  - [ ] 1.2 Implement core data models
    - Create `models/questions.py` with `Question` and `QuestionSet` dataclasses using Pydantic for validation
    - Create `models/results.py` with `AnsweredQuestion`, `QuestionResult`, `EmotionReaction`, `EmotionResult`, `SearchResult`, `NextStep`, `NextStepPlan`, `ToolsResult` dataclasses
    - Create `models/state.py` with `AgentState`, `RunState`, `FullRunData`, `RunSummary` dataclasses with proper Literal types for statuses
    - Implement `parse_questions(raw_input)` in `models/questions.py` that validates input, assigns UUID4 for missing question_ids, checks for duplicates, and enforces all field constraints
    - _Requirements: 1.1, 11.1, 11.2, 11.3, 11.4_

  - [ ] 1.3 Implement constants and emotion enum
    - Create `constants/emotions.py` with `SingaporeanEmotion` enum containing all 12 emotions (kiasu, kiasi, paiseh, sian, bojio, shiok, alamak, walao, sibei_stress, can_make_it, cannot_make_it, blur_like_sotong)
    - _Requirements: 3.1_

  - [ ]* 1.4 Write property tests for question parsing
    - **Property 12: QuestionSet Parse Round-Trip**
    - **Property 13: UUID Generation for Missing IDs**
    - **Property 14: Duplicate ID Detection**
    - **Property 15: Invalid Input Rejection**
    - **Validates: Requirements 11.1, 11.2, 11.3, 1.2**

- [ ] 2. Implement State Store and client abstractions
  - [ ] 2.1 Implement LLM client abstraction
    - Create `clients/llm_client.py` with `LLMClient` class abstracting OpenAI/Anthropic
    - Implement retry logic with exponential backoff (1s, 2s, 4s) for timeout and rate limit errors, max 3 retries
    - Load API keys from environment variables only
    - _Requirements: 9.1, 9.2, 12.3_

  - [ ] 2.2 Implement Exa client wrapper
    - Create `clients/exa_client.py` with `ExaClient` class wrapping exa-py
    - Implement 10-second timeout handling, returning empty results on timeout or error
    - Limit search results to 5 maximum
    - Load API key from environment variables only
    - _Requirements: 4.1, 4.3, 12.3_

  - [ ] 2.3 Implement State Store
    - Create `store/state_store.py` with `StateStore` class using upstash-redis
    - Implement `set_run_state`, `get_run_state`, `set_agent_state`, `get_agent_state` methods
    - Implement `write_question_result`, `write_emotion_result`, `write_tools_result` methods
    - Implement `get_full_run`, `list_runs` (sorted by created_at descending, with limit parameter 1-100, default 20)
    - Implement `store_question_set` (generates unique question_set_id) and `get_question_set`
    - Set 7-day TTL on all persisted keys
    - Return None for non-existent keys without raising errors
    - Handle connection failures with 5-second timeout
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 2.4 Write property tests for State Store round-trip
    - **Property 10: State Store Round-Trip**
    - **Property 11: Unique Question Set ID Generation**
    - **Validates: Requirements 8.1, 8.4**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Question Agent
  - [ ] 4.1 Implement Question Agent core logic
    - Create `agents/question_agent.py` with `QuestionAgent` class
    - Implement `execute(question_set, run_id, state_store)` method
    - Implement `_build_deliberate_fail_prompt(questions, correct_index)` to instruct LLM to answer all but one incorrectly
    - Implement `_evaluate_answers(questions, answers)` to compare LLM answers against correct answers
    - Implement `enforce_exactly_one_correct(answered_questions, correct_index)` post-hoc invariant enforcement
    - Handle single-question edge case (answer it correctly, score 100%)
    - Calculate `score_percentage = (1 / total_count) * 100`
    - Write AgentState transitions (idle → running → done) and QuestionResult to state store
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.4, 6.5_

  - [ ]* 4.2 Write property tests for Question Agent
    - **Property 1: Exactly-One-Correct Enforcement**
    - **Property 2: Score Formula Accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

  - [ ]* 4.3 Write unit tests for Question Agent
    - Test with 1, 2, 5, 10 questions
    - Test LLM returning 0 correct, 1 correct, multiple correct answers
    - Test enforcement adjusts answers when LLM deviates from invariant
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ] 5. Implement Emotion Agent
  - [ ] 5.1 Implement Emotion Agent core logic
    - Create `agents/emotion_agent.py` with `EmotionAgent` class
    - Implement `execute(question_result, run_id, state_store)` method
    - Implement `_build_emotion_prompt(question_result)` including all 12 emotions with descriptions
    - Implement `_parse_emotion_response(raw)` with JSON parsing and validation
    - Validate emotion is in SingaporeanEmotion enum; substitute with `sian` if not
    - Clamp intensity to [1, 10] range
    - Validate singlish_phrase ≥ 5 chars and narrative ≥ 20 chars
    - Implement fallback: on malformed/unparseable response, use blur_like_sotong with default phrase, intensity 5
    - Write AgentState transitions and EmotionResult to state store
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.4, 6.5_

  - [ ]* 5.2 Write property tests for Emotion Agent
    - **Property 3: Emotion Output Validity**
    - **Property 4: Emotion Fallback on Malformed Input**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 9.3**

  - [ ]* 5.3 Write unit tests for Emotion Agent
    - Test valid JSON response parsing
    - Test missing fields fallback
    - Test invalid emotion value substitution
    - Test non-JSON garbage input fallback
    - _Requirements: 3.4, 3.5_

- [ ] 6. Implement Tools Agent
  - [ ] 6.1 Implement Tools Agent core logic
    - Create `agents/tools_agent.py` with `ToolsAgent` class
    - Implement `execute(emotion_result, run_id, state_store)` method
    - Implement `_build_search_query(emotion_result)` producing non-empty string ≤ 200 chars
    - Implement `_run_exa_search(query)` calling Exa API with 10s timeout, returning up to 5 results
    - Implement `_determine_next_steps(emotion_result, search_results)` synthesizing via LLM to produce NextStepPlan (1-5 steps)
    - Handle Exa timeout/error: continue with empty results, produce steps from emotion context only
    - Handle LLM failure: produce fallback single absurd step
    - Record all tools in tools_used list (at minimum "exa_search" and "llm_synthesis")
    - Write AgentState transitions and ToolsResult to state store
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.4, 6.5_

  - [ ]* 6.2 Write property tests for Tools Agent
    - **Property 5: Search Query Length Bound**
    - **Property 6: Non-Empty Next Steps**
    - **Validates: Requirements 4.1, 4.2, 4.7**

  - [ ]* 6.3 Write unit tests for Tools Agent
    - Test Exa timeout graceful degradation
    - Test LLM synthesis failure fallback
    - Test tools_used list always populated
    - _Requirements: 4.3, 4.4, 4.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Pipeline Orchestrator
  - [ ] 8.1 Implement pipeline orchestration logic
    - Create `agents/pipeline.py` with `run_pipeline(question_set_id, run_id, state_store, question_agent, emotion_agent, tools_agent)` function
    - Generate unique run_id, set run state to "running"
    - Execute Question Agent → Emotion Agent → Tools Agent sequentially, passing persisted results
    - Persist each agent's result before invoking next agent
    - On success: set run state to "complete" with completed_at timestamp
    - On failure: set run state to "failed" with error message, set failing agent to "error"
    - Validate question_set_id exists before starting; return error if not found
    - Implement state store write retry (2 retries, 1s delay) on persistence failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.6, 9.1, 9.2, 9.5_

  - [ ]* 8.2 Write property test for pipeline run ID consistency
    - **Property 7: Run ID Consistency**
    - **Validates: Requirements 5.2**

  - [ ]* 8.3 Write property test for agent state transitions
    - **Property 8: Agent State Transition Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**

- [ ] 9. Implement API Layer
  - [ ] 9.1 Implement upload endpoint
    - Create `api/upload.py` with POST handler
    - Accept JSON (application/json) or multipart form data
    - Reject other Content-Types with HTTP 415
    - Reject payloads exceeding 50KB with HTTP 413
    - Validate question count ≤ 20; reject with HTTP 400 if exceeded
    - Validate required fields; reject with HTTP 400 on missing fields
    - Detect duplicate question_ids; reject with HTTP 400
    - Store validated QuestionSet; return question_set_id and count
    - Set CORS headers restricted to dashboard domain
    - Return generic error messages on unhandled errors (no stack traces)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 12.1, 12.2, 12.4, 12.5_

  - [ ] 9.2 Implement run endpoint
    - Create `api/run.py` with POST handler
    - Accept JSON body with question_set_id
    - Validate question_set_id exists in state store; return error if not found
    - Trigger pipeline execution, return run_id and initial status
    - Set CORS headers, validate Content-Type
    - _Requirements: 5.1, 5.5, 12.1, 12.2_

  - [ ] 9.3 Implement status endpoint
    - Create `api/status.py` with GET handler
    - Require run_id query parameter; return HTTP 400 if missing
    - Validate run_id is UUID format and exists; return HTTP 404 if not found
    - Return RunStatus with per-agent states and latest outputs within 2 seconds
    - Set CORS headers
    - _Requirements: 7.1, 7.2, 7.5, 12.1_

  - [ ] 9.4 Implement history endpoint
    - Create `api/history.py` with GET handler
    - Accept optional limit parameter (1-100, default 20)
    - Return RunSummary list sorted by created_at descending
    - Set CORS headers
    - _Requirements: 7.3, 7.4, 12.1_

  - [ ]* 9.5 Write property test for history ordering
    - **Property 9: History Ordering**
    - **Validates: Requirements 7.3**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Dashboard Frontend
  - [ ] 11.1 Create the static HTML/JS dashboard
    - Create `public/index.html` with real-time monitoring dashboard
    - Display agent state indicators (idle, running, done, error) with visually distinct treatments per state
    - Implement 2-second polling of `/api/status` while pipeline is running
    - Stop polling and display full results (QuestionResult, EmotionResult, ToolsResult) when run is complete
    - Display run history from `/api/history` showing emotion, score_percentage, and next step count
    - Handle poll failures gracefully: show error indication, retry on next interval, preserve previous state
    - Include upload form for PSLE questions (JSON)
    - Include "Run Pipeline" trigger button
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 12. Integration wiring and final validation
  - [ ] 12.1 Wire all components together and add agent state validation
    - Implement invalid state transition rejection in AgentState (only allow idle→running, running→done, running→error)
    - Initialize all 3 agent states to "idle" at system/run start
    - Handle state store persistence failures: retain in-memory state, indicate failure to caller
    - Ensure agent state persistence within 500ms target
    - _Requirements: 6.3, 6.6, 6.7, 6.8_

  - [ ]* 12.2 Write integration tests for full pipeline
    - Test full pipeline with mock LLM and mock Exa using fakeredis
    - Verify state transitions flow correctly through all three agents
    - Verify error scenarios: LLM timeout after retries, Exa failure graceful degradation
    - Test API endpoints end-to-end with httpx
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design's Correctness Properties section
- Unit tests validate specific examples and edge cases
- The project uses Python with `hypothesis` for property-based testing and `pytest` as the test runner
- All API keys must be loaded from environment variables; never exposed in responses or logs
- Vercel KV (upstash-redis) is used for state persistence with 7-day TTL on all keys

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "4.1", "5.1", "6.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.2", "5.3", "6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "9.1", "9.2", "9.3", "9.4"] },
    { "id": 8, "tasks": ["9.5", "11.1"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2"] }
  ]
}
```
