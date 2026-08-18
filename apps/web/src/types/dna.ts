export interface DNADimension {
  name: string;
  present: boolean;
  quality: number;
  evidence_quote?: string | null;
  start_seconds?: number | null;
  end_seconds?: number | null;
  missing_reason?: string | null;
}

export interface TechnicalAnswerDNA {
  problem: DNADimension;
  approach: DNADimension;
  reasoning: DNADimension;
  implementation: DNADimension;
  tradeoff: DNADimension;
  validation: DNADimension;
  result: DNADimension;
  completeness_score: number;
  missing_dimensions: string[];
}

export interface BehavioralAnswerDNA {
  situation: DNADimension;
  task: DNADimension;
  action: DNADimension;
  result: DNADimension;
  ownership: DNADimension;
  learning: DNADimension;
  completeness_score: number;
  missing_dimensions: string[];
}

export type CompetencyCoverageStatus = "TESTED" | "DEMONSTRATED" | "WEAK_EVIDENCE" | "NOT_TESTED";

export interface CompetencyItemEvaluation {
  competency_name: string;
  status: CompetencyCoverageStatus;
  score: number;
  evidence_snippets: string[];
  question_sequence_numbers: number[];
  explanation: string;
}

export interface SessionCompetencyCoverage {
  interview_id: string;
  total_competencies: number;
  demonstrated_count: number;
  weak_evidence_count: number;
  not_tested_count: number;
  coverage_percentage: number;
  competencies: CompetencyItemEvaluation[];
}
