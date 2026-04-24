# Raven Onboarding - Quick Reference

## What Was Built

A **conversational, progressive onboarding** for new Raven users that guides them through 3 steps entirely through chat, with no forms or setup wizards.

## The 4 Onboarding Steps

| Step | Trigger | System Prompt | Suggestions | What AI Does |
|------|---------|---------------|-------------|---|
| **0** | Brand new (no data) | Warm greeting + explain how to get started | Upload CSV, Type numbers, Show demo, What can you do? | Greets warmly, asks for 3 numbers or suggests demo |
| **1** | Has metrics (entered numbers) | Acknowledge their metrics, suggest CSV | Upload CSV, What's runway?, Add expense, Scenario | Shows their numbers, nudges to upload transactions |
| **2** | Has transactions (uploaded CSV) | Proactively analyze transactions (HOOK) | Burn rate trend?, Expenses to watch?, Board update, Scenario | Analyzes top expenses, burn, runway - makes product shine |
| **3** | Has conversation (asked question) | Normal CFO mode | AI-generated contextual suggestions | Regular AI CFO interaction |

## Files Created

```
backend/app/services/
├── onboarding.py (160 lines)
│   ├── get_onboarding_state() → dict
│   ├── get_onboarding_system_prompt_addition() → str
│   └── get_onboarding_suggestions() → list[str]
│
└── demo_data.py (230 lines)
    ├── get_demo_metrics() → dict
    ├── get_demo_transactions() → list[dict]
    ├── seed_demo_data() → dict
    └── clear_demo_data() → dict

src/components/cards/
└── OnboardingCard.tsx (180 lines)
    ├── Shows 3-step progress tracker
    ├── Current step highlighted + pulsing
    └── Completed steps show checkmark
```

## How It Works

### 1. User Lands on Chat (New User)

```
Frontend: ChatView.tsx
  → On mount, calls GET /api/v1/onboarding
  → Receives { state: {...}, suggestions: [...] }
  → Sets onboarding state
  → Shows welcome with contextual suggestions
```

### 2. AI Gets Context

```
Backend: stream_chat_with_tools()
  → Checks get_onboarding_state()
  → If step 0-2, injects onboarding system prompt
  → Sets suggestion chips to onboarding suggestions
  → Claude knows exactly what to say
```

### 3. Claude Responds with Context

```
Claude (AI CFO):
  "Hey [Name]! I'm your AI CFO. Let's get started in 3 steps..."
  → Shows OnboardingCard (step 1 highlighted)
  → Gives personalized greeting
  → Offers demo or asks for numbers
```

### 4. User Chooses Path

**Path A: Upload CSV**
```
User: "Upload a bank statement"
Frontend: CSV import flow
  → Inserts transactions into DB
  → ChatView detects step changed → 2
  → Suggestions update
  → OnboardingCard advances

AI: [Proactively analyzes] 
  "Your top expenses are..."
```

**Path B: Show Demo**
```
User: "Show me a demo"
Claude: [Calls seed_demo_data tool]
  → Inserts 20 realistic transactions
  → Returns demo_loaded card

AI: [Analyzes demo data]
  "I've loaded sample data. Your MRR is $24.2k..."
  → Shows real metrics
  → Demonstrates product value

User: "clear demo data" 
  → Removes demo, back to step 0
```

**Path C: Type Numbers**
```
User: "I'll type in my numbers"
AI: Asks for revenue, expenses, cash
User: Types numbers
Claude: [Calls update_metrics tool]
  → Stores numbers
  → Step → 1
  → Suggests CSV upload
```

## Key Functions

### Backend

**`get_onboarding_state(supabase_url, key, user_id)`**
```python
Returns:
{
  "is_new_user": bool,
  "has_metrics": bool,
  "has_transactions": bool,
  "has_conversations": bool,
  "onboarding_step": 0-3
}
```

**`get_onboarding_system_prompt_addition(state)`**
```python
Returns: String with step-specific instructions for Claude
  Step 0: "Warm greeting. Ask for numbers or demo."
  Step 1: "Acknowledge numbers. Suggest CSV."
  Step 2: "Analyze transactions proactively."
  Step 3+: "" (empty, no onboarding)
```

**`get_onboarding_suggestions(state)`**
```python
Returns: ["suggestion1", "suggestion2", ...]
  Step 0: ["Upload CSV", "Type numbers", "Demo", "What can you do?"]
  Step 1: ["Upload CSV", "Runway?", "Add expense", "Scenario"]
  Step 2: ["Burn rate?", "Expenses?", "Board update", "Scenario"]
```

### Frontend

**`OnboardingCard`**
```typescript
Props:
  currentStep: number (1-3)
  completedSteps: number[] ([1, 2] etc)

Shows:
  • 3 horizontal steps with icons
  • Connector lines between steps
  • Current step highlighted in green + pulsing
  • Completed steps with checkmark
  • Contextual message below
```

## API Endpoint

**`GET /api/v1/onboarding`**
```
Response:
{
  "state": {
    "is_new_user": true,
    "has_metrics": false,
    "has_transactions": false,
    "has_conversations": false,
    "onboarding_step": 0
  },
  "suggestions": ["Upload a bank statement", "I'll type in my numbers", ...]
}
```

## New Tools in Claude

**`seed_demo_data`**
- Loads ~20 realistic transactions
- Creates demo user data
- Called when user says "show me a demo"

**`clear_demo_data`**
- Removes all demo transactions
- Called when user says "clear demo data"

## Integration Points

**Supabase Tables**
- `transactions` - Read/write for CSV and demo data
- `conversations` - Read to check engagement

**Claude API**
- System prompt customization per step
- Tool calling for demo data management
- Suggestion chip generation

**Chat Streaming**
- New card type: "onboarding" → renders OnboardingCard
- New card type: "demo_loaded" → shows insight nudge
- All existing cards still work

## Testing Checklist

```
[ ] New user sees greeting + onboarding card
[ ] User says "Show demo" → loads demo data
[ ] User says "clear demo" → removes demo
[ ] User uploads CSV → progresses to step 2
[ ] User asks question → goes to step 3
[ ] Suggestion chips change per step
[ ] Existing users see no onboarding
[ ] All existing features still work
```

## Deployment

1. Deploy `backend/app/services/onboarding.py`
2. Deploy `backend/app/services/demo_data.py`
3. Update `backend/app/api/v1/endpoints/chat.py`
4. Deploy `src/components/cards/OnboardingCard.tsx`
5. Update `src/components/chat/MessageRenderer.tsx`
6. Update `src/components/chat/ChatView.tsx`
7. Update `src/components/cards/index.ts`
8. Restart backend
9. Rebuild frontend
10. Test new user flow

## Rollback

If needed:
1. Remove GET /onboarding endpoint from chat.py
2. Remove onboarding state check from ChatView.tsx
3. Remove onboarding imports
4. Chat works normally without onboarding

**Important**: Changes are non-breaking. System gracefully degrades if onboarding fails.

## What Users See

### Brand New
```
[🤖 Your AI CFO]
"Hey Snehanjan! I'm your AI CFO..."

[Progress Card showing 3 steps]
Step 1: Share your numbers (highlighted)
Step 2: Add transactions
Step 3: Ask your first question

["Upload bank statement"] ["I'll type in numbers"] ["Show demo"] ["What can you do?"]
```

### After Upload
```
[AI analyzes]
"Great! Here's what I see:
- Top expense: Payroll ($12k)
- Burn rate: $18.4k/month
- Runway: 14 months"

[Progress Card shows step 2 highlighted]

["Burn rate trend?"] ["Any expenses to watch?"] ["Draft board update"] ["Run scenario"]
```

## Common Customizations

**Change greeting**: Update `get_onboarding_system_prompt_addition()` Step 0 text

**Change suggestions**: Update `get_onboarding_suggestions()` arrays

**Change demo data**: Edit `get_demo_transactions()` list

**Change progress card appearance**: Edit `OnboardingCard.tsx` styling

**Change when onboarding ends**: Modify step detection in `get_onboarding_state()`

## Performance Notes

- Onboarding state check is ~2 API calls to Supabase (minimal)
- Demo data seeding is async (20 inserts in parallel)
- All operations have error handling and timeouts
- No blocking calls in chat flow
- Graceful degradation if Supabase unavailable

## Success Metrics

- Track step progression (0→1→2→3)
- Time to first question (goal: < 2 minutes)
- Demo data engagement (% who try demo)
- CSV upload rate after onboarding
- User retention at each step
