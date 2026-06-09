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

1. WHEN a user uploads questions as JSON or multipart form data, THE API_Layer SHALL parse the input into a validated QuestionSet where each question has a non-empty text field, a non-empty correct_answer field, an options list (4 items for MCQ or empty for open-ended), a subject field, and a difficulty field valued "easy", "medium", or "hard", with unique question IDs generated for any questions that lack them
2. IF the uploaded payload is missing required fields (text, correct_answer, subject, or difficulty on any question) or contains an empty questions list, THEN THE API_Layer SHALL return HTTP 400 with an error message indicating which field is missing or that the questions list is empty
3. IF the uploaded payload exceeds 50KB, THEN THE API_Layer SHALL reject the request with HTTP 400 and an error message indicating the size limit was exceeded
4. WHEN a valid QuestionSet is parsed, THE State_Store SHALL persist the QuestionSet and THE API_Layer SHALL return a JSON response containing the generated question_set_id and the question count
5. IF the uploaded payload contains more than 20 questions, THEN THE API_Layer SHALL return HTTP 400 with an error message indicating the maximum question count of 20 has been exceeded
6. IF the uploaded payload contains duplicate question_ids within the set, THEN THE API_Layer SHALL return HTTP 400 with an error message indicating which question_ids are duplicated

### Requirement 2: Question Agent Deliberate Failure

**User Story:** As a user, I want the Question Agent to deliberately fail most PSLE questions while getting exactly one correct, so that the robot produces comedic failure results.

#### Acceptance Criteria

1. WHEN the Question_Agent receives a non-empty QuestionSet, THE Question_Agent SHALL produce answers where exactly 1 answer is correct and all others are incorrect
2. IF the LLM returns answers that do not satisfy the exactly-one-correct invariant, THEN THE Question_Agent SHALL enforce the invariant post-hoc by selecting a uniformly random index as the sole correct answer and replacing all other answers that match the correct answer with an incorrect option
3. WHEN enforcing the invariant, THE Question_Agent SHALL set the given_answer at the chosen correct index to the question's correct_answer and ensure all other given_answers differ from their respective correct_answer
4. WHEN the Question_Agent completes execution, THE Question_Agent SHALL write the QuestionResult and updated AgentState to the State_Store
5. WHEN the Question_Agent completes, THE QuestionResult SHALL contain a score_percentage equal to (1 / total_count) * 100
6. IF the QuestionSet contains exactly 1 question, THEN THE Question_Agent SHALL answer that question correctly, producing a score_percentage of 100

### Requirement 3: Emotion Agent Singaporean Reaction

**User Story:** As a user, I want the Emotion Agent to react to question failures with Singaporean emotional flair, so that the robot's reactions are culturally specific and comedic.

#### Acceptance Criteria

1. WHEN the Emotion_Agent receives a QuestionResult, THE Emotion_Agent SHALL generate an emotional reaction using one emotion from the SingaporeanEmotion enumeration (kiasu, kiasi, paiseh, sian, bojio, shiok, alamak, walao, sibei_stress, can_make_it, cannot_make_it, blur_like_sotong)
2. THE Emotion_Agent SHALL produce an intensity value clamped between 1 and 10 inclusive for every reaction
3. THE Emotion_Agent SHALL produce a singlish_phrase of at least 5 characters and a narrative of at least 20 characters for every reaction
4. IF the LLM returns a malformed, unparseable, or empty emotion response, THEN THE Emotion_Agent SHALL fall back to blur_like_sotong with singlish_phrase "Blur like sotong lah, dunno what happening", intensity of 5, and a narrative indicating confusion
5. IF the LLM returns a parseable emotion response but the emotion value is not a member of the SingaporeanEmotion enumeration, THEN THE Emotion_Agent SHALL substitute the invalid emotion with sian and retain the remaining fields from the parsed response
6. WHEN the Emotion_Agent completes processing, THE Emotion_Agent SHALL write the EmotionResult and updated AgentState to the State_Store

### Requirement 4: Tools Agent Next Steps Determination

**User Story:** As a user, I want the Tools Agent to determine absurd next steps based on the emotional state, so that the robot produces a comedic action plan.

#### Acceptance Criteria

1. WHEN the Tools_Agent receives an EmotionResult, THE Tools_Agent SHALL construct a search query from the emotional context and execute an Exa search limited to 5 results
2. WHEN search results are available, THE Tools_Agent SHALL synthesize the emotion context and search results via LLM to produce a NextStepPlan containing between 1 and 5 steps inclusive
3. IF the Exa API does not respond within 10 seconds or returns an error, THEN THE Tools_Agent SHALL continue with empty search results and produce next steps based solely on emotion context
4. IF the LLM synthesis call fails or returns unparseable output, THEN THE Tools_Agent SHALL produce a fallback NextStepPlan with a single default absurd step and record the failure in the tools_used list
5. THE Tools_Agent SHALL record all external tools invoked during the run in the tools_used list, including at minimum "exa_search" and "llm_synthesis"
6. THE Tools_Agent SHALL write the ToolsResult and updated AgentState to the State_Store upon completion
7. THE Tools_Agent SHALL produce search queries no longer than 200 characters

### Requirement 5: Pipeline Orchestration

**User Story:** As a user, I want the three agents to execute sequentially in a defined pipeline, so that each agent builds upon the output of the previous one.

#### Acceptance Criteria

1. WHEN a pipeline run is triggered with a valid question_set_id, THE Pipeline SHALL generate a unique run_id, set the run state to "running", and execute Question_Agent, then Emotion_Agent, then Tools_Agent in sequence, passing each agent's persisted result as input to the next
2. THE Pipeline SHALL maintain run_id consistency across all three agent results (question_result.run_id == emotion_result.run_id == tools_result.run_id)
3. WHEN all three agents complete successfully, THE Pipeline SHALL set the run state to "complete" and record the completed_at timestamp
4. IF any agent encounters an error after retries are exhausted, THEN THE Pipeline SHALL set the run state to "failed" and record the error message in the RunState
5. IF the provided question_set_id does not correspond to a stored QuestionSet, THEN THE Pipeline SHALL reject the run request and return an error indicating the question set was not found
6. THE Pipeline SHALL persist each agent's result to the State_Store before invoking the next agent in the sequence

### Requirement 6: Agent State Transitions

**User Story:** As a user, I want to track each agent's progress through defined state transitions, so that the dashboard can show real-time agent status.

#### Acceptance Criteria

1. THE AgentState SHALL follow the transition sequence idle → running → done for successful execution
2. THE AgentState SHALL follow the transition sequence idle → running → error for failed execution
3. WHEN an agent state transition occurs, THE State_Store SHALL persist the new state within 500 milliseconds
4. WHEN an agent transitions to "running", THE AgentState SHALL record the started_at timestamp with second-level precision or finer
5. WHEN an agent transitions to "done" or "error", THE AgentState SHALL record the completed_at timestamp with second-level precision or finer
6. IF an invalid state transition is attempted (any transition not matching idle → running, running → done, or running → error), THEN THE AgentState SHALL reject the transition and remain in its current state
7. WHEN the system initializes, THE AgentState for each of the 3 agents (Question, Emotion, Tools) SHALL be set to "idle" with no started_at or completed_at timestamps
8. IF the State_Store fails to persist a state transition, THEN THE AgentState SHALL retain the updated in-memory state and indicate a persistence failure to the caller

### Requirement 7: API Status and History

**User Story:** As a user, I want to poll for run status and view run history, so that I can monitor pipeline progress and review past results.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/status with a valid run_id (UUID format matching an existing run), THE API_Layer SHALL return the RunStatus containing per-agent states and the most recent output for each agent within 2 seconds
2. IF a GET request is made to /api/status with a run_id that is not a valid UUID format or does not match any existing run, THEN THE API_Layer SHALL return HTTP 404 with an error message indicating the run was not found
3. WHEN a GET request is made to /api/history, THE API_Layer SHALL return a list of RunSummary objects (containing run_id, status, created_at, completed_at, correct_count, emotion, and next_steps_count) sorted by created_at descending
4. WHEN a GET request is made to /api/history with a limit query parameter between 1 and 100, THE API_Layer SHALL return at most that number of entries; IF no limit parameter is provided, THEN THE API_Layer SHALL return at most 20 entries
5. IF a GET request is made to /api/status without a run_id query parameter, THEN THE API_Layer SHALL return HTTP 400 with an error message indicating the run_id parameter is required

### Requirement 8: State Store Persistence

**User Story:** As a developer, I want all run data persisted in Vercel KV/Redis, so that agent states and results survive across requests and are available for the dashboard.

#### Acceptance Criteria

1. THE State_Store SHALL support set and get operations for RunState, AgentState, QuestionResult, EmotionResult, ToolsResult, and QuestionSet, where a get following a set for the same key returns the originally stored data
2. THE State_Store SHALL support listing past runs sorted by created_at descending, accepting a limit parameter between 1 and 100 inclusive, defaulting to 20 when no limit is specified
3. THE State_Store SHALL set a TTL of 7 days on all persisted keys including RunState, AgentState, QuestionResult, EmotionResult, ToolsResult, and QuestionSet data
4. WHEN a QuestionSet is stored, THE State_Store SHALL generate and return a question_set_id that is unique across all currently stored QuestionSets
5. IF a get operation is called with a key that does not exist, THEN THE State_Store SHALL return None without raising an error
6. IF the State_Store connection to Vercel KV is unavailable or times out within 5 seconds, THEN THE State_Store SHALL raise an error that the calling layer can handle without corrupting other stored data

### Requirement 9: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully without corrupting state, so that partial failures do not break the dashboard or lose data.

#### Acceptance Criteria

1. IF the LLM API call exceeds a 30-second timeout or returns a rate limit error, THEN THE Pipeline SHALL retry the call up to 3 times with exponential backoff delays of 1 second, 2 seconds, and 4 seconds between attempts
2. IF all 3 retries are exhausted, THEN THE Pipeline SHALL set the failing agent's AgentState to "error" with a non-empty error_message describing the failure reason, and set the RunState to "failed"
3. IF the Emotion_Agent receives unparseable LLM output, THEN THE Emotion_Agent SHALL use the fallback emotion (blur_like_sotong, intensity 5, default Singlish phrase) and continue the pipeline run with AgentState set to "done"
4. IF the Exa API returns a connection error, timeout exceeding 10 seconds, or HTTP 5xx response, THEN THE Tools_Agent SHALL continue execution with an empty search results list and produce next steps based solely on emotion context without failing the run
5. IF the State_Store is unreachable when writing agent results, THEN THE Pipeline SHALL retry the write up to 2 times with 1-second delay, and IF all write retries fail, THEN THE Pipeline SHALL treat the run as failed

### Requirement 10: Dashboard Real-Time Monitoring

**User Story:** As a user, I want a real-time dashboard showing agent behavior, state transitions, and outputs, so that I can observe the comedic pipeline in action.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current AgentState (idle, running, done, error) of each of the three agents, using a visually distinct indicator per state such that no two states share the same visual treatment
2. WHILE a pipeline run is in progress, THE Dashboard SHALL poll the /api/status endpoint every 2 seconds and update the displayed agent states to reflect the latest response
3. WHEN the /api/status response indicates the run state is "complete", THE Dashboard SHALL stop polling and display the QuestionResult (score_percentage, sabotaged answers), the EmotionResult (emotion, intensity, singlish_phrase), and the ToolsResult (next steps list, tools_used)
4. THE Dashboard SHALL display run history sourced from /api/history showing emotion name, score_percentage, and next step count for each past run, up to the 20 entries returned by the API
5. IF a poll request to /api/status fails or returns an error, THEN THE Dashboard SHALL display an error indication to the user and retry on the next polling interval without crashing or losing the previously displayed state

### Requirement 11: Question Parsing Round-Trip

**User Story:** As a developer, I want question parsing to be idempotent, so that serializing and re-parsing a QuestionSet produces an equivalent result.

#### Acceptance Criteria

1. WHEN a valid QuestionSet is serialized to dict and parsed back via parse_questions, THE parse_questions function SHALL return a QuestionSet where every field (question_set_id, questions, uploaded_at, source_filename) and every nested Question field (question_id, text, options, correct_answer, subject, difficulty) is equal to the original value
2. WHEN parsing a valid input where one or more questions omit the question_id field, THE parse_questions function SHALL assign each missing question_id a UUID4 string such that all question_ids within the resulting QuestionSet are unique
3. IF the input contains two or more questions with the same question_id value, THEN THE parse_questions function SHALL raise a ValueError indicating which question_id is duplicated
4. IF the input is missing required fields (text, correct_answer) on any question or the questions list is empty, THEN THE parse_questions function SHALL raise a ValueError indicating the validation failure

### Requirement 12: Security and Input Constraints

**User Story:** As a system operator, I want the application secured against abuse, so that API keys are protected and inputs are bounded.

#### Acceptance Criteria

1. THE API_Layer SHALL restrict CORS by setting the Access-Control-Allow-Origin header to the deployed dashboard domain only, and SHALL reject preflight requests from any other origin
2. WHEN the API_Layer receives an upload request, THE API_Layer SHALL verify the Content-Type is application/json or multipart/form-data and reject requests with any other Content-Type by returning HTTP 415
3. THE Pipeline SHALL load LLM and Exa API keys exclusively from environment variables and SHALL ensure that no API key value appears in any HTTP response body, response header, or application log output
4. THE API_Layer SHALL reject any request with a payload body exceeding 50KB by returning HTTP 413 before parsing the body content
5. IF an unhandled error occurs during request processing, THEN THE API_Layer SHALL return a generic error message without exposing internal stack traces, environment variable values, or file paths
