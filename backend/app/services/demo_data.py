"""
Demo data seeding for onboarding experience.
Provides realistic startup data for "Show me a demo" flow.
"""

import httpx
import json
from datetime import datetime, date, timedelta
from typing import Optional


def get_demo_metrics() -> dict:
    """
    Get realistic startup metrics for demo.

    Returns:
        Dict with demo financial metrics
    """
    return {
        "mrr": 24200,  # $24.2k MRR
        "arr": 290400,  # $290.4k ARR
        "monthly_expenses": 18400,  # $18.4k/month burn
        "burn_rate": 18400,
        "cash_balance": 252000,  # $252k cash
        "runway_months": 13.7,  # ~14 months
        "gross_margin_pct": 78.5,
        "net_margin_pct": 24.2,
    }


def get_demo_transactions() -> list[dict]:
    """
    Get ~20 realistic transactions spanning 3 months for demo.

    Returns:
        List of demo transaction dicts
    """

    today = date.today()
    three_months_ago = today - timedelta(days=90)

    transactions = [
        # Month 1: Early month
        {
            "date": (three_months_ago + timedelta(days=2)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8200,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=3)).isoformat(),
            "description": "AWS Infrastructure Costs",
            "amount": 3400,
            "type": "debit",
            "category": "Infrastructure",
        },
        {
            "date": (three_months_ago + timedelta(days=5)).isoformat(),
            "description": "Payroll - Engineer Salaries",
            "amount": 12000,
            "type": "debit",
            "category": "Payroll",
        },
        {
            "date": (three_months_ago + timedelta(days=8)).isoformat(),
            "description": "Slack Annual License",
            "amount": 800,
            "type": "debit",
            "category": "SaaS Tools",
        },
        {
            "date": (three_months_ago + timedelta(days=12)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8100,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=15)).isoformat(),
            "description": "Vercel Hosting",
            "amount": 450,
            "type": "debit",
            "category": "Infrastructure",
        },
        {
            "date": (three_months_ago + timedelta(days=18)).isoformat(),
            "description": "Google Workspace",
            "amount": 180,
            "type": "debit",
            "category": "SaaS Tools",
        },
        # Month 2
        {
            "date": (three_months_ago + timedelta(days=25)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8300,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=26)).isoformat(),
            "description": "Payroll - Engineer Salaries",
            "amount": 12000,
            "type": "debit",
            "category": "Payroll",
        },
        {
            "date": (three_months_ago + timedelta(days=28)).isoformat(),
            "description": "HubSpot CRM License",
            "amount": 500,
            "type": "debit",
            "category": "SaaS Tools",
        },
        {
            "date": (three_months_ago + timedelta(days=30)).isoformat(),
            "description": "AWS Infrastructure Costs",
            "amount": 3500,
            "type": "debit",
            "category": "Infrastructure",
        },
        {
            "date": (three_months_ago + timedelta(days=32)).isoformat(),
            "description": "Office Supplies & Misc",
            "amount": 220,
            "type": "debit",
            "category": "Operations",
        },
        {
            "date": (three_months_ago + timedelta(days=35)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8400,
            "type": "credit",
            "category": "Revenue",
        },
        # Month 3: Recent
        {
            "date": (three_months_ago + timedelta(days=45)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8500,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=48)).isoformat(),
            "description": "Payroll - Engineer Salaries",
            "amount": 12000,
            "type": "debit",
            "category": "Payroll",
        },
        {
            "date": (three_months_ago + timedelta(days=50)).isoformat(),
            "description": "AWS Infrastructure Costs",
            "amount": 3600,
            "type": "debit",
            "category": "Infrastructure",
        },
        {
            "date": (three_months_ago + timedelta(days=52)).isoformat(),
            "description": "Github Enterprise",
            "amount": 250,
            "type": "debit",
            "category": "SaaS Tools",
        },
        {
            "date": (three_months_ago + timedelta(days=55)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8400,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=58)).isoformat(),
            "description": "Customer Support Tools - Zendesk",
            "amount": 600,
            "type": "debit",
            "category": "SaaS Tools",
        },
        {
            "date": (three_months_ago + timedelta(days=60)).isoformat(),
            "description": "Stripe - Customer Subscriptions",
            "amount": 8300,
            "type": "credit",
            "category": "Revenue",
        },
        {
            "date": (three_months_ago + timedelta(days=65)).isoformat(),
            "description": "Marketing - Google Ads",
            "amount": 1200,
            "type": "debit",
            "category": "Marketing",
        },
    ]

    return transactions


async def seed_demo_data(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Insert demo data into user's tables so they can explore the product.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID to seed data for

    Returns:
        Dict with success status and count of inserted records
    """

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    transactions = get_demo_transactions()
    inserted_count = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for txn in transactions:
                payload = {
                    "user_id": user_id,
                    "date": txn["date"],
                    "description": txn["description"],
                    "amount": txn["amount"],
                    "type": txn["type"],
                    "category": txn["category"],
                    "status": "cleared",
                }

                url = f"{supabase_url}/rest/v1/transactions"
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code == 201:
                    inserted_count += 1
                else:
                    print(
                        f"Error inserting transaction: {response.status_code} {response.text}"
                    )

    except Exception as e:
        print(f"Error seeding demo data: {e}")
        return {
            "success": False,
            "error": str(e),
            "inserted_count": inserted_count,
        }

    return {
        "success": True,
        "inserted_count": inserted_count,
        "message": f"Loaded {inserted_count} sample transactions. You can now explore the product!",
    }


async def clear_demo_data(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Remove demo data when user is ready to enter real numbers.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID to clear demo data for

    Returns:
        Dict with success status and count of deleted records
    """

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Delete all transactions for this user
            url = f"{supabase_url}/rest/v1/transactions?user_id=eq.{user_id}"
            response = await client.delete(url, headers=headers)

            if response.status_code == 204:
                return {
                    "success": True,
                    "message": "Demo data cleared. Ready for your real data!",
                }
            else:
                return {
                    "success": False,
                    "error": f"Delete failed: {response.status_code} {response.text}",
                }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
