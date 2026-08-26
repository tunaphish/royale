import { Technique } from "./technique";

export type ActiveTechnique = {
    technique: Technique;
    amount: number;
}

export type Combatant = {
    health: number;
    maxHealth: number;
    block: number;
    activeTechniques: ActiveTechnique[];
}