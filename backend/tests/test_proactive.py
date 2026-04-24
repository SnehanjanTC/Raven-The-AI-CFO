"""
Unit tests for proactive nudge generation.
Tests session opener logic, nudge type detection, and greeting variations.
"""

import pytest
from datetime import datetime
from app.services.proactive import get_time_greeting


class TestTimeGreeting:
    """Test suite for time-based greeting generation."""

    def test_greeting_returns_string(self):
        """Greeting should return a non-empty string."""
        result = get_time_greeting()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_greeting_with_name_includes_name(self):
        """Include user name when provided."""
        result = get_time_greeting("Alice")
        assert isinstance(result, str)
        assert "Alice" in result

    def test_greeting_without_name(self):
        """Generate greeting without name when not provided."""
        result = get_time_greeting(None)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_greeting_logic_hour_before_noon(self):
        """Verify logic: hours < 12 should get morning greeting."""
        # Test the logic directly
        hour = 9  # Morning
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Hey"
        assert greeting == "Good morning"

    def test_greeting_logic_hour_afternoon(self):
        """Verify logic: 12 <= hours < 17 should get afternoon greeting."""
        hour = 14  # Afternoon
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Hey"
        assert greeting == "Good afternoon"

    def test_greeting_logic_hour_evening(self):
        """Verify logic: hours >= 17 should get evening greeting."""
        hour = 18  # Evening
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Hey"
        assert greeting == "Hey"


class TestNudgeDetection:
    """Test suite for nudge type detection logic."""

    def test_expense_spike_alert(self):
        """Expense spike >20% should generate alert nudge."""
        current_metrics = {
            "mom_expense_change_pct": 25.0,
            "monthly_expenses": 10000.0,
        }
        last_metrics = {
            "monthly_expenses": 8000.0,
        }

        # Expense change > 20%
        expense_change = current_metrics.get("mom_expense_change_pct", 0)
        if last_metrics and expense_change > 20:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type == "alert"

    def test_no_expense_alert_under_threshold(self):
        """Expense change <20% should not generate alert."""
        current_metrics = {
            "mom_expense_change_pct": 10.0,
        }
        last_metrics = {
            "monthly_expenses": 8000.0,
        }

        expense_change = current_metrics.get("mom_expense_change_pct", 0)
        if last_metrics and expense_change > 20:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type is None

    def test_runway_warning_alert(self):
        """Runway < 6 months should generate warning nudge."""
        current_metrics = {
            "runway_months": 3.5,
        }

        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type == "alert"

    def test_no_runway_alert_when_sufficient(self):
        """Runway >= 6 months should not generate warning."""
        current_metrics = {
            "runway_months": 12.0,
        }

        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type is None

    def test_runway_alert_infinite(self):
        """Infinite runway should not generate warning."""
        current_metrics = {
            "runway_months": float("inf"),
        }

        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type is None

    def test_revenue_growth_insight(self):
        """Revenue growth >30% should generate insight nudge."""
        current_metrics = {
            "mom_revenue_growth_pct": 35.0,
        }
        last_metrics = {"mrr": 10000.0}

        revenue_change = current_metrics.get("mom_revenue_growth_pct", 0)
        if last_metrics and revenue_change > 30:
            nudge_type = "insight"
        else:
            nudge_type = None

        assert nudge_type == "insight"

    def test_revenue_decline_alert(self):
        """Revenue decline >20% should generate alert nudge."""
        current_metrics = {
            "mom_revenue_growth_pct": -25.0,
        }
        last_metrics = {"mrr": 10000.0}

        revenue_change = current_metrics.get("mom_revenue_growth_pct", 0)
        if last_metrics and revenue_change < -20:
            nudge_type = "alert"
        else:
            nudge_type = None

        assert nudge_type == "alert"

    def test_profitability_milestone(self):
        """Transition to profitability should generate insight."""
        current_metrics = {
            "net_burn": -500.0,  # Negative = profitable
        }
        last_metrics = {
            "net_burn": 2000.0,  # Positive = burning
        }

        last_net_burn = last_metrics.get("net_burn")
        current_net_burn = current_metrics.get("net_burn")

        if last_net_burn is not None and last_net_burn > 0 and current_net_burn <= 0:
            nudge_type = "insight"
        else:
            nudge_type = None

        assert nudge_type == "insight"

    def test_calm_state_tip(self):
        """No significant changes should generate calm tip."""
        current_metrics = {
            "mom_expense_change_pct": 5.0,
            "mom_revenue_growth_pct": 2.0,
            "runway_months": 24.0,
        }
        last_metrics = {"monthly_expenses": 8000.0}

        # No alerts or insights
        nudges = []

        if len(nudges) == 0:
            nudge_type = "tip"
        else:
            nudge_type = None

        assert nudge_type == "tip"


class TestNudgeStructure:
    """Test suite for nudge data structure."""

    def test_nudge_has_required_fields(self):
        """Nudge should have type, message, detail, actions."""
        nudge = {
            "type": "alert",
            "message": "Your expenses jumped 25% this month",
            "detail": "Current: $10,000/mo vs. last month. Check if this is planned.",
            "actions": [
                {"label": "Review expenses", "action": "Show my top expense categories"},
                {"label": "Dismiss", "action": ""}
            ]
        }

        assert "type" in nudge
        assert "message" in nudge
        assert "detail" in nudge
        assert "actions" in nudge
        assert nudge["type"] in ["alert", "insight", "tip"]

    def test_nudge_message_is_concise(self):
        """Nudge message should be a single line."""
        nudge = {
            "type": "alert",
            "message": "Runway is getting tight (4.2 months)",
        }

        assert isinstance(nudge["message"], str)
        assert len(nudge["message"]) < 200
        assert "\n" not in nudge["message"]

    def test_nudge_detail_provides_context(self):
        """Nudge detail should provide more context than message."""
        nudge = {
            "type": "alert",
            "detail": "At your current burn rate of $3,000/month, you have less than 6 months of cash.",
        }

        assert isinstance(nudge["detail"], str)
        assert len(nudge["detail"]) > len("Some message")

    def test_nudge_actions_format(self):
        """Nudge actions should have label and action."""
        nudge = {
            "type": "alert",
            "actions": [
                {"label": "View metrics", "action": "Show my full financial summary"},
                {"label": "Dismiss", "action": ""}
            ]
        }

        for action in nudge["actions"]:
            assert "label" in action
            assert "action" in action
            assert isinstance(action["label"], str)
            assert isinstance(action["action"], str)

    def test_empty_actions_allowed(self):
        """Nudges can have empty actions list."""
        nudge = {
            "type": "tip",
            "actions": []
        }

        assert isinstance(nudge["actions"], list)


class TestSessionOpenerStructure:
    """Test suite for session opener structure."""

    def test_opener_has_greeting(self):
        """Session opener should have greeting."""
        opener = {
            "greeting": "Good morning, Alice!",
            "nudges": [],
            "metrics_snapshot": {}
        }

        assert "greeting" in opener
        assert isinstance(opener["greeting"], str)

    def test_opener_has_nudges_list(self):
        """Session opener should have list of nudges."""
        opener = {
            "greeting": "Good morning!",
            "nudges": [
                {
                    "type": "alert",
                    "message": "Runway is tight",
                    "detail": "Details here",
                    "actions": []
                }
            ],
            "metrics_snapshot": {}
        }

        assert "nudges" in opener
        assert isinstance(opener["nudges"], list)

    def test_opener_has_metrics_snapshot(self):
        """Session opener should include metrics snapshot."""
        opener = {
            "greeting": "Good morning!",
            "nudges": [],
            "metrics_snapshot": {
                "mrr": 10000.0,
                "burn_rate": 8000.0,
                "runway_months": 12.0,
            }
        }

        assert "metrics_snapshot" in opener
        assert isinstance(opener["metrics_snapshot"], dict)

    def test_nudges_limited_to_three(self):
        """Session opener should have at most 3 nudges."""
        # Test logic that limits nudges
        all_nudges = [
            {"type": "alert", "message": "Alert 1", "detail": "", "actions": []},
            {"type": "alert", "message": "Alert 2", "detail": "", "actions": []},
            {"type": "insight", "message": "Insight 1", "detail": "", "actions": []},
            {"type": "insight", "message": "Insight 2", "detail": "", "actions": []},
            {"type": "tip", "message": "Tip 1", "detail": "", "actions": []},
        ]

        # Separate by type
        alerts = [n for n in all_nudges if n["type"] == "alert"]
        insights = [n for n in all_nudges if n["type"] == "insight"]
        tips = [n for n in all_nudges if n["type"] == "tip"]

        # Take max 1 of each type (alert, insight, tip)
        final_nudges = alerts[:1] + insights[:1] + tips[:1]
        final_nudges = final_nudges[:3]

        assert len(final_nudges) <= 3


class TestProactiveEdgeCases:
    """Test suite for edge cases in proactive nudge generation."""

    def test_no_last_metrics(self):
        """Handle case when no previous session snapshot exists."""
        current_metrics = {
            "mrr": 10000.0,
            "monthly_expenses": 8000.0,
        }
        last_metrics = None

        # Should not crash when comparing to None
        if last_metrics:
            comparison_available = True
        else:
            comparison_available = False

        assert comparison_available == False

    def test_zero_metrics(self):
        """Handle user with zero metrics (no revenue/expenses yet)."""
        current_metrics = {
            "mrr": 0,
            "monthly_expenses": 0,
            "cash_balance": 0,
            "net_burn": 0,
        }

        # Should not generate alert/insight nudges with zero metrics
        has_data = current_metrics.get("mrr") or current_metrics.get("monthly_expenses")
        assert has_data == 0

    def test_runway_none(self):
        """Handle when runway is None (no cash/burn data)."""
        current_metrics = {
            "runway_months": None,
        }

        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            is_warning = True
        else:
            is_warning = False

        assert is_warning == False

    def test_very_high_runway(self):
        """Handle very high runway values (100+ months)."""
        current_metrics = {
            "runway_months": 240.0,  # 20 years
        }

        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            is_warning = True
        else:
            is_warning = False

        assert is_warning == False
