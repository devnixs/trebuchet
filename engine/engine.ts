import { Solid } from "./models/solid";
import { Constraint } from "./models/constraint";

interface EngineSettings {
  solids: Solid[];
  constraints: Constraint[];
  
  timeStep: 0.1;
}

export class Engine {
  solids: Solid[];
  constraints: Constraint[];
    timeStep: number;
  constructor(settings: EngineSettings) {
    this.solids = settings.solids;
    this.constraints = settings.constraints;
    this.timeStep = settings.timeStep;
  }

  runOneStep(){
    
  }
}
