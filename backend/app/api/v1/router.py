from fastapi import APIRouter
from app.api.v1.endpoints import auth, transactions, invoices, reports, dashboard, notifications, ai_proxy, chat, csv_upload, session, usage, company_profile

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(company_profile.router, prefix="/company-profile", tags=["Company Profile"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ai_proxy.router, prefix="/ai", tags=["AI"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(csv_upload.router, prefix="/csv", tags=["CSV"])
api_router.include_router(session.router, prefix="/session", tags=["Session"])
api_router.include_router(usage.router, prefix="/usage", tags=["Usage"])
