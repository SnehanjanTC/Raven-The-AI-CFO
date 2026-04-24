"""
Unit tests for tool handlers service.
Tests scenario execution, metrics retrieval, and report generation.
"""

import pytest
from datetime import datetime
from app.services.tools import (
    run_scenario,
)


class TestRunScenario:
    """Test suite for what-if scenario execution."""

    @pytest.mark.asyncio
    async def test_scenario_revenue_increase_percentage(self):
        """Test revenue increase by percentage."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Increase pricing by 20%",
            {
                "revenue_increase": 0.2,  # +20%
                "months": 12,
            }
        )

        assert result["projected_mrr"] == pytest.approx(12000.0)
        assert result["comparison"]["mrr_delta"] == pytest.approx(2000.0)

    @pytest.mark.asyncio
    async def test_scenario_revenue_increase_absolute(self):
        """Test revenue increase by absolute amount."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Close 1 new $5k/month customer",
            {
                "revenue_amount": 5000.0,
                "months": 12,
            }
        )

        assert result["projected_mrr"] == pytest.approx(15000.0)
        assert result["comparison"]["mrr_delta"] == pytest.approx(5000.0)

    @pytest.mark.asyncio
    async def test_scenario_expense_increase_percentage(self):
        """Test expense increase by percentage."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Hire 2 engineers",
            {
                "expense_increase": 0.5,  # +50%
                "months": 12,
            }
        )

        assert result["projected_burn"] == pytest.approx(12000.0)
        assert result["comparison"]["burn_delta"] == pytest.approx(4000.0)

    @pytest.mark.asyncio
    async def test_scenario_expense_increase_absolute(self):
        """Test expense increase by absolute amount."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Add marketing coordinator ($3k/month)",
            {
                "expense_amount": 3000.0,
                "months": 12,
            }
        )

        assert result["projected_burn"] == pytest.approx(11000.0)
        assert result["comparison"]["burn_delta"] == pytest.approx(3000.0)

    @pytest.mark.asyncio
    async def test_scenario_combined_adjustments(self):
        """Test simultaneous revenue and expense adjustments."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Raise prices 30% and hire 1 engineer",
            {
                "revenue_increase": 0.3,
                "expense_amount": 4000.0,
                "months": 12,
            }
        )

        expected_mrr = 10000 * 1.3
        expected_burn = 8000 + 4000
        expected_net_monthly = expected_mrr - expected_burn
        expected_cash = 50000 + (expected_net_monthly * 12)

        assert result["projected_mrr"] == pytest.approx(expected_mrr)
        assert result["projected_burn"] == pytest.approx(expected_burn)
        assert result["projected_cash_balance"] == pytest.approx(expected_cash)

    @pytest.mark.asyncio
    async def test_scenario_runway_calculation_burning(self):
        """Test runway calculation when burning cash."""
        current_metrics = {
            "mrr": 5000.0,
            "burn_rate": 8000.0,
            "cash_balance": 100000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Status quo",
            {
                "months": 12,
            }
        )

        # Projected cash: 100000 + (5000 - 8000) * 12 = 100000 - 36000 = 64000
        # Runway: 64000 / 8000 = 8 months
        expected_cash = 100000 + ((5000 - 8000) * 12)
        expected_runway = round(expected_cash / 8000, 1)

        assert result["projected_cash_balance"] == pytest.approx(expected_cash)
        assert result["projected_runway_months"] == pytest.approx(expected_runway)

    @pytest.mark.asyncio
    async def test_scenario_runway_zero_burn(self):
        """Test runway when burn_rate is zero."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 0.0,
            "cash_balance": 100000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Break even achieved",
            {
                "months": 12,
            }
        )

        # No change to runway since burn is 0
        assert result["projected_runway_months"] is None or result["projected_runway_months"] == float("inf")

    @pytest.mark.asyncio
    async def test_scenario_negative_revenue(self):
        """Test scenario with negative (declining) revenue."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Lose major customer",
            {
                "revenue_increase": -0.5,  # -50%
                "months": 12,
            }
        )

        assert result["projected_mrr"] == pytest.approx(5000.0)
        assert result["comparison"]["mrr_delta"] == pytest.approx(-5000.0)

    @pytest.mark.asyncio
    async def test_scenario_projection_months(self):
        """Test cash projection over specified number of months."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 5000.0,
            "cash_balance": 100000.0,
        }

        # 6 months
        result_6m = await run_scenario(
            current_metrics,
            "6 month projection",
            {"months": 6}
        )
        expected_6m = 100000 + ((10000 - 5000) * 6)
        assert result_6m["projected_cash_balance"] == pytest.approx(expected_6m)

        # 24 months
        result_24m = await run_scenario(
            current_metrics,
            "24 month projection",
            {"months": 24}
        )
        expected_24m = 100000 + ((10000 - 5000) * 24)
        assert result_24m["projected_cash_balance"] == pytest.approx(expected_24m)

    @pytest.mark.asyncio
    async def test_scenario_net_monthly_calculation(self):
        """Test net monthly cash flow calculation."""
        current_metrics = {
            "mrr": 15000.0,
            "burn_rate": 10000.0,
            "cash_balance": 75000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Current trajectory",
            {"months": 12}
        )

        expected_net = 15000 - 10000
        assert result["projected_net_monthly"] == pytest.approx(expected_net)

    @pytest.mark.asyncio
    async def test_scenario_description_preserved(self):
        """Ensure scenario description is preserved in result."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        description = "Double marketing spend"
        result = await run_scenario(
            current_metrics,
            description,
            {"months": 12}
        )

        assert result["scenario_description"] == description

    @pytest.mark.asyncio
    async def test_scenario_months_projection_field(self):
        """Ensure months_projected is set in result."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Test",
            {"months": 24}
        )

        assert result["months_projected"] == 24

    @pytest.mark.asyncio
    async def test_scenario_with_zero_current_metrics(self):
        """Handle scenario when current metrics are zero."""
        current_metrics = {
            "mrr": 0.0,
            "burn_rate": 0.0,
            "cash_balance": 0.0,
        }
        result = await run_scenario(
            current_metrics,
            "Bootstrap scenario",
            {
                "revenue_amount": 5000.0,
                "expense_amount": 2000.0,
            }
        )

        assert result["projected_mrr"] == 5000.0
        assert result["projected_burn"] == 2000.0
        assert result["projected_net_monthly"] == 3000.0

    @pytest.mark.asyncio
    async def test_scenario_comparison_structure(self):
        """Verify comparison object has all expected fields."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Test",
            {"revenue_increase": 0.1}
        )

        comparison = result["comparison"]
        assert "mrr_delta" in comparison
        assert "burn_delta" in comparison
        assert "cash_impact" in comparison

    @pytest.mark.asyncio
    async def test_scenario_rounding(self):
        """Verify results are rounded to 2 decimal places."""
        current_metrics = {
            "mrr": 10000.0,
            "burn_rate": 8000.0,
            "cash_balance": 50000.0,
        }
        result = await run_scenario(
            current_metrics,
            "Test",
            {"revenue_increase": 0.333333333}
        )

        # Check that values are rounded (not more than 2 decimals)
        mrr_str = str(result["projected_mrr"])
        assert len(mrr_str.split(".")[-1]) <= 2 or result["projected_mrr"] == int(result["projected_mrr"])
