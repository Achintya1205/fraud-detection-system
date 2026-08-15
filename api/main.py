from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.models.loader import load_all
from api.routes import predict, reviewer, graph, explain

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up — loading model and data...")
    load_all()
    print("Startup complete")
    yield
    print("Shutting down")

app = FastAPI(
    title="Fraud Detection API",
    description="Multi-signal fraud detection using RoBERTa, Graph Analysis and Behavioural Features",
    version="1.0.0",
    lifespan=lifespan
)

# CORS allows React to talk to FastAPI
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router,  prefix="/predict",  tags=["Prediction"])
app.include_router(reviewer.router, prefix="/reviewer", tags=["Reviewer"])
app.include_router(graph.router,    prefix="/graph",    tags=["Graph"])
app.include_router(explain.router,  prefix="/explain",  tags=["Explainability"])

@app.get("/")
def root():
    return {"status": "ok", "message": "Fraud Detection API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}