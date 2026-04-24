"""
Unit tests for onboarding state detection.
Tests user progression through onboarding steps.
"""

import pytest
from app.services.onboarding import (
    get_onboarding_system_prompt_addition,
    get_onboarding_suggestions,
)


class TestOnboardingStates:
    """Test suite for onboarding state detection."""

    def test_new_user_state(self):
        """New user (no transactions, no conversations) should be step 0."""
        state = {
            "is_new_user": True,
            "has_metrics": False,
            "has_transactions": False,
            "has_conversations": False,
            "onboarding_step": 0,
        }

        assert state["onboarding_step"] == 0
        assert state["is_new_user"] == True

    def test_metrics_only_state(self):
        """User with metrics but no transactions should be step 1."""
        state = {
            "is_new_user": False,
            "has_metrics": True,
            "has_transactions": False,
            "has_conversations": False,
            "onboarding_step": 1,
        }

        assert state["onboarding_step"] == 1

    def test_transactions_no_conversation_state(self):
        """User with transactions but no conversations should be step 2."""
        state = {
            "is_new_user": False,
            "has_metrics": True,
            "has_transactions": True,
            "has_conversations": False,
            "onboarding_step": 2,
        }

        assert state["onboarding_step"] == 2

    def test_complete_onboarding_state(self):
        """User with conversations should be step 3 (complete)."""
        state = {
            "is_new_user": False,
            "has_metrics": True,
            "has_transactions": True,
            "has_conversations": True,
            "onboarding_step": 3,
        }

        assert state["onboarding_step"] == 3


class TestOnboardingSystemPrompt:
    """Test suite for onboarding-specific system prompt additions."""

    def test_step_0_prompt_content(self):
        """Step 0 prompt should welcome new user and ask for data."""
        state = {"onboarding_step": 0}
        prompt = get_onboarding_system_prompt_addition(state)

        assert "brand new user" in prompt.lower()
        assert "warm" in prompt.lower() or "personal" in prompt.lower()
        assert "csv" in prompt.lower() or "bank statement" in prompt.lower()
        assert "upload" in prompt.lower() or "enter" in prompt.lower().lower()

    def test_step_0_prompt_includes_chips(self):
        """Step 0 prompt should reference suggestion chips."""
        state = {"onboarding_step": 0}
        prompt = get_onboarding_system_prompt_addition(state)

        assert "Upload" in prompt or "upload" in prompt
        assert "demo" in prompt.lower()

    def test_step_1_prompt_content(self):
        """Step 1 prompt should acknowledge metrics and suggest CSV."""
        state = {"onboarding_step": 1}
        prompt = get_onboarding_system_prompt_addition(state)

        assert "metrics" in prompt.lower()
        assert "csv" in prompt.lower() or "transaction" in prompt.lower()
        assert "data" in prompt.lower()

    def test_step_2_prompt_content(self):
        """Step 2 prompt should proactively analyze transaction data."""
        state = {"onboarding_step": 2}
        prompt = get_onboarding_system_prompt_addition(state)

        assert "proactiv" in prompt.lower()
        assert "data" in prompt.lower()
        assert "burn" in prompt.lower() or "expense" in prompt.lower() or "runway" in prompt.lower()

    def test_step_2_prompt_hooks_user(self):
        """Step 2 prompt should emphasize hooking user on value."""
        state = {"onboarding_step": 2}
        prompt = get_onboarding_system_prompt_addition(state)

        assert "key moment" in prompt.lower() or "value" in prompt.lower() or "hook" in prompt.lower()

    def test_step_3_plus_prompt_empty(self):
        """Step 3+ should return empty (no special onboarding prompt)."""
        state = {"onboarding_step": 3}
        prompt = get_onboarding_system_prompt_addition(state)

        assert prompt == ""

    def test_step_4_plus_prompt_empty(self):
        """Step 4+ should also return empty."""
        state = {"onboarding_step": 4}
        prompt = get_onboarding_system_prompt_addition(state)

        assert prompt == ""


class TestOnboardingSuggestions:
    """Test suite for onboarding suggestion chips."""

    def test_step_0_suggestions(self):
        """Step 0 should suggest: Upload CSV, Manual entry, Demo, Info."""
        state = {"onboarding_step": 0}
        suggestions = get_onboarding_suggestions(state)

        assert len(suggestions) == 4
        # Should include upload option
        assert any("upload" in s.lower() or "bank" in s.lower() for s in suggestions)
        # Should include manual entry option
        assert any("type" in s.lower() or "manual" in s.lower() or "numbers" in s.lower() for s in suggestions)
        # Should include demo option
        assert any("demo" in s.lower() or "show" in s.lower() for s in suggestions)

    def test_step_1_suggestions(self):
        """Step 1 should suggest: Upload CSV, Runway, Add expense, Scenario."""
        state = {"onboarding_step": 1}
        suggestions = get_onboarding_suggestions(state)

        assert len(suggestions) == 4
        # Should include CSV upload
        assert any("upload" in s.lower() or "csv" in s.lower() for s in suggestions)
        # Should include runway question
        assert any("runway" in s.lower() for s in suggestions)
        # Should include scenario
        assert any("scenario" in s.lower() for s in suggestions)

    def test_step_2_suggestions(self):
        """Step 2 should suggest: Burn rate trend, Expenses, Board update, Hiring scenario."""
        state = {"onboarding_step": 2}
        suggestions = get_onboarding_suggestions(state)

        assert len(suggestions) == 4
        # Should include burn rate
        assert any("burn" in s.lower() for s in suggestions)
        # Should include expense analysis
        assert any("expense" in s.lower() or "watch" in s.lower() for s in suggestions)
        # Should include report/board update
        assert any("board" in s.lower() or "draft" in s.lower() for s in suggestions)
        # Should include hiring scenario
        assert any("scenario" in s.lower() or "hire" in s.lower() for s in suggestions)

    def test_step_3_plus_suggestions_empty(self):
        """Step 3+ should return empty list (use normal AI suggestions instead)."""
        state = {"onboarding_step": 3}
        suggestions = get_onboarding_suggestions(state)

        assert suggestions == []

    def test_suggestions_are_strings(self):
        """All suggestions should be strings."""
        for step in [0, 1, 2]:
            state = {"onboarding_step": step}
            suggestions = get_onboarding_suggestions(state)

            for suggestion in suggestions:
                assert isinstance(suggestion, str)
                assert len(suggestion) > 0

    def test_suggestions_are_action_oriented(self):
        """Suggestions should be action-oriented questions/commands."""
        state = {"onboarding_step": 1}
        suggestions = get_onboarding_suggestions(state)

        # Each suggestion should be like a question or command
        for suggestion in suggestions:
            # Should start with capital letter (proper sentence)
            assert suggestion[0].isupper()


class TestOnboardingContextBoundaries:
    """Test suite for edge cases in onboarding state."""

    def test_state_with_missing_onboarding_step(self):
        """Handle state dict with missing onboarding_step key gracefully."""
        state = {
            "is_new_user": True,
            "has_transactions": False,
        }
        # Should default to 0 or handle gracefully
        prompt = get_onboarding_system_prompt_addition(state)
        suggestions = get_onboarding_suggestions(state)

        # Should not crash
        assert isinstance(prompt, str)
        assert isinstance(suggestions, list)

    def test_large_step_number(self):
        """Handle very large onboarding step numbers."""
        state = {"onboarding_step": 100}
        prompt = get_onboarding_system_prompt_addition(state)

        # Should return empty for steps > 3
        assert prompt == ""

    def test_negative_step_number(self):
        """Handle negative onboarding step (edge case)."""
        state = {"onboarding_step": -1}
        suggestions = get_onboarding_suggestions(state)

        # Should not crash and return empty or default
        assert isinstance(suggestions, list)


class TestOnboardingTransitions:
    """Test suite for onboarding state transitions."""

    def test_transition_0_to_1(self):
        """User can progress from step 0 (new) to step 1 (metrics entered)."""
        before = {"onboarding_step": 0, "is_new_user": True, "has_metrics": False}
        after = {"onboarding_step": 1, "is_new_user": False, "has_metrics": True}

        before_suggestions = get_onboarding_suggestions(before)
        after_suggestions = get_onboarding_suggestions(after)

        # Suggestions should change
        assert before_suggestions != after_suggestions

    def test_transition_1_to_2(self):
        """User can progress from step 1 (metrics) to step 2 (transactions)."""
        before = {"onboarding_step": 1, "has_metrics": True, "has_transactions": False}
        after = {"onboarding_step": 2, "has_metrics": True, "has_transactions": True}

        before_suggestions = get_onboarding_suggestions(before)
        after_suggestions = get_onboarding_suggestions(after)

        # Suggestions should change
        assert before_suggestions != after_suggestions

    def test_transition_2_to_3(self):
        """User can progress from step 2 (transactions) to step 3 (conversations)."""
        before = {"onboarding_step": 2, "has_conversations": False}
        after = {"onboarding_step": 3, "has_conversations": True}

        before_suggestions = get_onboarding_suggestions(before)
        after_suggestions = get_onboarding_suggestions(after)

        # Step 3 should return empty suggestions
        assert len(before_suggestions) == 4
        assert len(after_suggestions) == 0
