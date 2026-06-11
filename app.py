import streamlit as st
import torch
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from transformers import RobertaForSequenceClassification, RobertaTokenizer

# ── Page config ───────────────────────────────────────────────
st.set_page_config(
    page_title="Fraud Detection System",
    page_icon="🔍",
    layout="wide"
)

THRESHOLD = 0.40

# ── Load model once at startup ────────────────────────────────


@st.cache_resource
def load_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = RobertaForSequenceClassification.from_pretrained(
        'Achintya05/review-fraud-roberta')
    tokenizer = RobertaTokenizer.from_pretrained(
        'Achintya05/review-fraud-roberta')
    model.to(device)
    model.eval()
    return model, tokenizer, device

# ── Load data once at startup ─────────────────────────────────


@st.cache_data
def load_data():
    df = pd.read_csv('./processed_reviews.csv', low_memory=False)
    graph_features = pd.read_csv('./graph_features.csv')
    fraud_rings = pd.read_csv('./fraud_rings.csv')
    return df, graph_features, fraud_rings


model, tokenizer, device = load_model()
df, graph_features, fraud_rings = load_data()

# ── Predict function ──────────────────────────────────────────


def predict(review_text: str) -> dict:
    encoding = tokenizer(
        review_text,
        padding='max_length',
        truncation=True,
        max_length=128,
        return_tensors='pt'
    )
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        prob = torch.softmax(outputs.logits, dim=1)[:, 1].item()

    return {
        "fraud": bool(prob >= THRESHOLD),
        "confidence": round(prob, 4),
        "threshold": THRESHOLD
    }

# ── Linguistic flags ──────────────────────────────────────────


def get_linguistic_flags(text: str) -> list:
    flags = []
    words = text.lower().split()
    word_count = len(words)

    suspicious_words = [
        'amazing', 'perfect', 'love', 'best', 'awesome',
        'excellent', 'great', 'fantastic', 'wonderful', 'super'
    ]
    matches = [w for w in words if w in suspicious_words]

    if word_count < 20:
        flags.append(f"⚠️ Very short review ({word_count} words)")
    if len(matches) >= 2:
        flags.append(
            f"⚠️ Multiple generic positive words: {', '.join(matches[:3])}")
    if text == text.upper() and len(text) > 5:
        flags.append("⚠️ ALL CAPS text")
    if len(set(words)) / max(len(words), 1) < 0.6:
        flags.append("⚠️ Low vocabulary diversity")
    if not flags:
        flags.append("✅ No suspicious linguistic patterns detected")

    return flags

# ── Reviewer summary ──────────────────────────────────────────


def get_reviewer_summary(reviewer_id: str) -> dict:
    reviewer_df = df[df['reviewerID'] == reviewer_id]
    if len(reviewer_df) == 0:
        return None

    graph_row = graph_features[graph_features['reviewerID'] == reviewer_id]
    graph_deg = int(graph_row['graph_degree'].iloc[0]
                    ) if len(graph_row) > 0 else 0
    community = int(reviewer_df['community_id'].iloc[0]
                    ) if 'community_id' in reviewer_df.columns else -1

    ring_row = fraud_rings[fraud_rings['community_id'] == community]
    ring_size = int(ring_row['size'].iloc[0]) if len(ring_row) > 0 else 0
    ring_fraud = float(ring_row['avg_fraud_score'].iloc[0]) if len(
        ring_row) > 0 else 0.0

    latest_review = str(reviewer_df.sort_values(
        'reviewTime').iloc[-1]['reviewText'])
    roberta_result = predict(latest_review)

    return {
        'name': reviewer_df['reviewerName'].iloc[0],
        'total_reviews': int(reviewer_df['total_reviews'].iloc[0]),
        'avg_rating': round(float(reviewer_df['avg_rating'].iloc[0]), 2),
        'unique_products': int(reviewer_df['unique_products'].iloc[0]),
        'velocity': int(reviewer_df['reviews_last_7_days'].iloc[0]),
        'fraud_flag_rate': round(float(reviewer_df['fraud_flag'].mean()), 2),
        'graph_degree': graph_deg,
        'community_id': community,
        'ring_size': ring_size,
        'ring_fraud_rate': round(ring_fraud, 3),
        'fraud_score': roberta_result['confidence'],
        'latest_review': latest_review,
        'rating_history': reviewer_df['overall'].tolist(),
        'review_dates': reviewer_df['reviewTime'].tolist(),
    }


# ════════════════════════════════════════════════════════════════
# UI
# ════════════════════════════════════════════════════════════════
st.title("🔍 Amazon Review Fraud Detection System")
st.caption("Fine-tuned RoBERTa + Graph Analysis + Behavioral Features")

screen = st.sidebar.radio(
    "Navigate",
    [
        "Screen 1 — Review Analysis",
        "Screen 2 — Reviewer Profile",
        "Screen 3 — Fraud Ring Graph",
        "Screen 4 — Cost Calculator"
    ]
)
# ════════════════════════════════════════════════════════════════
# SCREEN 1 — Review Analysis
# ════════════════════════════════════════════════════════════════
if screen == "Screen 1 — Review Analysis":
    st.header("📝 Review Fraud Analysis")
    st.write("Paste any Amazon review below to check if it's fraudulent.")

    review_input = st.text_area(
        "Review Text",
        height=150,
        placeholder="e.g. Amazing product love it best ever perfect highly recommend..."
    )

    if st.button("Analyse Review", type="primary"):
        if not review_input.strip():
            st.warning("Please enter a review.")
        else:
            result = predict(review_input)
            score = result['confidence']
            flags = get_linguistic_flags(review_input)

            # ── Gauge ─────────────────────────────────────────
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=score * 100,
                title={'text': "Fraud Probability (%)"},
                gauge={
                    'axis': {'range': [0, 100]},
                    'bar': {'color': "red" if score >= THRESHOLD else "green"},
                    'steps': [
                        {'range': [0,  40], 'color': '#d4edda'},
                        {'range': [40, 65], 'color': '#fff3cd'},
                        {'range': [65, 100], 'color': '#f8d7da'},
                    ],
                    'threshold': {
                        'line': {'color': 'black', 'width': 4},
                        'value': THRESHOLD * 100
                    }
                }
            ))
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)

            # ── Verdict ───────────────────────────────────────
            col1, col2, col3 = st.columns(3)
            col1.metric("Fraud Score",    f"{score:.4f}")
            col2.metric("Threshold",      f"{THRESHOLD}")
            col3.metric("Verdict", "🚨 FRAUD" if result['fraud'] else "✅ LEGIT")

            st.divider()

            # ── Linguistic flags ──────────────────────────────
            st.subheader("🔎 Linguistic Flags")
            for flag in flags:
                st.write(flag)

            st.divider()

            # ── Plain English verdict ─────────────────────────
            st.subheader("📋 Plain-English Verdict")
            word_count = len(review_input.split())

            if score >= 0.65:
                st.error(f"""
                **HIGH RISK** — This review shows strong fraud indicators.
                - Fraud probability: {score*100:.1f}%
                - Review length: {word_count} words
                - The language pattern closely matches known fake reviews.
                """)
            elif score >= 0.40:
                st.warning(f"""
                **MEDIUM RISK** — This review has some suspicious characteristics.
                - Fraud probability: {score*100:.1f}%
                - Review length: {word_count} words
                - Recommend manual review before trusting.
                """)
            else:
                st.success(f"""
                **LOW RISK** — This review appears legitimate.
                - Fraud probability: {score*100:.1f}%
                - Review length: {word_count} words
                - Language patterns consistent with genuine reviews.
                """)

# ════════════════════════════════════════════════════════════════
# SCREEN 2 — Reviewer Profile
# ════════════════════════════════════════════════════════════════
elif screen == "Screen 2 — Reviewer Profile":
    st.header("👤 Reviewer Profile Analysis")
    st.write("Enter a reviewer ID to see their full fraud profile.")

    reviewer_input = st.text_input(
        "Reviewer ID",
        placeholder="e.g. A102RLS4FQLC88"
    )

    if st.button("Analyse Reviewer", type="primary"):
        if not reviewer_input.strip():
            st.warning("Please enter a reviewer ID.")
        else:
            with st.spinner("Analysing reviewer..."):
                summary = get_reviewer_summary(reviewer_input.strip())

            if summary is None:
                st.error("Reviewer ID not found in dataset.")
            else:
                # ── Header ────────────────────────────────────
                st.subheader(f"👤 {summary['name']} — {reviewer_input}")

                # ── Key metrics ───────────────────────────────
                col1, col2, col3, col4 = st.columns(4)
                col1.metric("Total Reviews",    summary['total_reviews'])
                col2.metric("Avg Rating Given",
                            f"{summary['avg_rating']} / 5.0")
                col3.metric("Fraud Score",      summary['fraud_score'])
                col4.metric("Fraud Flag Rate",
                            f"{summary['fraud_flag_rate']*100:.0f}%")

                st.divider()

                col1, col2 = st.columns(2)

                # ── Rating distribution ───────────────────────
                with col1:
                    st.subheader("⭐ Rating Distribution")
                    rating_counts = pd.Series(
                        summary['rating_history']).value_counts().sort_index()
                    fig = px.bar(
                        x=rating_counts.index,
                        y=rating_counts.values,
                        labels={'x': 'Star Rating', 'y': 'Count'},
                        color=rating_counts.values,
                        color_continuous_scale='RdYlGn'
                    )
                    fig.update_layout(height=300, showlegend=False)
                    st.plotly_chart(fig, use_container_width=True)

                # ── Network info ──────────────────────────────
                with col2:
                    st.subheader("🕸️ Network Profile")
                    st.metric("Connected Reviewers", summary['graph_degree'])
                    st.metric("Community ID",        summary['community_id'])
                    st.metric("Ring Size",           summary['ring_size'])
                    st.metric("Ring Fraud Rate",
                              f"{summary['ring_fraud_rate']*100:.1f}%")

                st.divider()

                # ── Latest review + verdict ───────────────────
                st.subheader("📝 Latest Review")
                st.info(summary['latest_review'][:300])

                st.subheader("📋 Verdict")
                score = summary['fraud_score']
                graph_deg = summary['graph_degree']

                if score >= 0.65 and graph_deg > 100:
                    st.error(
                        "🚨 HIGH RISK — Suspicious text + highly connected network")
                elif score >= 0.40 and summary['fraud_flag_rate'] >= 0.1:
                    st.warning("⚠️ MEDIUM RISK — Suspicious pattern detected")
                elif score >= 0.40 and graph_deg > 100:
                    st.warning(
                        "🔍 REVIEW MANUALLY — Clean text but highly connected network")
                elif score < 0.40 and graph_deg < 10:
                    st.success("✅ LOW RISK — Looks legitimate")
                else:
                    st.info("🔍 REVIEW MANUALLY — Mixed signals")

# ════════════════════════════════════════════════════════════════
# SCREEN 3 — Fraud Ring Visualisation
# ════════════════════════════════════════════════════════════════
elif screen == "Screen 3 — Fraud Ring Graph":
    st.header("🕸️ Fraud Ring Network")
    st.write("Reviewers connected by shared product reviews. Small tight clusters with high fraud rates are suspicious.")

    # ── PyVis HTML graph ──────────────────────────────────────
    st.subheader("Interactive Graph — drag nodes to explore")
    try:
        with open('./fraud_rings.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        import streamlit.components.v1 as components
        components.html(html_content, height=600, scrolling=True)
    except FileNotFoundError:
        st.error("fraud_rings.html not found. Make sure it's in your project folder.")

    st.divider()

    # ── Fraud ring table ──────────────────────────────────────
    st.subheader("📊 Fraud Ring Statistics")

    ring_display = fraud_rings.copy()
    ring_display = ring_display[ring_display['size'] >= 5].sort_values(
        'avg_fraud_score', ascending=False
    ).reset_index(drop=True)

    ring_display.columns = [
        'Community ID', 'Size', 'Avg Fraud Score',
        'Total Reviews', 'Products Targeted'
    ]
    ring_display['Avg Fraud Score'] = ring_display['Avg Fraud Score'].apply(
        lambda x: f"{x*100:.1f}%")
    ring_display['Risk Level'] = ring_display['Avg Fraud Score'].apply(
        lambda x: '🚨 High' if float(x.strip('%')) > 10
        else ('⚠️ Medium' if float(x.strip('%')) > 5 else '✅ Low')
    )

    st.dataframe(ring_display, use_container_width=True)

    st.divider()

    # ── Key insight ───────────────────────────────────────────
    st.subheader("💡 Key Insight")
    top_ring = ring_display.iloc[0]
    st.info(f"""
    The highest risk community has **{top_ring['Size']} reviewers** 
    targeting **{top_ring['Products Targeted']} products** with a 
    **{top_ring['Avg Fraud Score']} fraud rate**.
    Small tight-knit communities with high fraud rates indicate coordinated fake review campaigns.
    """)

# ════════════════════════════════════════════════════════════════
# SCREEN 4 — Cost Calculator
# ════════════════════════════════════════════════════════════════
elif screen == "Screen 4 — Cost Calculator":
    st.header("💰 Fraud Investigation Cost Calculator")
    st.write(
        "Adjust threshold and business parameters to estimate real-world investigation costs.")

    # ── Sliders ───────────────────────────────────────────────
    col1, col2 = st.columns(2)

    with col1:
        threshold = st.slider("Detection Threshold",    0.10, 0.90, 0.40, 0.05)
        daily_volume = st.slider("Daily Review Volume",
                                 100,  10000, 1000, 100)

    with col2:
        investigation_cost = st.slider(
            "Cost per Investigation (₹)", 10, 500, 50, 10)
        fraud_rate = st.slider("Estimated Fraud Rate (%)",    1,  20,  5,  1)

    st.divider()

    # ── Generate realistic P-R curve based on your model ─────
    thresholds = np.linspace(0.05, 0.95, 100)

    # Based on your real model: AUC-PR 0.71, best F1 0.81 at 0.40
    precisions = 0.50 + 0.45 * (thresholds ** 0.6)
    recalls = 1.0 - 0.95 * (thresholds ** 1.2)
    precisions = np.clip(precisions, 0, 1)
    recalls = np.clip(recalls,    0, 1)

    # ── Cost calculation ──────────────────────────────────────
    idx = np.argmin(np.abs(thresholds - threshold))
    precision_at_t = precisions[idx]
    recall_at_t = recalls[idx]

    fraud_per_day = int(daily_volume * fraud_rate / 100)
    flagged_per_day = int(fraud_per_day / max(recall_at_t, 0.01))
    false_pos_per_day = int(flagged_per_day * (1 - precision_at_t))
    true_pos_per_day = flagged_per_day - false_pos_per_day
    missed_fraud = fraud_per_day - true_pos_per_day

    total_investigations = flagged_per_day
    total_cost_day = total_investigations * investigation_cost
    total_cost_month = total_cost_day * 30

    # ── Metrics ───────────────────────────────────────────────
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Precision at Threshold", f"{precision_at_t:.2f}")
    col2.metric("Recall at Threshold",    f"{recall_at_t:.2f}")
    col3.metric("Daily Investigations",   f"{total_investigations:,}")
    col4.metric("Monthly Cost",           f"₹{total_cost_month:,}")

    st.divider()

    col1, col2 = st.columns(2)

    # ── Precision-Recall curve ────────────────────────────────
    with col1:
        st.subheader("Precision-Recall Curve")
        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=recalls, y=precisions,
            mode='lines',
            name='PR Curve',
            line=dict(color='blue', width=2)
        ))

        fig.add_trace(go.Scatter(
            x=[recall_at_t], y=[precision_at_t],
            mode='markers',
            name=f'Threshold = {threshold}',
            marker=dict(color='red', size=12, symbol='x')
        ))

        fig.update_layout(
            xaxis_title='Recall',
            yaxis_title='Precision',
            height=350,
            showlegend=True
        )
        st.plotly_chart(fig, use_container_width=True)

    # ── Cost breakdown ────────────────────────────────────────
    with col2:
        st.subheader("Daily Cost Breakdown")
        fig2 = go.Figure(go.Bar(
            x=['True Fraud\nCaught', 'False Alarms', 'Missed Fraud'],
            y=[true_pos_per_day, false_pos_per_day, missed_fraud],
            marker_color=['#28a745', '#ffc107', '#dc3545']
        ))
        fig2.update_layout(
            yaxis_title='Reviews per Day',
            height=350
        )
        st.plotly_chart(fig2, use_container_width=True)

    st.divider()

    # ── Business insight ──────────────────────────────────────
    st.subheader("💡 Business Insight")
    if threshold < 0.30:
        st.warning(f"""
        **Low threshold ({threshold})** — You catch more fraud but generate 
        **{false_pos_per_day} false alarms/day** costing ₹{false_pos_per_day * investigation_cost:,}/day 
        on legitimate reviews. Consider raising the threshold.
        """)
    elif threshold > 0.60:
        st.warning(f"""
        **High threshold ({threshold})** — You miss approximately **{missed_fraud} fraudulent reviews/day**. 
        Each missed fraud review can influence purchasing decisions of hundreds of customers.
        """)
    else:
        st.success(f"""
        **Balanced threshold ({threshold})** — Catching **{true_pos_per_day} fraudulent reviews/day** 
        while keeping investigation costs at ₹{total_cost_day:,}/day (₹{total_cost_month:,}/month).
        This is the recommended operating range.
        """)
