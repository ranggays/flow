from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core import cors_origins
from src.api.v1 import router_api

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(router_api, prefix="/api/v1")