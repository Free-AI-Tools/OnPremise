import React, { useState } from 'react';
import { Plus, Puzzle, Settings } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const SkillsManagerView: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([
    {
      id: 's1',
      name: 'Trip Planner',
      description: 'Helps plan itineraries with local context.',
      enabled: true,
    },
    {
      id: 's2',
      name: 'Code Assistant',
      description: 'Helps with code explanation, debugging, and generation.',
      enabled: false,
    },
  ]);

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1117] text-[#f8fafc] p-8 overflow-y-auto">
      {/* Header matching skills.png */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f8fafc]">Skills</h1>
          <p className="text-xs text-[#64748b] mt-1">
            Extend your assistant with custom skills.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#38bdf8] rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Skill</span>
        </button>
      </div>

      {/* Skill Cards matching skills.png */}
      <div className="space-y-4 max-w-4xl">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="bg-[#0c0e15] border border-[#1a1f2c] rounded-xl p-5 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-[#141a29] text-[#38bdf8] rounded-xl">
                <Puzzle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#f8fafc]">{skill.name}</h3>
                <p className="text-xs text-[#64748b] mt-0.5">{skill.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-[#94a3b8] rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
              </button>

              {/* Toggle switch matching skills.png */}
              <button
                onClick={() => toggleSkill(skill.id)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                  skill.enabled ? 'bg-[#60a5fa]' : 'bg-[#1e273b]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    skill.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
