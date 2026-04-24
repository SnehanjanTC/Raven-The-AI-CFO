import React from 'react';
import {
  Calculator,
  Upload,
  MessageCircle,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OnboardingCardProps {
  currentStep: number;  // 1-3
  completedSteps: number[];  // array of completed step numbers
}

/**
 * OnboardingCard - 3-step onboarding progress tracker
 *
 * Features:
 * - Horizontal progress tracker with 3 steps
 * - Current step highlighted in green
 * - Completed steps show checkmark
 * - Contextual message based on current step
 * - Match existing card styling (dark mode, Tailwind, Framer Motion)
 */
const OnboardingCardInner: React.FC<OnboardingCardProps> = ({
  currentStep,
  completedSteps = [],
}) => {
  const steps = [
    {
      number: 1,
      label: 'Share your numbers',
      icon: Calculator,
      description: 'Tell us your revenue, expenses, and cash balance',
    },
    {
      number: 2,
      label: 'Add transactions',
      icon: Upload,
      description: 'Upload a bank statement or add transactions manually',
    },
    {
      number: 3,
      label: 'Ask your first question',
      icon: MessageCircle,
      description: 'Let me analyze your data and help you make decisions',
    },
  ];

  const getStepMessage = (): string => {
    if (currentStep === 1) {
      return 'Start by sharing your 3 key numbers. Takes just 30 seconds!';
    } else if (currentStep === 2) {
      return 'Upload your bank statement CSV to unlock powerful analysis.';
    } else if (currentStep === 3) {
      return 'Ask me anything about your finances. I\'m your AI CFO.';
    }
    return 'Get started with your financial data.';
  };

  const isCompleted = (stepNum: number): boolean => completedSteps.includes(stepNum);
  const isCurrent = (stepNum: number): boolean => stepNum === currentStep;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm"
    >
      {/* Steps Container */}
      <div className="flex gap-4 mb-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isStepCompleted = isCompleted(step.number);
          const isStepCurrent = isCurrent(step.number);

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="flex-1 relative"
            >
              {/* Step container */}
              <div className="flex flex-col items-center gap-2">
                {/* Icon circle */}
                <motion.div
                  whileHover={isStepCurrent || isStepCompleted ? { scale: 1.05 } : {}}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center relative',
                    'border-2 transition-all duration-300',
                    isStepCurrent
                      ? 'bg-tertiary/20 border-tertiary'
                      : isStepCompleted
                      ? 'bg-tertiary/10 border-tertiary'
                      : 'bg-white/[0.04] border-white/[0.12]'
                  )}
                >
                  {isStepCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <Check className="w-5 h-5 text-tertiary" />
                    </motion.div>
                  ) : (
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        isStepCurrent ? 'text-tertiary' : 'text-slate-500'
                      )}
                    />
                  )}

                  {/* Pulse indicator for current step */}
                  {isStepCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-tertiary opacity-0"
                    />
                  )}
                </motion.div>

                {/* Step label and description */}
                <div className="text-center min-h-12 flex flex-col justify-center">
                  <p
                    className={cn(
                      'text-xs font-semibold transition-colors duration-300',
                      isStepCurrent || isStepCompleted
                        ? 'text-slate-100'
                        : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {step.number === 1 && '3 numbers'}
                    {step.number === 2 && 'CSV or manual'}
                    {step.number === 3 && 'Ask away'}
                  </p>
                </div>
              </div>

              {/* Connector line (between steps) */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[calc(50%+20px)] top-5 w-[calc(100%-40px)] h-0.5 -z-10',
                    'transition-colors duration-300',
                    isStepCompleted || (isStepCurrent && idx < currentStep - 1)
                      ? 'bg-tertiary'
                      : 'bg-white/[0.12]'
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Message section */}
      <div className="pt-4 border-t border-white/[0.08]">
        <p className="text-sm text-slate-300 leading-relaxed">
          {getStepMessage()}
        </p>
      </div>
    </motion.div>
  );
};

export const OnboardingCard = React.memo(OnboardingCardInner);
export default OnboardingCard;
