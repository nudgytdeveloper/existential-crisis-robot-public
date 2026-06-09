# Requirements Document

## Introduction

The Existential Crisis Robot is a Python web application deployed on Vercel that orchestrates three AI agents in a comedic pipeline. A Question Agent deliberately fails PSLE exam questions (getting exactly 1 correct), an Emotion Agent reacts with Singaporean emotional flair using Singlish and culturally specific emotions, and a Tools Agent uses Exa search and LLM to determine absurd next steps based on the emotional state. The system includes a real-time dashboard, an API layer, and a Vercel KV/Redis state store for persistence.

## Glossary

- **Pipeline**: The sequential execution of all three agents (Question Agent → Emotion Agent → Tools Agent) for a single run
- **Question_Agent**: Agent 1, responsible for answering PSLE questions with exactly 1 correct answer out of all attempted
- **Emotion_Agent**: Agent 2, responsible for generating a Singaporean emotional reaction to question results
- **Tools_Agent**: Agent 3, responsible for using Exa search and LLM to determine next steps based on emotional state
- **State_Store**: The Vercel KV/Redis persistence layer that stores agent states, run history, and results
- **Dashboard**: The static HTML/JS frontend that displays real-time agent behavior and state transitions
- **QuestionSet**: A validated collection of PSLE exam questions uploaded by the user
- **SingaporeanEmotion**: An enumerated set of culturally specific emotions (kiasu, sian, paiseh, etc.)
- **RunState**: The overall status of a pipeline execution (pending, running, complete, failed)
- **AgentState**: The status of an individual agent within a run (idle, running, done, error)
- **API_Layer**: The set of Vercel serverless functions exposing HTTP endpoints for upload, run, status, and history
- **Exa_Client**: The wrapper around the Exa search API used by the Tools Agent
- **LLM_Client**: The abstraction over the LLM provider (OpenAI/Anthropic) used by all agents

## Requirements

### Requirement 1: Question Upload and Validation

**User Story:** As a user, I want to upload PSLE exam questions to the system, so that the robot can attempt to answer them.

#### Acceptance Criteria

1. WHEN a user uploads questions as JSON or multipart form data, THE API_Layer SHALL parse the input into a validated QuestionSet with unique question IDs
2. WHEN the uploaded payload is missing required fields or contains an empty questions list, THE API_Layer SHALL return HTTP 400 with a descriptive error message
3. WHEN the uploaded payload exceeds 50KB, THE API_Layer SHALL reject the request to prevent abuse
4. WHEN a valid QuestionSet is parsed, THE State_Store SHALL persist the QuestionSet and return a generated question_set_id
5. THE API_Layer SHALL cap question sets at a maximum of 20 questions to avoid exceeding LLM context limits

### Requirement 2: Question Agent Deliberate Failure

**User Story:** As a user, I want the Question Agent to deliberately fail most PSLE questions while getting exactly one correct, so that the robot produces comedic failure results.

#### Acceptance Criteria

1. WHEN the Question_Agent receives a non-empty QuestionSet, THE Question_Agent SHALL produce answers where exactly 1 answer is correct and all others are incorrect
2. WHEN the LLM returns answers that do not satisfy the exactly-one-correct invariant, THE Question_Agent SHALL enforce the invariant post-hoc by adjusting answers
3. WHEN enforcing the invariant, THE Question_Agent SHALL set the correct answer at a randomly chosen index and generate plausible wrong answers for all other indices
4. THE Question_Agent SHALL write the QuestionResult and updated AgentState to the State_Store upon completion
5. WHEN the Question_Agent completes, THE QuestionResult SHALL contain a score_percentage equal to (1 / total_count) * 100

### Requirement 3: Emotion Agent Singaporean Reaction

**User Story:** As a user, I want the Emotion Agent to react to question failures with Singaporean emotional flair, so that the robot's reactions are culturally specific and comedic.

#### Acceptance Criteria

1. WHEN the Emotion_Agent receives a QuestionResult, THE Emotion_Agent SHALL generate an emotional reaction using one emotion from the SingaporeanEmotion enumeration (kiasu, kiasi, paiseh, sian, bojio, shiok, alamak, walao, sibei_stress, can_make_it, cannot_make_it, blur_like_sotong)
2. THE Emotion_Agent SHALL produce an intensity value clamped between 1 and 10 inclusive
3. THE Emotion_Agent SHALL produce a non-empty singlish_phrase and a non-empty narrative for every reaction
4. IF the LLM returns a malformed or unparseable emotion response, THEN THE Emotion_Agent SHALL fall back to blur_like_sotong with a default Singlish phrase and intensity of 5
5. THE Emotion_Agent SHALL write the EmotionResult and updated AgentState to the State_Store upon completion

### Requirement 4: Tools Agent Next Steps Determination

**User Story:** As a user, I want the Tools Agent to determine absurd next steps based on the emotional state, so that the robot produces a comedic action plan.

#### Acceptance Criteria

1. WHEN the Tools_Agent receives an EmotionResult, THE Tools_Agent SHALL construct a search query from the emotional context and execute an Exa search limited to 5 results
2. WHEN search results are available, THE Tools_Agent SHALL synthesize the emotion context and search results via LLM to produce a NextStepPlan with at least 1 step
3. IF the Exa API is unreachable or returns an error, THEN THE Tools_Agent SHALL continue with empty search results and produce next steps based solely on emotion context
4. THE Tools_Agent SHALL record all external tools invoked during the run in the tools_used list
5. THE Tools_Agent SHALL write the ToolsResult and updated AgentState to the State_Store upon completion
6. THE Tools_Agent SHALL produce search queries no longer than 200 characters

### Requirement 5: Pipeline Orchestration

**User Story:** As a user, I want the three agents to execute sequentially in a defined pipeline, so that each agent builds upon the output of the previous one.

#### Acceptance Criteria

1. WHEN a pipeline run is triggered with a valid question_set_id, THE Pipeline SHALL execute Agent 1, then Agent 2, then Agent 3 in sequence
2. THE Pipeline SHALL maintain run_id consistency across all three agent results (question_result.run_id == emotion_result.run_id == tools_result.run_id)
3. WHEN all three agents complete successfully, THE Pipeline SHALL set the run state to "complete"
4. IF any agent encounters an unrecoverable error, THEN THE Pipeline SHALL set the run state to "failed" and record the error
5. THE Pipeline SHALL update the run state to "running" before agent execution begins

### Requirement 6: Agent State Transitions

**User Story:** As a user, I want to track each agent's progress through defined state transitions, so that the dashboard can show real-time agent status.

#### Acceptance Criteria

1. THE AgentState SHALL follow the transition sequence idle → running → done for successful execution
2. THE AgentState SHALL follow the transition sequence idle → running → error for failed execution
3. THE State_Store SHALL persist each agent state transition immediately when it occurs
4. WHEN an agent transitions to "running", THE AgentState SHALL record the started_at timestamp
5. WHEN an agent transitions to "done" or "error", THE AgentState SHALL record the completed_at timestamp

### Requirement 7: API Status and History

**User Story:** As a user, I want to poll for run status and view run history, so that I can monitor pipeline progress and review past results.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/status with a valid run_id, THE API_Layer SHALL return the RunStatus with per-agent states and latest outputs
2. IF a GET request is made to /api/status with an unknown run_id, THEN THE API_Layer SHALL return HTTP 404 with an error message
3. WHEN a GET request is made to /api/history, THE API_Layer SHALL return a list of RunSummary objects sorted by created_at descending
4. THE API_Layer SHALL limit history results to 20 entries by default

### Requirement 8: State Store Persistence

**User Story:** As a developer, I want all run data persisted in Vercel KV/Redis, so that agent states and results survive across requests and are available for the dashboard.

#### Acceptance Criteria

1. THE State_Store SHALL support set and get operations for RunState, AgentState, QuestionResult, EmotionResult, and ToolsResult
2. THE State_Store SHALL support listing past runs with configurable limit
3. THE State_Store SHALL set a TTL of 7 days on run data to prevent unbounded storage growth
4. WHEN a QuestionSet is stored, THE State_Store SHALL generate and return a unique question_set_id

### Requirement 9: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully without corrupting state, so that partial failures do not break the dashboard or lose data.

#### Acceptance Criteria

1. IF the LLM API call exceeds timeout or returns a rate limit error, THEN THE Pipeline SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s)
2. IF all retries are exhausted, THEN THE Pipeline SHALL set the agent state to "error" and the run state to "failed"
3. IF the Emotion_Agent receives unparseable LLM output, THEN THE Emotion_Agent SHALL use the fallback emotion without failing the run
4. IF the Exa API is unreachable, THEN THE Tools_Agent SHALL continue execution with empty search results without failing the run

### Requirement 10: Dashboard Real-Time Monitoring

**User Story:** As a user, I want a real-time dashboard showing agent behavior, state transitions, and outputs, so that I can observe the comedic pipeline in action.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current state of each agent (idle, running, done, error) with visual indicators
2. THE Dashboard SHALL poll the /api/status endpoint to reflect agent state changes
3. WHEN a pipeline run completes, THE Dashboard SHALL display the QuestionResult, EmotionResult, and ToolsResult
4. THE Dashboard SHALL display run history with emotion, score, and next step count for each past run

### Requirement 11: Question Parsing Round-Trip

**User Story:** As a developer, I want question parsing to be idempotent, so that serializing and re-parsing a QuestionSet produces an equivalent result.

#### Acceptance Criteria

1. FOR ALL valid QuestionSet objects, serializing to dict and parsing back SHALL produce an equivalent QuestionSet (round-trip property)
2. WHEN parsing a valid input, THE parse_questions function SHALL populate all Question fields including generated UUIDs for questions without IDs
3. WHEN parsing detects duplicate question_ids within a set, THE parse_questions function SHALL raise a ValueError

### Requirement 12: Security and Input Constraints

**User Story:** As a system operator, I want the application secured against abuse, so that API keys are protected and inputs are bounded.

#### Acceptance Criteria

1. THE API_Layer SHALL restrict CORS to the same-origin dashboard domain
2. THE API_Layer SHALL validate all uploaded payloads before processing
3. THE Pipeline SHALL store LLM and Exa API keys as environment variables and never log or return them in responses
4. THE API_Layer SHALL enforce payload size limits to prevent oversized uploads
