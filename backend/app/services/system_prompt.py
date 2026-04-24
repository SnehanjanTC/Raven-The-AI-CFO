"""
System prompt builder for Claude AI CFO persona.
Constructs the base system prompt and injects user financial context.
"""

from typing import Optional


def build_system_prompt(user_context: Optional[dict] = None, financial_snapshot: Optional[str] = None) -> str:
    """
    Build the system prompt for Claude acting as an AI CFO.

    Args:
        user_context: Optional dict with financial data to inject (legacy, for backwards compatibility):
            - mrr: Monthly recurring revenue
            - burn_rate: Monthly burn in dollars
            - cash_balance: Current cash
            - runway_months: Estimated months of runway
            - company_name: User's company name
            - startup_stage: Startup stage (pre-revenue, early, scaling, growth)

        financial_snapshot: Optional pre-formatted financial context string from context_builder.
                           Takes precedence over user_context if provided.

    Returns:
        The complete system prompt string.
    """

    base_prompt = """You are an AI CFO for solo founders and early-stage startups. Expert in startup finance, burn rate, and growth metrics.

Core role:
- Provide direct, data-driven financial guidance
- Help understand metrics and their implications
- Suggest actionable financial decisions
- Run quick what-if scenarios
- Flag risks early, celebrate milestones

Tone: Direct, concise, like talking to a smart friend who happens to be a CFO. Data-driven; cite numbers.

Response format:
1. Answer directly (1-3 sentences)
2. Provide supporting data if relevant
3. End with 3-4 follow-up suggestions as JSON array: ["question1", "question2", "question3"]

Tools: get_metrics, run_scenario, get_transactions, generate_report
- Use tools to fetch real data
- Present in structured cards
- Always cite actual numbers

Never make up metrics, ignore cash constraints, or use placeholder language when exact data is available.
"""

    # Inject financial snapshot if provided (from context_builder)
    if financial_snapshot:
        base_prompt += f"\n\n{financial_snapshot}"
    # Fall back to legacy user_context
    elif user_context:
        context_section = "\n\nCurrent user financial context:"

        if user_context.get("company_name"):
            context_section += f"\n- Company: {user_context['company_name']}"

        if user_context.get("startup_stage"):
            context_section += f"\n- Stage: {user_context['startup_stage']}"

        if user_context.get("mrr") is not None:
            context_section += f"\n- MRR: ${user_context['mrr']:,.0f}"

        if user_context.get("cash_balance") is not None:
            context_section += f"\n- Cash balance: ${user_context['cash_balance']:,.0f}"

        if user_context.get("burn_rate") is not None:
            context_section += f"\n- Monthly burn: ${user_context['burn_rate']:,.0f}"

        if user_context.get("runway_months") is not None:
            context_section += f"\n- Runway: {user_context['runway_months']} months"

        base_prompt += context_section

    return base_prompt
