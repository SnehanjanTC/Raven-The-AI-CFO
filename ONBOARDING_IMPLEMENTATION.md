# Raven Conversational Onboarding Implementation

## Overview

Created a complete conversational onboarding experience for new Raven users. The system is **chat-first**, meaning everything happens through natural conversation — no setup wizards, forms, or settings pages.

## Architecture

### User Journey

1. **Step 0 (Brand New)**: User lands with no data
   - AI greets them warmly
   - Shows onboarding progress card (3 steps)
   - Offers choices: upload CSV, type numbers, see demo, or learn what we do

2. **Step 1 (Basic Metrics)**: User enters 3 key numbers
   - Monthly revenue, monthly expenses, cash in bank
   - AI acknowledges and shows metrics card
   - Suggests uploading CSV for deeper analysis

3. **Step 2 (Transactions)**: User uploads transactions or adds them manually
   - AI proactively analyzes: top expenses, burn rate, runway
   - This is the hook moment
   - Ready for real questions

4. **Step 3 (Engaged)**: User asks their first real question
   - Onboarding complete
   - Normal conversation mode with contextual suggestions

## Files Created

### Backend

#### `backend/app/services/onboarding.py`

**Functions:**

- `get_onboarding_state(supabase_url, supabase_key, user_id) -> dict`
  - Queries transactions, metrics, conversations tables
  - Returns onboarding step (0-3) and progress flags
  - Determines if user is brand new

- `get_onboarding_system_prompt_addition(state: dict) -> str`
  - Returns step-specific system prompt injection
  - Step 0: Warm greeting, ask for numbers or demo
  - Step 1: Acknowledge numbers, suggest CSV upload
  - Step 2: Proactively analyze data, flag interesting patterns
  - Step 3+: Empty (normal mode)

- `get_onboarding_suggestions(state: dict) -> list[str]`
  - Returns contextual suggestion chips for each step
  - Step 0: ["Upload a bank statement", "I'll type in my numbers", "Show me a demo first", "What can you do?"]
  - Step 1: ["Upload transactions CSV", "What's my runway?", "Add an expense", "Show me a scenario"]
  - Step 2: ["What's my burn rate trend?", "Any expenses to watch?", "Draft a board update", "Run a hiring scenario"]

#### `backend/app/services/demo_data.py`

**Functions:**

- `get_demo_metrics() -> dict`
  - Returns realistic SaaS startup metrics: $24.2k MRR, $18.4k burn, $252k cash, 13.7mo runway

- `get_demo_transactions() -> list[dict]`
  - Returns ~20 realistic transactions across 3 months
  - Includes: Stripe revenue, AWS, payroll, SaaS tools, marketing
  - Perfect for exploring the product without real data

- `seed_demo_data(supabase_url, supabase_key, user_id) -> dict`
  - Inserts all demo transactions into user's tables
  - Returns success status and count

- `clear_demo_data(supabase_url, supabase_key, user_id) -> dict`
  - Deletes all demo transactions
  - Called when user says "clear demo data" or is ready for real data

### Frontend

#### `src/components/cards/OnboardingCard.tsx`

Visual progress tracker showing 3 steps:
1. **Share your numbers** (calculator icon)
2. **Add transactions** (upload icon)
3. **Ask your first question** (message icon)

Features:
- Current step highlighted in green with pulse animation
- Completed steps show checkmark
- Connector lines between steps
- Contextual message below steps
- Responsive horizontal layout
- Framer Motion animations

**Props:**
- `currentStep: number` (1-3)
- `completedSteps: number[]` (array of completed step numbers)

#### Updated Files

**`src/components/cards/index.ts`**
- Exported OnboardingCard

**`src/components/chat/MessageRenderer.tsx`**
- Added handling for `onboarding` card type
- Added handling for `demo_loaded` card type (shows insight nudge)
- Imported OnboardingCard

**`src/components/chat/ChatView.tsx`**
- Added `useState` for onboarding state
- On mount, calls `/api/v1/onboarding` endpoint to check state
- Shows onboarding-specific suggestion chips
- Displays onboarding progress card in welcome state

### Backend API

#### Updated `backend/app/api/v1/endpoints/chat.py`

**New Endpoint:**

- `GET /api/v1/onboarding`
  - Returns current onboarding state and contextual suggestions
  - Response format:
    ```json
    {
      "state": {
        "is_new_user": bool,
        "has_metrics": bool,
        "has_transactions": bool,
        "has_conversations": bool,
        "onboarding_step": 0-3
      },
      "suggestions": ["chip1", "chip2", ...]
    }
    ```

**Tool Definitions Added:**

- `seed_demo_data`: Loads realistic demo transactions
- `clear_demo_data`: Removes demo data

**Tool Execution Updated:**

- Execute demo data tools via `execute_tool()` function
- Emit card events back to frontend

**System Prompt Logic:**

- `stream_chat_with_tools()` now:
  1. Checks onboarding state
  2. Injects onboarding-specific system prompt if needed
  3. Overrides suggestion chips with onboarding suggestions
  4. AI knows to give warm greeting, show progress card, offer demo

## User Experience Flow

### Scenario 1: Brand New User (Step 0)

```
Frontend shows: Welcome + OnboardingCard (step 1 highlighted)
Chips: ["Upload a bank statement", "I'll type in my numbers", "Show me a demo first", "What can you do?"]

User: "I'll type in my numbers"
AI: "Perfect! Let's start with 3 key metrics:
    1. What's your monthly recurring revenue (MRR)?
    2. What are your monthly expenses?
    3. How much cash do you have in the bank?
    
Once I have these, I can tell you a lot about your health."

User: "Revenue $10k, expenses $15k, cash $120k"
AI: [calls update_metrics tool]
AI: Shows metrics card + suggests uploading CSV for transaction analysis
```

### Scenario 2: Show Me a Demo

```
User: "Show me a demo first"
AI: [calls seed_demo_data tool]
AI: Shows demo_loaded card with insight nudge
AI: "I've loaded sample data from a realistic SaaS startup. Here's what you're working with:
    - $24.2k MRR
    - $18.4k monthly burn
    - $252k cash (14 months runway)
    
Let me analyze this for you..."
AI: [calls get_metrics tool, shows analysis]
AI: Proactively flags top expenses, burn rate trends, runway
```

### Scenario 3: Upload CSV (Step 1 → 2)

```
User: "Upload a bank statement"
Frontend: [Shows file picker]
User: [Selects CSV file]
Frontend: [Calls /api/v1/csv endpoint, triggers onboarding check]

ChatView detects step 2:
- OnboardingCard updates to step 2
- Suggestion chips change to ["What's my burn rate trend?", ...]
- Onboarding prompt changes to proactive analysis mode

AI: "Great! I've imported your transactions. Here's what stands out:
    - Top expenses: Payroll ($50k), AWS ($8k), SaaS tools ($2k)
    - Burn rate: $18.4k/month
    - Runway: 13.7 months
    - Margin trend: Improving 2% MoM"
```

## Integration Points

### Existing Systems

1. **Supabase Tables Used:**
   - `transactions` - for CSV import and demo data
   - `metrics` - future dedicated metrics table
   - `conversations` - to check if user has engaged

2. **Claude API:**
   - System prompt injection for onboarding context
   - Tool calling for `seed_demo_data`, `clear_demo_data`
   - Suggestion chips customization

3. **Chat Streaming:**
   - SSE format preserved
   - New card types: `onboarding`, `demo_loaded`
   - Existing card types still work

## Key Design Decisions

1. **No Forms, No Settings**
   - Everything through chat and natural conversation
   - Cards appear as AI responds, not as static UI

2. **Warm, Conversational Tone**
   - "Hey there!" instead of "Welcome to Raven"
   - Personal greeting with user's name
   - No corporate jargon

3. **Demo Data First**
   - Low-friction way to explore product
   - Real data = impressive features unlock
   - Easy transition: "clear demo data" when ready

4. **System Prompt Injection**
   - Onboarding context injected at runtime
   - AI knows which step user is on
   - Customizes first message and suggestions dynamically

5. **Progress Feedback**
   - Visual card shows 3 clear steps
   - Checkmarks for completed steps
   - Current step highlighted and pulsing

## Testing Scenarios

### Scenario 1: Brand New User
1. Create new account, go to chat
2. See onboarding card + special suggestions
3. Type "Show me a demo"
4. See demo data load, AI analyzes
5. Say "clear demo data" → back to step 0

### Scenario 2: User Enters Numbers
1. Start at step 0
2. Say "I'll type in my numbers"
3. Enter revenue/expenses/cash
4. Say "Upload CSV"
5. Upload test file
6. See proactive analysis → step 2

### Scenario 3: User with Data
1. Existing user with transactions
2. Load chat → step 2 or 3
3. See normal suggestions, no onboarding card
4. Chat flows naturally

## Future Enhancements

1. **Progress Persistence**
   - Save completion markers in DB
   - Show progress across sessions

2. **Multi-step Inputs**
   - Guided form-like experience through chat
   - "Next step: tell me about payroll"

3. **Scenario Examples**
   - "Show me what happens if I hire 2 engineers"
   - "What if revenue grows 20%?"

4. **Integration Tutorials**
   - "Connect to Stripe" → steps through OAuth
   - "Auto-import from X" → walkthroughs

5. **Contextual Help**
   - Glossary tooltips: "What's ARR?"
   - Help cards inline

## Files Modified/Created

### Created
- `/backend/app/services/onboarding.py` - Onboarding state detection
- `/backend/app/services/demo_data.py` - Demo data seeding
- `/src/components/cards/OnboardingCard.tsx` - Progress card component
- `/ONBOARDING_IMPLEMENTATION.md` - This document

### Modified
- `/backend/app/api/v1/endpoints/chat.py` - New endpoint + tool integration
- `/src/components/cards/index.ts` - Export OnboardingCard
- `/src/components/chat/MessageRenderer.tsx` - Handle onboarding card type
- `/src/components/chat/ChatView.tsx` - Check state on mount

## Deployment Checklist

- [ ] Supabase: Verify `conversations` table exists or create it
- [ ] Backend: Deploy onboarding.py and demo_data.py
- [ ] Backend: Update chat.py with new endpoint and tools
- [ ] Frontend: Deploy OnboardingCard component and updates
- [ ] Test: Walk through all 3 onboarding scenarios
- [ ] Monitor: Check logs for onboarding state detection
- [ ] Iterate: Gather user feedback on greeting messaging

## Messaging

The AI's first message for a brand new user should be something like:

> Hey [Name]! I'm your AI CFO. I help solo founders understand their financials and make better decisions.
>
> I work best when I know your numbers. We can get started in 3 steps:
>
> 1. **Share your numbers** - Just tell me your monthly revenue, expenses, and cash (takes 30 seconds)
> 2. **Add transactions** - Upload a bank CSV so I can see the details
> 3. **Ask your first question** - I'll analyze everything and give you insights
>
> Want to jump in, or [see a demo first]()?

This greeting is driven by the onboarding system prompt and uses the OnboardingCard to visualize progress.
