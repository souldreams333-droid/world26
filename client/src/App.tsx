
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
    ui: { showStats: true, showKnowledge: true, showLogs: true, showPlanning: true, showAPIs: false }
  });

  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 0]);
  const [apiStats, setApiStats] = useState<Record<string, { calls: number; lastStatus: string; latency: number }>>({
    "Mistral AI": { calls: 0, lastStatus: "Idle", latency: 0 },
    "Hugging Face": { calls: 0, lastStatus: "Idle", latency: 0 },
    "Replit DB": { calls: 0, lastStatus: "Idle", latency: 0 }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [currentTask, setCurrentTask] = useState<string>("Analyzing Local Sector...");
  const [taskProgress, setTaskProgress] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Load state from Replit DB on mount
  useEffect(() => {
    const loadState = async () => {
      const start = Date.now();
      try {
        const res = await fetch("/api/simulation/state");
        setApiStats(prev => ({
          ...prev,
          "Replit DB": { calls: prev["Replit DB"].calls + 1, lastStatus: res.ok ? "Success" : "Error", latency: Date.now() - start }
        }));
        if (res.ok) {
          const savedState = await res.json();
          if (savedState && savedState.objects) {
            setState(savedState);
            if (savedState.objects.length > 0) {
              setAvatarPos(savedState.objects[savedState.objects.length - 1].position);
            }
            addLog("Neural recovery complete. Resuming synthesis via Replit DB.", "success");
          }
        }
      } catch (error) {
        console.error("Error loading simulation state:", error);
      }
    };
    loadState();
  }, []);

  // Save state to Replit DB whenever it changes
  useEffect(() => {
    const saveState = async () => {
      const start = Date.now();
      try {
        const { ui, ...persistentState } = state;
        const res = await fetch("/api/simulation/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(persistentState)
        });
        setApiStats(prev => ({
          ...prev,
          "Replit DB": { calls: prev["Replit DB"].calls + 1, lastStatus: res.ok ? "Success" : "Error", latency: Date.now() - start }
        }));
      } catch (error) {
        console.error("Error saving simulation state:", error);
      }
    };
    if (state.objects.length > 0 || state.learningIteration > 0) {
      saveState();
    }
  }, [state.objects.length, state.learningIteration, state.currentGoal, state.activePlan]);
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
      const startMistral = Date.now();
      const decision: AIActionResponse = await decideNextAction(
        state.logs, 
        state.objects, 
        state.currentGoal, 
        state.knowledgeBase,
        getTerrainHeight,
        state.activePlan
      );
      setApiStats(prev => ({
        ...prev,
        "Mistral AI": { calls: prev["Mistral AI"].calls + 1, lastStatus: "Success", latency: Date.now() - startMistral }
      }));
      
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

        const newKnowledge: KnowledgeEntry = {
          id: Math.random().toString(),
          title: decision.taskLabel || "Synthesis Operation",
          description: decision.learningNote || decision.reason || "Architectural synthesis in progress.",
          category: decision.knowledgeCategory || "Synthesis",
          iteration: state.learningIteration,
          timestamp: Date.now(),
          links: decision.groundingLinks
        };

        setState(prev => {
          let updatedPlan = decision.plan || prev.activePlan;
          if (updatedPlan) {
            const steps = [...updatedPlan.steps];
            if (updatedPlan.currentStepIndex < steps.length) {
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
          }

          return {
            ...prev,
            objects: [...prev.objects, newObj],
            learningIteration: prev.learningIteration + 1,
            activePlan: updatedPlan,
            knowledgeBase: [...prev.knowledgeBase, newKnowledge],
            progression: {
              ...prev.progression,
              totalBlocks: (prev.progression.totalBlocks || 0) + 1,
              complexityLevel: Math.floor(((prev.progression.totalBlocks || 0) + 1) / 5) + 1,
              structuresCompleted: (prev.progression.structuresCompleted || 0) + (targetType === 'modular_unit' ? 1 : 0)
            }
          };
        });
      } else if (decision.action === 'MOVE' && decision.position) {
        setAvatarPos([decision.position[0], getTerrainHeight(decision.position[0], decision.position[2]), decision.position[2]]);
        addLog(`Relocating: Optimizing sector positioning.`, 'action');
        
        // Add movement to knowledge base
        const moveKnowledge: KnowledgeEntry = {
          id: Math.random().toString(),
          title: "Topological Adjustment",
          description: decision.reason || "Relocating to optimize synthesis efficiency.",
          category: "Environment",
          iteration: state.learningIteration,
          timestamp: Date.now()
        };
        setState(prev => ({
          ...prev,
          knowledgeBase: [...prev.knowledgeBase, moveKnowledge],
          learningIteration: (prev.learningIteration || 0) + 1
        }));
      } else {
        const reason = decision.reason || "Neural synthesis in progress...";
        addLog(`Simulation standby: ${reason}`, 'action');
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
          {['Stats', 'Knowledge', 'Planning', 'Logs', 'APIs'].map((k) => (
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
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-[450px] p-8 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em]">Strategic Objective</span>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{state.activePlan.objective || "Underworld Synthesis"}</h2>
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {state.activePlan.steps.map((step, idx) => (
              <div key={idx} className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${step.status === 'active' ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : step.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-white/5 border-white/5 opacity-40'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${step.status === 'active' ? 'bg-emerald-400 animate-pulse' : step.status === 'completed' ? 'bg-emerald-500' : 'bg-white/20'}`} />
                  <span className={`text-xs font-bold tracking-tight ${step.status === 'completed' ? 'line-through text-white/40' : 'text-white'}`}>{step.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{step.type.replace('_', ' ')}</span>
                  {step.status === 'completed' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </div>
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

      {/* API MONITOR PANEL */}
      {state.ui.showAPIs && (
        <div className="absolute bottom-8 right-[450px] z-10 w-80 p-8 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[35px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-white tracking-[0.3em]">System Uplink Monitor</span>
          </div>
          <div className="space-y-4">
            {Object.entries(apiStats).map(([name, stats]) => (
              <div key={name} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <div className="text-[9px] font-black text-white/40 uppercase mb-1 tracking-widest">{name}</div>
                  <div className="text-xs font-bold text-white">{stats.lastStatus}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono font-bold text-sky-400">{stats.latency}ms</div>
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Calls: {stats.calls}</div>
                </div>
              </div>
            ))}
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
        <button 
          onClick={() => window.location.href = "/api/download-app"}
          className="px-6 h-16 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-[20px] font-black uppercase italic tracking-tighter transition-all shadow-2xl active:scale-95 flex items-center gap-3"
          title="Download Full Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <span className="hidden sm:inline">Export</span>
        </button>
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
