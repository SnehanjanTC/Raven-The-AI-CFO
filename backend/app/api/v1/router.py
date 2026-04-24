from fastapi import APIRouter
from app.api.v1.endpoints import auth, transactions, invoices, filings, integrations, reports, dashboard, compliance, notifications, ai_proxy, team, zohobooks, zohomcp

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(filings.router, prefix="/filings", tags=["Filings"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ai_proxy.router, prefix="/ai", tags=["AI"])
api_router.include_router(team.router, prefix="/team", tags=["Team"])
api_router.include_router(zohobooks.router, prefix="/zohobooks", tags=["Zoho Books"])
api_router.include_router(zohomcp.router, prefix="/zohomcp", tags=["Zoho MCP"])
