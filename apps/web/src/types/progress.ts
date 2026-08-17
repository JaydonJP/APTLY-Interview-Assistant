export interface TopicProgress {
  id: string;
  name: string;
  category: string;
  attempts: number;
  correct_attempts: number;
  average_score: number;
  mastery_score: number;
  last_score: number;
  last_seen_at: string;
}

export interface KnowledgeEdge {
  id: string;
  source_topic_id: string;
  target_topic_id: string;
  edge_type: string;
  weight: number;
}

export interface LearnerProgress {
  learner_id: string;
  sessions_completed: number;
  answers_reviewed: number;
  average_score: number;
  recommended_difficulty: "easy" | "medium" | "hard" | string;
  topics: TopicProgress[];
  edges: KnowledgeEdge[];
}
