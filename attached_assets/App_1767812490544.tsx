
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { WorldObject, LogEntry, SimulationState, KnowledgeEntry, GroundingLink, ConstructionPlan, KnowledgeCategory } from './types';
import { decideNextAction, AIActionResponse } from './services/aiLogic';

const INITIAL_GOAL = "Synthesize Sustainable Modular Settlement";

const getTerrainHeight = (x: number, z: number) => {
  return Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.2;
};

function App() {
  const [state, setState] = useState<SimulationState>({
    objects: [],
    logs: [{ id: '1', type: 'success', message: 'Architect-OS Online. Neural pathways clear.', timestamp: Date.now() }],
    knowledgeBase: [],
    currentGoal: INITIAL_GOAL,
    learningIteration: 0,
    networkStatus: 'uplink_active',
    activePlan: undefined,
    progression: {
      complexityLevel: 1,
      structuresCompleted: 0,
      totalBlocks: 0,
      unlockedBlueprints: ['Core Protocol', 'Adaptive Clustering']
    },
    ui: { showStats: true, showKnowledge: true, showLogs: true, showPlanning: true }
  });

  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [currentTask, setCurrentTask] = useState<string>("Analyzing Local Sector...");
  const [taskProgress, setTaskProgress] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'action') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(), type, message, timestamp: Date.now() }]
    }));
  }, []);

  const runSimulationStep = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setState(prev => ({ ...prev, networkStatus: 'syncing' }));
    setTaskProgress(5);

    // Initial deterministic logs to show "immediate" feedback
    addLog("Initiating Neural Uplink...", "thinking");
    await new Promise(r => setTimeout(r, 400));
    addLog("Accessing local sector topology map...", "thinking");
    await new Promise(r => setTimeout(r, 600));
    setTaskProgress(20);

    try {
      const decision: AIActionResponse = await decideNextAction(
        state.logs, 
        state.objects, 
        state.currentGoal, 
        state.knowledgeBase,
        getTerrainHeight,
        state.activePlan
      );
      
      setTaskProgress(40);
      
      // Stream AI reasoning steps line by line
      if (decision.reasoningSteps && decision.reasoningSteps.length > 0) {
        for (const step of decision.reasoningSteps) {
          addLog(`[REASONING]: ${step}`, 'thinking');
          await new Promise(r => setTimeout(r, 600)); // Simulate thinking per line
        }
      }

      setCurrentTask(decision.taskLabel);
      setTaskProgress(70);

      if (decision.action === 'PLACE') {
        let nextPlan = decision.plan || state.activePlan;
        const targetType = decision.objectType || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].type : 'modular_unit');
        let targetPos = decision.position || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].position : [0,0,0]);

        targetPos = [targetPos[0], getTerrainHeight(targetPos[0], targetPos[2]), targetPos[2]];

        addLog(`Synthesis Confirmed: Deploying ${targetType} unit.`, 'success');
        setAvatarPos(targetPos as [number, number, number]);
        
        await new Promise(r => setTimeout(r, 800));
        setTaskProgress(100);

        const newObj: WorldObject = {
          id: Math.random().toString(),
          type: targetType as any,
          position: targetPos as [number, number, number],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          timestamp: Date.now()
        };

        setState(prev => {
          let updatedPlan = decision.plan || prev.activePlan;
          if (updatedPlan) {
            const steps = [...updatedPlan.steps];
            steps[updatedPlan.currentStepIndex].status = 'completed';
            
            const nextIdx = updatedPlan.currentStepIndex + (decision.plan ? 0 : 1);
            if (nextIdx < steps.length) {
              steps[nextIdx].status = 'active';
              updatedPlan = { ...updatedPlan, steps, currentStepIndex: nextIdx };
            } else {
              updatedPlan = undefined;
              addLog("Strategic Objective Achieved.", "success");
            }
          }

          const newKnowledge = [...prev.knowledgeBase];
          const titleCandidate = decision.learningNote?.split(':')[0]?.trim() || "Synthesis Logic";
          
          if (!newKnowledge.find(k => k.title === titleCandidate)) {
            newKnowledge.push({
              id: Math.random().toString(),
              title: titleCandidate,
              description: decision.learningNote,
              category: decision.knowledgeCategory,
              iteration: prev.learningIteration,
              timestamp: Date.now(),
              links: decision.groundingLinks
            });
          }

          return {
            ...prev,
            objects: [...prev.objects, newObj],
            learningIteration: prev.learningIteration + 1,
            activePlan: updatedPlan,
            knowledgeBase: newKnowledge,
            progression: {
              ...prev.progression,
              totalBlocks: prev.progression.totalBlocks + 1,
              complexityLevel: Math.floor((prev.progression.totalBlocks + 1) / 5) + 1,
              structuresCompleted: prev.progression.structuresCompleted + (targetType === 'modular_unit' ? 1 : 0)
            }
          };
        });
      } else if (decision.action === 'MOVE' && decision.position) {
        setAvatarPos([decision.position[0], getTerrainHeight(decision.position[0], decision.position[2]), decision.position[2]]);
        addLog(`Relocating: Optimizing sector positioning.`, 'action');
      } else {
        addLog(`Simulation standby: ${decision.reason}`, 'action');
      }
    } catch (e) {
      addLog("Critical neural desync. Link unstable.", "error");
    } finally {
      setIsProcessing(false);
      setTaskProgress(0);
      setState(prev => ({ ...prev, networkStatus: 'uplink_active' }));
      setCurrentTask(isAuto ? "Scanning Topology..." : "Standby");
    }
  }, [isProcessing, state, isAuto, addLog]);

  useEffect(() => {
    if (isAuto && !isProcessing) {
      const t = setTimeout(runSimulationStep, 4500);
      return () => clearTimeout(t);
    }
  }, [isAuto, isProcessing, runSimulationStep]);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.logs]);

  return (
    <div className="relative w-full h-screen overflow-hidden text-slate-200 bg-slate-950 font-sans italic-font">
      {/* HUD CONTROLS */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3 items-end">
        <div className="flex bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-2xl">
          {['Stats', 'Knowledge', 'Planning', 'Logs'].map((k) => (
            <button key={k} onClick={() => setState(p => ({ ...p, ui: { ...p.ui, [`show${k}`]: !p.ui[`show${k}` as keyof SimulationState['ui']] } }))}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.ui[`show${k}` as keyof SimulationState['ui']] ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white'}`}>
              {k === 'Knowledge' ? 'Neural' : k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${state.networkStatus === 'syncing' ? 'bg-sky-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Architect Uplink: {state.networkStatus === 'syncing' ? 'SYNC' : 'READY'}</span>
        </div>
      </div>

      {/* PLANNING HUD */}
      {state.ui.showPlanning && state.activePlan && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-[450px] p-8 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em]">Current Objective</span>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{state.activePlan.objective || "Strategic Synthesis"}</h2>
          </div>
          <div className="space-y-3">
            {state.activePlan.steps.map((step, idx) => (
              <div key={idx} className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${step.status === 'active' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : step.status === 'completed' ? 'bg-white/5 border-white/10 opacity-40' : 'bg-transparent border-white/5 opacity-20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${step.status === 'active' ? 'bg-emerald-400 animate-pulse' : step.status === 'completed' ? 'bg-white' : 'bg-white/20'}`} />
                  <span className="text-xs font-bold tracking-tight">{step.label}</span>
                </div>
                <span className="text-[9px] font-mono text-white/30">[{step.type.toUpperCase()}]</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS PANEL */}
      {state.ui.showStats && (
        <div className="absolute top-8 left-8 z-10 w-80 p-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[35px] shadow-2xl animate-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1.5 h-14 bg-sky-400 rounded-full shadow-[0_0_20px_#38bdf8]" />
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white leading-none">OS.ALPHA</h1>
              <div className="text-[10px] font-mono text-sky-400 tracking-[0.3em] mt-1 uppercase">Complexity: Tier {state.progression.complexityLevel}</div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block mb-2">Architectural State</span>
              <p className="text-sm font-bold text-sky-100">{currentTask}</p>
              {isProcessing && <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${taskProgress}%` }} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><div className="text-[8px] font-black text-white/20 uppercase mb-1">Synthesis</div><div className="text-2xl font-mono font-bold text-white">{state.progression.totalBlocks}</div></div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><div className="text-[8px] font-black text-white/20 uppercase mb-1">Knowledge</div><div className="text-2xl font-mono font-bold text-white">{state.knowledgeBase.length}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* NEURAL DB PANEL */}
      {state.ui.showKnowledge && (
        <div className="absolute top-24 right-8 z-10 w-[440px] max-h-[75vh] flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700">
          <div className="p-8 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <span className="text-sm font-black uppercase text-white tracking-[0.3em]">Neural Repository</span>
            <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1] animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {state.knowledgeBase.length > 0 && <KnowledgeGraph entries={state.knowledgeBase} width={370} height={240} />}
            {state.knowledgeBase.length === 0 ? (
              <div className="py-24 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Uplink...</div>
            ) : (
              state.knowledgeBase.slice().reverse().map((k) => (
                <div key={k.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/20 transition-all duration-300">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{k.category}</span>
                    <span className="text-[8px] font-mono text-white/20">#{k.iteration}</span>
                  </div>
                  <h4 className="text-xs font-black text-white mb-2 uppercase italic">{k.title}</h4>
                  <p className="text-[11px] leading-relaxed text-white/50">{k.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* LOGS PANEL */}
      {state.ui.showLogs && (
        <div className="absolute bottom-8 left-8 z-10 w-[480px] h-[320px] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[35px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-700 flex flex-col">
          <div className="px-8 py-5 border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Direct Activity Link</div>
          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-8 space-y-3 font-mono text-[10px]">
            {state.logs.map(log => (
              <div key={log.id} className={`flex gap-4 p-3 rounded-xl transition-all duration-300 ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : log.type === 'error' ? 'bg-rose-500/10 text-rose-300' : log.type === 'thinking' ? 'bg-sky-500/5 text-sky-400/80 italic border-l-2 border-sky-400/30 ml-2' : 'bg-white/5 text-white/50'}`}>
                <span className="opacity-30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="font-bold">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D RENDERER */}
      <div className="w-full h-full">
        <SimulationCanvas objects={state.objects} avatarPos={avatarPos} avatarTarget={null} activePlan={state.activePlan} />
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-4">
        <div className="bg-black/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 flex">
          <button onClick={() => setIsAuto(true)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAuto ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'text-white/30'}`}>Auto-Pilot</button>
          <button onClick={() => setIsAuto(false)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAuto ? 'bg-white text-slate-950 shadow-xl shadow-white/10' : 'text-white/30'}`}>Manual</button>
        </div>
        <button onClick={runSimulationStep} disabled={isProcessing} className="px-12 h-16 bg-white hover:bg-sky-50 text-slate-950 rounded-[20px] font-black uppercase italic tracking-tighter transition-all shadow-2xl disabled:opacity-50 active:scale-95">Initiate Synthesis</button>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(2,6,23,0.9)_100%)] opacity-80" />
    </div>
  );
}

export default App;
