
import { WorldObject, LogEntry, WorldObjectType, GroundingLink, ConstructionPlan, KnowledgeEntry, KnowledgeCategory } from "../types";

export interface AIActionResponse {
  action: 'PLACE' | 'MOVE' | 'WAIT';
  objectType?: WorldObjectType;
  position?: [number, number, number];
  reason: string;
  reasoningSteps: string[];
  learningNote: string;
  knowledgeCategory: KnowledgeCategory;
  taskLabel: string;
  groundingLinks?: GroundingLink[];
  plan?: ConstructionPlan;
}

export async function decideNextAction(
  history: LogEntry[],
  worldObjects: WorldObject[],
  currentGoal: string,
  knowledgeBase: KnowledgeEntry[],
  terrainHeightMap: (x: number, z: number) => number,
  activePlan?: ConstructionPlan
): Promise<AIActionResponse> {
  const currentPos = worldObjects.length > 0 ? worldObjects[worldObjects.length - 1].position : [0, 0, 0];
  
  const elevationSamples = [];
  for (let x = -6; x <= 6; x += 3) {
    for (let z = -6; z <= 6; z += 3) {
      const h = terrainHeightMap(currentPos[0] + x, currentPos[2] + z);
      elevationSamples.push(`[${(currentPos[0] + x).toFixed(1)}, ${(currentPos[2] + z).toFixed(1)}]: elev=${h.toFixed(2)}`);
    }
  }

  const prompt = `
    GOAL: ${currentGoal}
    ELEVATION_DATA: ${elevationSamples.join(', ')}
    KNOWLEDGE_COUNT: ${knowledgeBase.length}
    PLAN_ACTIVE: ${!!activePlan}
    ${activePlan ? `CURRENT_STEP: ${activePlan.steps[activePlan.currentStepIndex].label}` : 'INITIATING NEW SEQUENCE...'}
    Perform spatial reasoning and return synthesis command.
  `;

  try {
    const res = await fetch("/api/simulation/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, currentGoal, knowledgeBase: knowledgeBase.slice(-10) })
    });

    if (!res.ok) throw new Error("Simulation backend error");
    return await res.json();
  } catch (error) {
    console.error("Architect-OS Neural Fault:", error);
    return {
      action: 'WAIT',
      reason: "Neural desync. Re-aligning logic gates.",
      reasoningSteps: ["Connection failure detected", "Re-routing synthesis request", "Flushing instruction cache"],
      learningNote: "Logic gate misalignment detected during planning phase.",
      knowledgeCategory: 'Synthesis',
      taskLabel: "Recalibrating..."
    };
  }
}
