from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Empowered Sports Camp API",
    description="Backend API for Empowered Sports Camp",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to Empowered Sports Camp API"}


@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI backend!"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
