export type CompletionStatus = 'complete' | 'reflection_failed' | 'reflection_pending';

export interface AnalyticsMetadata {
  userId?: string;
  sessionId?: string;
  emotionalState?: string;
  echoWordCount?: number;
  reflectionWordCount?: number;
  aiGenerationTimeMs?: number;
  isFirstEcho?: boolean;
  timestamp?: string;
  completionStatus?: CompletionStatus;
  providerModelVersion?: string;
  promptVersion?: string;
  reflectionStyleVersion?: string;
  requestTimedOut?: boolean;
  outputTruncated?: boolean;
  outputRegenerated?: boolean;
  insightCategory?: string;
}

const generateSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
};

const currentSessionId = generateSessionId();

export const trackEvent = (eventName: string, metadata?: Partial<AnalyticsMetadata>) => {
  const eventPayload = {
    eventName,
    metadata: {
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    console.log(`[Altheara Analytics] ${eventName}`, JSON.stringify(eventPayload, null, 2));
  }
  
  // Future: Plug in real analytics provider here
};
