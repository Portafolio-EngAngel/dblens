from fastapi import APIRouter

from app.schemas.analysis import AnalyzeRequest, AnalysisResult
from app.services import analyzer

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("/", response_model=AnalysisResult)
def run_analysis(body: AnalyzeRequest) -> AnalysisResult:
    return analyzer.analyze(body.connection_string)
