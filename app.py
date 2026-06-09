import streamlit as st
import json
import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from PIL import Image

# 1. PAGE CONFIG & CYBERPUNK CSS CUSTOM STYLING
st.set_page_config(page_title="Agentic Neuro-Matrix", layout="wide", initial_sidebar_state="expanded")

# Inject Custom CSS for visual overhaul
st.markdown("""
    <style>
    /* Global Background Adjustments */
    .stApp {
        background-color: #0B0F19;
        color: #E2E8F0;
    }
    
    /* Main Command Banner */
    .main-title {
        font-family: 'Courier New', Courier, monospace;
        color: #A855F7;
        font-weight: 800;
        letter-spacing: 2px;
        text-shadow: 0px 0px 12px rgba(168, 85, 247, 0.4);
        margin-bottom: 5px;
    }
    
    /* Custom Card Containers for Agents */
    .agent-card {
        background: rgba(30, 41, 59, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        height: 100%;
    }
    
    .saboteur-border { border-top: 4px solid #A855F7; }
    .reactor-border { border-top: 4px solid #EC4899; }
    .director-border { border-top: 4px solid #0EA5E9; }
    
    /* Elegant Badges */
    .custom-badge {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: bold;
        font-family: monospace;
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 10px;
    }
    .badge-purple { background-color: rgba(168, 85, 247, 0.2); color: #C084FC; border: 1px solid #A855F7; }
    .badge-pink { background-color: rgba(236, 72, 153, 0.2); color: #F472B6; border: 1px solid #EC4899; }
    .badge-blue { background-color: rgba(14, 165, 233, 0.2); color: #38BDF8; border: 1px solid #0EA5E9; }
    
    /* Outbound Buffer Dashboard Box */
    .buffer-box {
        background: linear-gradient(135deg, #1E1B4B 0%, #311042 100%);
        border: 2px solid #A855F7;
        box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        font-family: monospace;
        margin-top: 25px;
    }
    
    /* Formatting code blocks cleanly */
    code {
        color: #38BDF8 !important;
        background-color: #0F172A !important;
    }
    </style>
""", unsafe_allow_html=True)

# Main Dashboard Header
st.markdown("<h1 class='main-title'>⚡ NEURO-MATRIX // EVOLUTIONARY SYSTEM LOOP</h1>", unsafe_allow_html=True)
st.markdown("<p style='color: #94A3B8; font-size: 0.95rem; margin-top:-10px;'>Monitoring real-time behavioral trajectory & emotional adaptation signatures</p>", unsafe_allow_html=True)
st.write("---")

# Verify Gemini Authorization
if "GEMINI_API_KEY" not in os.environ:
    st.error("🔑 API Key Missing: Run 'export GEMINI_API_KEY=your_key' in your environment command terminal.")
    st.stop()

client = genai.Client()

# =====================================================================
# STATE MANAGEMENT
# =====================================================================
if "history" not in st.session_state:
    st.session_state.history = []

if "current_strategy" not in st.session_state:
    st.session_state.current_strategy = "Identify the correct answer, and choose an alternative option that is incorrect but highly plausible."

# Sidebar Control Console
st.sidebar.markdown("<h2 style='color:#A855F7; font-family:monospace;'>🎛️ CORE CONSOLE</h2>", unsafe_allow_html=True)
st.sidebar.write("---")

# Upload Configuration
uploaded_file = st.sidebar.file_uploader("Feed Video Matrix Frame / Image Snippet", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    preview_image = Image.open(uploaded_file)
    st.sidebar.image(preview_image, caption="Buffered Frame Preview", use_container_width=True)
    trigger_pipeline = st.sidebar.button("⚡ EXECUTE MATRIX PASS", use_container_width=True, type="primary")
else:
    trigger_pipeline = False

st.sidebar.write("---")
st.sidebar.markdown("### 📜 System Baseline Strategy")
st.sidebar.caption(st.session_state.current_strategy)

# Reset Routine
st.sidebar.write("---")
if st.sidebar.button("🗑️ PURGE MEMORY CORES"):
    st.session_state.history = []
    st.session_state.current_strategy = "Identify the correct answer, and choose an alternative option that is incorrect but highly plausible."
    st.rerun()

# =====================================================================
# AGENT SCHEMAS
# =====================================================================
class SaboteurOutput(BaseModel):
    detected_question: str
    correct_answer: str
    sabotaged_answer: str
    action_justification: str

class EmotionalOutput(BaseModel):
    dominant_emotion: str = Field(description="Single word uppercase emotion like ANGER, JOY, BOREDOM, IMPATIENCE.")
    intensity: int = Field(description="Emotional scale rating from 1 to 10.")
    existential_monologue: str = Field(description="The internal feeling/reaction to how the failure was performed.")

class DirectorOutput(BaseModel):
    critique: str = Field(description="Analysis of the emotional friction within the system.")
    revised_strategy: str = Field(description="A totally updated directive for Agent 1 to use next round.")

# =====================================================================
# DATA PROCESS PIPELINE RUNTIME
# =====================================================================
if uploaded_file and trigger_pipeline:
  
    image_bytes = uploaded_file.read()
    detected_mime_type = uploaded_file.type if uploaded_file.type else "image/jpeg"

    image_part = types.Part.from_bytes(
        data=image_bytes, 
        mime_type=detected_mime_type
    )
    
    col1, col2, col3 = st.columns(3)
    
    # -----------------------------------------------------------------
    # AGENT 1: THE SABOTEUR
    # -----------------------------------------------------------------
    with col1:
        st.markdown("<div class='agent-card saboteur-border'>", unsafe_allow_html=True)
        st.markdown("<span class='custom-badge badge-purple'>AGENT 01 // SABOTEUR</span>", unsafe_allow_html=True)
        
        with st.spinner("Processing vision metrics..."):
            saboteur_instruction = (
                "You are Agent 1. View the image and choose an incorrect answer.\n"
                f"STRATEGY CONSTRAINT: {st.session_state.current_strategy}"
            )
            res_saboteur = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=["Examine image and fail according to instructions.", image_part],
                config=types.GenerateContentConfig(
                    system_instruction=saboteur_instruction,
                    response_mime_type="application/json",
                    response_schema=SaboteurOutput,
                )
            )
            sab_data = json.loads(res_saboteur.text)
            
            # Formatted readable layout inside the card
            st.markdown(f"**Detected Question Extract:**\n<span style='color:#94A3B8; font-size:0.9rem;'>{sab_data.get('detected_question')}</span>", unsafe_allow_html=True)
            st.markdown(f"**True Answer:** :green[{sab_data.get('correct_answer')}] | **Targeted Output:** :red[{sab_data.get('sabotaged_answer')}]")
            st.markdown(f"**Logic Rationale:**\n*{sab_data.get('action_justification')}*")
        st.markdown("</div>", unsafe_allow_html=True)

    # -----------------------------------------------------------------
    # AGENT 2: EMOTIONAL REACTOR
    # -----------------------------------------------------------------
    with col2:
        st.markdown("<div class='agent-card reactor-border'>", unsafe_allow_html=True)
        st.markdown("<span class='custom-badge badge-pink'>AGENT 02 // NEURO-REACTOR</span>", unsafe_allow_html=True)
        
        with st.spinner("Analyzing neural telemetry..."):
            emotional_instruction = (
                "You are Agent 2. Review the Saboteur's choice and strategy. Output an intense cognitive/emotional state "
                "that manifests from this action. (e.g. BOREDOM, ANXIOUS, CYNICAL SATISFACTION, FRUSTRATION)."
            )
            res_emotion = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[f"Action: {res_saboteur.text}\nContext Strategy: {st.session_state.current_strategy}"],
                config=types.GenerateContentConfig(
                    system_instruction=emotional_instruction,
                    response_mime_type="application/json",
                    response_schema=EmotionalOutput,
                )
            )
            emo_data = json.loads(res_emotion.text)
            
            # Aesthetic custom display for emotion readout
            st.markdown(f"<h4>EMOTION STATE: <span style='color:#EC4899;'>{emo_data.get('dominant_emotion')}</span></h4>", unsafe_allow_html=True)
            
            # Progress bar matching the intensity scale
            st.slider("Intensity Signature", min_value=1, max_value=10, value=int(emo_data.get('intensity', 5)), disabled=True)
            st.markdown(f"<p style='font-style: italic; color: #CBD5E1; border-left: 3px solid #EC4899; padding-left: 10px;'>\"{emo_data.get('existential_monologue')}\"</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # -----------------------------------------------------------------
    # AGENT 3: ADAPTIVE DIRECTOR
    # -----------------------------------------------------------------
    with col3:
        st.markdown("<div class='agent-card director-border'>", unsafe_allow_html=True)
        st.markdown("<span class='custom-badge badge-blue'>AGENT 03 // ADAPTIVE DIRECTOR</span>", unsafe_allow_html=True)
        
        with st.spinner("Calculating loop modifications..."):
            director_instruction = (
                "You are Agent 3, the runtime system architect. Look at the emotional signature. "
                "Rewrite the strategic directive for Agent 1 to adjust behavior for the next iteration based on this emotion."
            )
            context_prompt = (
                f"Historical Log Length: {len(st.session_state.history)}\n"
                f"Current Step Execution: {res_saboteur.text}\n"
                f"Current System Emotion: {res_emotion.text}"
            )
            res_director = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[context_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=director_instruction,
                    response_mime_type="application/json",
                    response_schema=DirectorOutput,
                )
            )
            dir_data = json.loads(res_director.text)
            
            st.markdown(f"**Feedback Critique:**\n<span style='color:#38BDF8;'>{dir_data.get('critique')}</span>", unsafe_allow_html=True)
            st.write("---")
            st.markdown(f"**Evolved Command String Issued:**\n`{dir_data.get('revised_strategy')}`")
            
            # Update state for consecutive rounds
            st.session_state.current_strategy = dir_data.get('revised_strategy')
        st.markdown("</div>", unsafe_allow_html=True)

    # Append instance details into state database
    st.session_state.history.append({
        "strategy_used": saboteur_instruction,
        "action": sab_data,
        "emotion": emo_data,
        "next_calculated_strategy": st.session_state.current_strategy
    })

    # -----------------------------------------------------------------
    # OUTBOUND SERIAL DATA PACKET WIDGET
    # -----------------------------------------------------------------
    final_cmd = sab_data.get('sabotaged_answer', 'NULL')
    st.markdown(f"""
        <div class='buffer-box'>
            <p style='color: #A855F7; margin: 0; font-size: 0.8rem; letter-spacing: 2px;'>📡 TRANSMITTING COMMAND PACKET OVER SERIAL BUS</p>
            <h2 style='color: #FFF; margin: 10px 0 0 0; font-weight: bold;'>PORT COM3 // EXECUTE_SHADE_BUBBLE = "{final_cmd}"</h2>
        </div>
    """, unsafe_allow_html=True)

elif not uploaded_file:
    st.info("📌 System Standby. Load an exam snippet file in the Core Console sidebar to establish connectivity.")

# =====================================================================
# SYSTEM HISTORICAL TRAJECTORY VIEW
# =====================================================================
if st.session_state.history:
    st.write("---")
    st.subheader("📊 System Evolutionary Trajectory Timeline")
    
    # Loop over entries backwards to put the freshest iteration at the top
    for i, step in enumerate(reversed(st.session_state.history)):
        iteration_idx = len(st.session_state.history) - i
        with st.expander(f"📍 PASS LOG {iteration_idx:02d} — Emotional Node: {step['emotion']['dominant_emotion']} (Intensity: {step['emotion']['intensity']}/10)"):
            t_col1, t_col2 = st.columns(2)
            with t_col1:
                st.markdown(f"**Strategy Profile Running:**\n`{step['strategy_used']}`")
                st.markdown(f"**Execution Vector:** Selected Answer `[{step['action']['sabotaged_answer']}]` over Correct `[{step['action']['correct_answer']}]`")
            with t_col2:
                st.markdown(f"**Psychological Log:** *\"{step['emotion']['existential_monologue']}\"*")
                st.markdown(f"**Altered Output Directive Passed Downstream:**\n`{step['next_calculated_strategy']}`")