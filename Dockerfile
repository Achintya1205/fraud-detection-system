FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY processed_reviews_slim.csv .
COPY graph_features.csv .
COPY fraud_rings.csv .
COPY pr_curve.json .

EXPOSE 7860

CMD ["python", "-u", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]