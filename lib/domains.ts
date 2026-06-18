export const DOMAINS = [
  "Agentic Architecture",
  "Tool Design & MCP",
  "Claude Code Configuration",
  "Prompt Engineering",
  "Context Management",
] as const;

export type Domain = (typeof DOMAINS)[number];

// Target weights for exam composition (sum ~= 1).
export const DOMAIN_WEIGHTS: Record<Domain, number> = {
  "Agentic Architecture": 0.27,
  "Tool Design & MCP": 0.18,
  "Claude Code Configuration": 0.2,
  "Prompt Engineering": 0.2,
  "Context Management": 0.15,
};

export const SCENARIOS = [
  "Customer Support",
  "Multi-Agent Research",
  "Code Generation",
  "CI/CD",
  "Document Processing",
  "General",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXAM_QUESTION_COUNT = 60;
export const EXAM_TIME_SECONDS = 120 * 60; // 120 minutes
export const BRUCIAPELO_TIME_SECONDS = 60;
export const PASSING_SCORE = 720;
export const SCORE_MIN = 100;
export const SCORE_MAX = 1000;
