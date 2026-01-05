
import React, { useState, useEffect } from 'react';
import { useSchedule } from '../services/scheduleService';
import { Settings as SettingsIcon, Save, Plus, Trash2, Clock, Check, Info, Palette, Edit2, X, AlertTriangle, Box, Eye, Bold, Type, List, ToggleLeft, ToggleRight, UserCheck, Columns, Timer, ArrowUp, ArrowDown, Wand2, AlertCircle } from 'lucide-react';
import { COLOR_PALETTE, SUBJECT_COLORS, BG_OPTIONS, TEXT_OPTIONS, BORDER_COLOR_OPTIONS, BORDER_STYLE_OPTIONS, BORDER_WIDTH_OPTIONS, PERIODS } from '../constants';
import { SubjectStyle, Room, Period } from '../types';

export const Settings: React.FC = () => {
  const { 
    schoolInfo, setSchoolInfo, 
    subjects, setSubjects, 
    rooms, addRoom, removeRoom, updateRoom,
    subjectConfigs, subjectStyles, subjectHours,
    updateSubjectDetails, getSubjectColor
  } = useSchedule();

  const [activeTab, setActiveTab] = useState<'school' | 'subjects' | 'rooms' | 'bells'>('school');
  
  // Local state for adding new items
  const [newSubject, setNewSubject] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(1);

  // --- Modal States ---
  // Subject Modal
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [tempSubName, setTempSubName] = useState('');
  const [tempSubOverlap, setTempSubOverlap] = useState(false);
  const [tempSubStyle, setTempSubStyle] = useState<SubjectStyle>({ bgColor: '', textColor: '', borderColor: '', borderWidth: '', borderStyle: '', fontWeight: '' });
  
  // Delete Confirmation State
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  // Design Tab State within Modal
  const [designTab, setDesignTab] = useState<'bg' | 'text' | 'border'>('bg');

  // Room Modal
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [tempRoomName, setTempRoomName] = useState('');
  const [tempRoomCap, setTempRoomCap] = useState(1);

  // Bell Schedule State
  const [activeBellScheduleIdx, setActiveBellScheduleIdx] = useState(0);
  const [defaultClassDuration, setDefaultClassDuration] = useState(40); // Default 40 mins

  // --- Helpers ---
  
  const getInitialStyle = (sub: string): SubjectStyle => {
      if (subjectStyles[sub]) return subjectStyles[sub];
      const defaultStr = SUBJECT_COLORS[sub] || SUBJECT_COLORS['Default'];
      const parts = defaultStr.split(' ');
      return {
          bgColor: parts.find(p => p.startsWith('bg-')) || 'bg-white',
          textColor: parts.find(p => p.startsWith('text-')) || 'text-slate-800',
          borderColor: parts.find(p => p.startsWith('border-') && !p.match(/^border-\d/)) || 'border-slate-200',
          borderWidth: parts.find(p => p.match(/^border-\d/)) || 'border',
          borderStyle: parts.find(p => ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-none'].includes(p)) || 'border-solid',
          fontWeight: parts.find(p => p.startsWith('font-')) || 'font-normal'
      };
  };

  const addMinutesToTime = (time: string, minutes: number) => {
      if (!time) return '';
      const [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return time;
      
      const date = new Date();
      date.setHours(h, m);
      date.setMinutes(date.getMinutes() + minutes);
      
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // --- Handlers ---

  const handleAddSubject = () => {
      if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
          setSubjects([...subjects, newSubject.trim()]);
          setNewSubject('');
      }
  };

  const handleRemoveSubjectClick = (sub: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSubjectToDelete(sub);
  };

  const handleConfirmDeleteSubject = () => {
      if (subjectToDelete) {
          setSubjects(subjects.filter(s => s !== subjectToDelete));
          if (editingSubject === subjectToDelete) {
              setEditingSubject(null);
          }
          setSubjectToDelete(null);
      }
  };

  const handleAddRoom = () => {
      if (newRoomName.trim()) {
          addRoom({ id: `room-${Date.now()}`, name: newRoomName.trim(), capacity: newRoomCapacity });
          setNewRoomName('');
          setNewRoomCapacity(1);
      }
  };

  // --- Modal Functions: Subject ---

  const openSubjectModal = (sub: string) => {
      setEditingSubject(sub);
      setTempSubName(sub);
      setTempSubOverlap(subjectConfigs[sub]?.allowOverlap || false);
      setTempSubStyle(getInitialStyle(sub));
      setDesignTab('bg'); // Reset tab
  };

  const saveSubjectModal = () => {
      if (editingSubject && tempSubName.trim()) {
          updateSubjectDetails(
              editingSubject,
              tempSubName.trim(),
              tempSubStyle,
              { allowOverlap: tempSubOverlap }
          );
          setEditingSubject(null);
      }
  };

  const updateTempStyle = (field: keyof SubjectStyle, value: string) => {
      setTempSubStyle(prev => ({ ...prev, [field]: value }));
  };

  // --- Modal Functions: Room ---

  const openRoomModal = (room: Room) => {
      setEditingRoom(room);
      setTempRoomName(room.name);
      setTempRoomCap(room.capacity);
  };

  const saveRoomModal = () => {
      if (editingRoom && tempRoomName.trim()) {
          updateRoom({ ...editingRoom, name: tempRoomName.trim(), capacity: tempRoomCap });
          setEditingRoom(null);
      }
  };

  // --- Bell Schedule Handlers (Omitted for brevity, logic unchanged) ---
  const toggleDistinctSchedules = () => {
      setSchoolInfo(prev => {
          const isBecomingDistinct = !prev.hasDistinctSchedules;
          const newSchedules = prev.bellSchedules.map(s => ({ ...s }));

          if (isBecomingDistinct) {
              if (newSchedules[0]) {
                  newSchedules[0].name = '시정표 A (저학년)';
                  newSchedules[0].targetGrades = [1, 2];
              }
              if (newSchedules[1]) {
                  newSchedules[1].name = '시정표 B (고학년)';
                  newSchedules[1].targetGrades = [3, 4, 5, 6];
              }
          } else {
              if (newSchedules[0]) {
                  newSchedules[0].name = '기본 시정표';
                  newSchedules[0].targetGrades = [1, 2, 3, 4, 5, 6];
              }
          }

          return {
              ...prev,
              hasDistinctSchedules: isBecomingDistinct,
              bellSchedules: newSchedules
          };
      });
      setActiveBellScheduleIdx(0);
  };

  const updateBellScheduleName = (idx: number, name: string) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          if (newSchedules[idx]) {
              newSchedules[idx] = { ...newSchedules[idx], name };
          }
          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const toggleTargetGrade = (scheduleIdx: number, grade: number) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (schedule) {
              const currentGrades = schedule.targetGrades;
              if (currentGrades.includes(grade)) {
                  newSchedules[scheduleIdx] = { ...schedule, targetGrades: currentGrades.filter(g => g !== grade) };
              } else {
                  newSchedules[scheduleIdx] = { ...schedule, targetGrades: [...currentGrades, grade].sort() };
              }
          }
          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const updatePeriod = (scheduleIdx: number, period: number, field: string, value: any) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (schedule && schedule.periods[period]) {
              let updatedPeriods = { ...schedule.periods };
              const currentPeriod = { ...updatedPeriods[period], [field]: value };
              
              if (field === 'start' && currentPeriod.type === 'CLASS') {
                  currentPeriod.end = addMinutesToTime(value, defaultClassDuration);
              }

              updatedPeriods[period] = currentPeriod;

              if (field === 'end') {
                  const sortedKeys = Object.keys(updatedPeriods).map(Number).sort((a,b)=>a-b);
                  const currentKeyIndex = sortedKeys.indexOf(period);
                  if (currentKeyIndex > -1 && currentKeyIndex < sortedKeys.length - 1) {
                      const nextPeriodKey = sortedKeys[currentKeyIndex + 1];
                      const nextPeriod = { ...updatedPeriods[nextPeriodKey] };
                      const newNextStart = addMinutesToTime(value, 10);
                      nextPeriod.start = newNextStart;
                      updatedPeriods[nextPeriodKey] = nextPeriod;
                  }
              }

              newSchedules[scheduleIdx] = {
                  ...schedule,
                  periods: updatedPeriods
              };
          }
          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const addPeriod = (scheduleIdx: number) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (schedule) {
              const keys = Object.keys(schedule.periods).map(Number);
              const maxPeriod = keys.length > 0 ? Math.max(...keys) : 0;
              const nextPeriod = maxPeriod + 1;
              if (nextPeriod > 15) return prev;

              let start = '09:00';
              if (maxPeriod > 0 && schedule.periods[maxPeriod]) {
                  start = addMinutesToTime(schedule.periods[maxPeriod].end, 10);
              }
              const end = addMinutesToTime(start, defaultClassDuration);

              newSchedules[scheduleIdx] = {
                  ...schedule,
                  periods: {
                      ...schedule.periods,
                      [nextPeriod]: { start, end, name: `${nextPeriod}교시`, type: 'CLASS' }
                  }
              };
          }
          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const removePeriod = (scheduleIdx: number, period: number) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (schedule) {
              const newPeriods = { ...schedule.periods };
              delete newPeriods[period];
              newSchedules[scheduleIdx] = { ...schedule, periods: newPeriods };
          }
          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const reorderPeriod = (scheduleIdx: number, currentPeriod: number, direction: 'up' | 'down') => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (!schedule) return prev;

          const sortedKeys = Object.keys(schedule.periods).map(Number).sort((a,b)=>a-b);
          const idx = sortedKeys.indexOf(currentPeriod);
          if (idx === -1) return prev;

          if (direction === 'up' && idx > 0) {
              const prevPeriod = sortedKeys[idx - 1];
              const values = sortedKeys.map(k => schedule.periods[k]);
              [values[idx], values[idx-1]] = [values[idx-1], values[idx]];
              
              const newPeriods: any = {};
              values.forEach((val, i) => { newPeriods[i+1] = val; });
              newSchedules[scheduleIdx] = { ...schedule, periods: newPeriods };

          } else if (direction === 'down' && idx < sortedKeys.length - 1) {
              const nextPeriod = sortedKeys[idx + 1];
              const values = sortedKeys.map(k => schedule.periods[k]);
              [values[idx], values[idx+1]] = [values[idx+1], values[idx]];

              const newPeriods: any = {};
              values.forEach((val, i) => { newPeriods[i+1] = val; });
              newSchedules[scheduleIdx] = { ...schedule, periods: newPeriods };
          }

          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const toggleSpecialBreak = (scheduleIdx: number, type: 'middle' | 'lunch', checked: boolean) => {
      setSchoolInfo(prev => {
          const newSchedules = [...prev.bellSchedules];
          const schedule = newSchedules[scheduleIdx];
          if (!schedule) return prev;

          const sortedKeys = Object.keys(schedule.periods).map(Number).sort((a,b)=>a-b);
          let values = sortedKeys.map(k => schedule.periods[k] as { start: string; end: string; name?: string; type?: 'CLASS' | 'ETC' });

          if (checked) {
              if (type === 'middle') {
                  const insertIdx = 2; 
                  const prevEnd = values[1]?.end || '10:30';
                  const newStart = addMinutesToTime(prevEnd, 0);
                  const newEnd = addMinutesToTime(newStart, 20);
                  const middleBreak = { start: newStart, end: newEnd, name: '중간놀이', type: 'ETC' as const };
                  values.splice(insertIdx, 0, middleBreak);
              } else if (type === 'lunch') {
                  const idx4 = values.findIndex(v => v.name?.includes('4교시'));
                  const insertIdx = idx4 !== -1 ? idx4 + 1 : 4;
                  const prevEnd = values[idx4 !== -1 ? idx4 : 3]?.end || '12:10';
                  const newStart = addMinutesToTime(prevEnd, 0);
                  const newEnd = addMinutesToTime(newStart, 50);
                  const lunchBreak = { start: newStart, end: newEnd, name: '점심시간', type: 'ETC' as const };
                  values.splice(insertIdx, 0, lunchBreak);
              }
          } else {
              if (type === 'middle') {
                  values = values.filter(v => v.name !== '중간놀이');
              } else if (type === 'lunch') {
                  values = values.filter(v => v.name !== '점심시간');
              }
          }

          const newPeriods: any = {};
          values.forEach((val, i) => { newPeriods[i+1] = val; });
          newSchedules[scheduleIdx] = { ...schedule, periods: newPeriods };

          return { ...prev, bellSchedules: newSchedules };
      });
  };

  const getDisplayColorClass = (sub: string) => {
      if (editingSubject === sub) {
          return `${tempSubStyle.bgColor} ${tempSubStyle.textColor} ${tempSubStyle.borderColor} ${tempSubStyle.borderWidth} ${tempSubStyle.borderStyle} ${tempSubStyle.fontWeight}`;
      }
      return getSubjectColor(sub);
  };

  const currentSchedule = schoolInfo.bellSchedules[activeBellScheduleIdx];
  const hasMiddleBreak = currentSchedule ? Object.values(currentSchedule.periods).some((p: any) => p.name === '중간놀이') : false;
  const hasLunchBreak = currentSchedule ? Object.values(currentSchedule.periods).some((p: any) => p.name === '점심시간') : false;

  return (
    <div className="p-6 max-w-4xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="text-indigo-600" />
          환경 설정
        </h1>
        <p className="text-slate-500 mt-1">학교 정보, 과목, 교실 및 기타 배정 규칙을 설정합니다.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b">
            <button onClick={() => setActiveTab('school')} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'school' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>학교 정보</button>
            <button onClick={() => setActiveTab('bells')} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'bells' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>시정표 관리</button>
            <button onClick={() => setActiveTab('subjects')} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'subjects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>과목 설정</button>
            <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'rooms' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>특별실 관리</button>
        </div>

        <div className="p-6">
            {activeTab === 'school' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">학교명</label>
                        <input 
                            type="text" 
                            value={schoolInfo.name} 
                            onChange={(e) => setSchoolInfo({...schoolInfo, name: e.target.value})}
                            className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">학년별 학급 수</h3>
                        <div className="grid grid-cols-6 gap-2">
                            {Object.entries(schoolInfo.classesPerGrade).map(([grade, count]) => (
                                <div key={grade} className="text-center p-2 border rounded bg-slate-50">
                                    <div className="text-xs text-slate-500 mb-1">{grade}학년</div>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="20"
                                        value={count} 
                                        onChange={(e) => setSchoolInfo({
                                            ...schoolInfo, 
                                            classesPerGrade: { ...schoolInfo.classesPerGrade, [grade]: parseInt(e.target.value) || 1 }
                                        })}
                                        className="w-full text-center font-bold bg-white border rounded py-1 outline-none focus:border-indigo-500" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bell Schedule Section */}
            {activeTab === 'bells' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div>
                            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Clock size={16}/> 시정표 운영 방식</h3>
                            <p className="text-xs text-indigo-600 mt-1">학년별로 시작/종료 시간이 다른 경우 '분리 운영'을 선택하세요.</p>
                        </div>
                        <button 
                            onClick={toggleDistinctSchedules}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${schoolInfo.hasDistinctSchedules ? 'bg-white border border-indigo-200 text-indigo-700 shadow-sm' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {schoolInfo.hasDistinctSchedules ? <Columns size={16}/> : <UserCheck size={16}/>}
                            {schoolInfo.hasDistinctSchedules ? '학년별 분리 (A/B타입)' : '단일 시정표 (전학년 공통)'}
                        </button>
                    </div>

                    {schoolInfo.hasDistinctSchedules && (
                        <div className="flex gap-2 border-b border-slate-200">
                            {schoolInfo.bellSchedules.map((schedule, idx) => (
                                <button 
                                    key={schedule.id}
                                    onClick={() => setActiveBellScheduleIdx(idx)}
                                    className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${activeBellScheduleIdx === idx ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {schedule.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {currentSchedule && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-4 items-end border-b border-slate-200 pb-4">
                                    <div className="w-32">
                                        <label className="block text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1">
                                            <Timer size={12}/> 수업 시간(분)
                                        </label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={defaultClassDuration}
                                            onChange={(e) => setDefaultClassDuration(parseInt(e.target.value) || 40)}
                                            className="w-full p-2 border border-indigo-300 rounded font-bold text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            title="시작 시간 입력 시 종료 시간이 자동으로 계산됩니다."
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">시정표 이름</label>
                                        <input 
                                            value={currentSchedule.name}
                                            onChange={(e) => updateBellScheduleName(activeBellScheduleIdx, e.target.value)}
                                            className="w-full p-2 border rounded font-bold text-sm outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">적용 학년</label>
                                        <div className="flex gap-2">
                                            {[1,2,3,4,5,6].map(g => (
                                                <button 
                                                    key={g}
                                                    onClick={() => toggleTargetGrade(activeBellScheduleIdx, g)}
                                                    className={`w-8 h-8 rounded border text-xs font-bold transition-all ${currentSchedule.targetGrades.includes(g) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-300'}`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 bg-white border rounded-lg shadow-sm">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Wand2 size={12}/> 자동 배치:</span>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={hasMiddleBreak} onChange={(e) => toggleSpecialBreak(activeBellScheduleIdx, 'middle', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-xs font-bold text-slate-700">중간놀이 (2교시 후)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={hasLunchBreak} onChange={(e) => toggleSpecialBreak(activeBellScheduleIdx, 'lunch', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-xs font-bold text-slate-700">점심시간 (4교시 후)</span>
                                    </label>
                                </div>

                                <div className="bg-white rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-slate-500 font-bold text-xs">
                                            <tr>
                                                <th className="p-2 text-center w-12">순서</th>
                                                <th className="p-2 text-center w-12">No</th>
                                                <th className="p-2 w-32">표시 이름</th>
                                                <th className="p-2 text-center">시작</th>
                                                <th className="p-2 text-center">종료</th>
                                                <th className="p-2 text-center w-24">유형</th>
                                                <th className="p-2 text-center w-10">삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Object.keys(currentSchedule.periods).map(Number).sort((a,b)=>a-b).map((period, index, array) => {
                                                const pData = currentSchedule.periods[period] as any;
                                                if (!pData) return null;
                                                return (
                                                    <tr key={period} className="hover:bg-slate-50">
                                                        <td className="p-2 text-center">
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <button onClick={() => reorderPeriod(activeBellScheduleIdx, period, 'up')} disabled={index === 0} className={`text-slate-400 hover:text-indigo-600 disabled:opacity-20`}><ArrowUp size={12}/></button>
                                                                <button onClick={() => reorderPeriod(activeBellScheduleIdx, period, 'down')} disabled={index === array.length - 1} className={`text-slate-400 hover:text-indigo-600 disabled:opacity-20`}><ArrowDown size={12}/></button>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-slate-400">{period}</td>
                                                        <td className="p-2">
                                                            <input 
                                                                value={pData.name || ''} 
                                                                onChange={(e) => updatePeriod(activeBellScheduleIdx, period, 'name', e.target.value)}
                                                                className="w-full p-1 border rounded text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <input 
                                                                type="time"
                                                                value={pData.start} 
                                                                onChange={(e) => updatePeriod(activeBellScheduleIdx, period, 'start', e.target.value)}
                                                                className="p-1 border rounded text-xs bg-slate-50 font-mono"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <input 
                                                                type="time"
                                                                value={pData.end} 
                                                                onChange={(e) => updatePeriod(activeBellScheduleIdx, period, 'end', e.target.value)}
                                                                className="p-1 border rounded text-xs bg-slate-50 font-mono"
                                                                title="종료 시간을 변경하면 다음 교시가 자동으로 +10분 뒤 시작으로 조정됩니다."
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button 
                                                                onClick={() => updatePeriod(activeBellScheduleIdx, period, 'type', pData.type === 'CLASS' ? 'ETC' : 'CLASS')}
                                                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${pData.type === 'CLASS' ? 'bg-white border-slate-300 text-slate-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}
                                                            >
                                                                {pData.type === 'CLASS' ? '수업' : '기타'}
                                                            </button>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => removePeriod(activeBellScheduleIdx, period)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <button onClick={() => addPeriod(activeBellScheduleIdx)} className="w-full py-2 bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1">
                                        <Plus size={12}/> 교시 추가
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'subjects' && (
                <div className="space-y-6">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={newSubject} 
                            onChange={(e) => setNewSubject(e.target.value)} 
                            placeholder="새 과목 추가" 
                            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                         />
                         <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 rounded font-bold hover:bg-indigo-700">추가</button>
                     </div>

                     <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <Check size={16} /> 과목 목록 및 설정
                        </h3>
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            각 과목을 <strong>클릭</strong>하여 이름, 색상, 중복 허용 여부를 상세 설정할 수 있습니다.
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {subjects.map(s => {
                                const config = subjectConfigs[s];
                                const isOverlap = config?.allowOverlap;
                                const styleClass = getDisplayColorClass(s); 
                                
                                return (
                                    <div 
                                        key={s} 
                                        onClick={() => openSubjectModal(s)}
                                        className={`group relative p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all flex flex-col items-center justify-center gap-2
                                            ${styleClass.includes('bg-') ? styleClass : 'bg-white border-slate-200'}
                                        `}
                                    >
                                        <div className="font-bold text-sm">{s}</div>
                                        {isOverlap && <span className="bg-white/50 px-1.5 py-0.5 rounded text-[10px] border border-black/10 text-slate-700 font-bold" title="중복 허용됨">중복OK</span>}
                                        
                                        <button 
                                            onClick={(e) => handleRemoveSubjectClick(s, e)}
                                            className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-full"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'rooms' && (
                <div className="space-y-6">
                    <div className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                         <input 
                            type="text" 
                            value={newRoomName} 
                            onChange={(e) => setNewRoomName(e.target.value)} 
                            placeholder="특별실 이름" 
                            className="flex-1 p-2 border rounded outline-none focus:border-indigo-500"
                         />
                         <div className="flex items-center gap-1 bg-white border rounded px-2">
                             <span className="text-xs text-slate-500 font-bold">수용</span>
                             <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={newRoomCapacity} 
                                onChange={(e) => setNewRoomCapacity(parseInt(e.target.value))} 
                                className="w-12 p-2 outline-none font-bold text-center"
                             />
                             <span className="text-xs text-slate-500">학급</span>
                         </div>
                         <button onClick={handleAddRoom} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">추가</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rooms.map(r => (
                            <div 
                                key={r.id} 
                                onClick={() => openRoomModal(r)}
                                className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm group hover:border-indigo-300 cursor-pointer transition-all"
                            >
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <Box size={14} className="text-indigo-500"/>
                                        {r.name}
                                        <Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">수용인원: {r.capacity}학급</div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeRoom(r.id); }} 
                                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- Subject Detail Modal --- */}
      {editingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4 border-b pb-3 flex-shrink-0">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <SettingsIcon size={20} className="text-indigo-600"/> 과목 상세 설정
                      </h3>
                      <button onClick={() => setEditingSubject(null)}><X className="text-slate-400 hover:text-slate-700"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-2">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">과목명</label>
                          <input 
                              value={tempSubName}
                              onChange={(e) => setTempSubName(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                          />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Eye size={10}/> 미리보기</span>
                          <div className={`w-32 h-16 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm transition-all duration-300
                              ${tempSubStyle.bgColor} ${tempSubStyle.textColor} ${tempSubStyle.borderColor} ${tempSubStyle.borderWidth} ${tempSubStyle.borderStyle} ${tempSubStyle.fontWeight}
                          `}>
                              {tempSubName || '과목명'}
                          </div>
                      </div>

                      <div>
                          <div className="flex border-b mb-3">
                              <button onClick={() => setDesignTab('bg')} className={`flex-1 py-2 text-xs font-bold ${designTab === 'bg' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>배경색</button>
                              <button onClick={() => setDesignTab('text')} className={`flex-1 py-2 text-xs font-bold ${designTab === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>글자색/굵기</button>
                              <button onClick={() => setDesignTab('border')} className={`flex-1 py-2 text-xs font-bold ${designTab === 'border' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>테두리</button>
                          </div>

                          <div className="min-h-[200px]">
                              {designTab === 'bg' && (
                                  <div className="grid grid-cols-4 gap-2">
                                      {BG_OPTIONS.map(opt => (
                                          <button 
                                              key={opt.class} 
                                              onClick={() => updateTempStyle('bgColor', opt.class)}
                                              className={`h-8 rounded border text-[10px] font-medium transition-all ${opt.class} ${tempSubStyle.bgColor === opt.class ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105 shadow-md' : 'border-slate-200 hover:scale-105'}`}
                                          >
                                              {opt.label}
                                          </button>
                                      ))}
                                  </div>
                              )}

                              {designTab === 'text' && (
                                  <div className="space-y-4">
                                      <div>
                                          <label className="text-[10px] font-bold text-slate-400 mb-2 block">글자 색상</label>
                                          <div className="grid grid-cols-4 gap-2">
                                              {TEXT_OPTIONS.map(opt => (
                                                  <button 
                                                      key={opt.class} 
                                                      onClick={() => updateTempStyle('textColor', opt.class)}
                                                      className={`h-8 rounded border text-[10px] font-bold transition-all bg-white ${opt.class} ${tempSubStyle.textColor === opt.class ? 'ring-2 ring-indigo-500 ring-offset-1 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                                  >
                                                      {opt.label}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[10px] font-bold text-slate-400 mb-2 block">글자 굵기</label>
                                          <div className="flex gap-2">
                                              <button onClick={() => updateTempStyle('fontWeight', 'font-normal')} className={`flex-1 py-2 rounded border text-xs ${tempSubStyle.fontWeight === 'font-normal' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-normal ring-1 ring-indigo-300' : 'bg-white font-normal'}`}>보통</button>
                                              <button onClick={() => updateTempStyle('fontWeight', 'font-bold')} className={`flex-1 py-2 rounded border text-xs ${tempSubStyle.fontWeight === 'font-bold' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold ring-1 ring-indigo-300' : 'bg-white font-bold'}`}>굵게</button>
                                              <button onClick={() => updateTempStyle('fontWeight', 'font-extrabold')} className={`flex-1 py-2 rounded border text-xs ${tempSubStyle.fontWeight === 'font-extrabold' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold ring-1 ring-indigo-300' : 'bg-white font-extrabold'}`}>매우굵게</button>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {designTab === 'border' && (
                                  <div className="space-y-4">
                                      <div>
                                          <label className="text-[10px] font-bold text-slate-400 mb-2 block">테두리 색상</label>
                                          <div className="grid grid-cols-4 gap-2">
                                              {BORDER_COLOR_OPTIONS.map(opt => (
                                                  <button 
                                                      key={opt.class} 
                                                      onClick={() => updateTempStyle('borderColor', opt.class)}
                                                      className={`h-8 rounded border-2 text-[10px] font-medium transition-all bg-white ${opt.class.replace('border-', 'border-')} ${tempSubStyle.borderColor === opt.class ? 'ring-2 ring-indigo-500 ring-offset-1 bg-slate-50' : 'hover:bg-slate-50'}`}
                                                      style={{ borderColor: 'inherit' }}
                                                  >
                                                      <div className={`w-full h-full border-2 rounded ${opt.class}`}></div>
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 mb-2 block">테두리 스타일</label>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {BORDER_STYLE_OPTIONS.map(opt => (
                                                      <button 
                                                          key={opt.class}
                                                          onClick={() => updateTempStyle('borderStyle', opt.class)}
                                                          className={`py-1.5 text-[10px] border border-slate-300 rounded ${tempSubStyle.borderStyle === opt.class ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold' : 'bg-white'}`}
                                                      >
                                                          {opt.label}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 mb-2 block">테두리 두께</label>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {BORDER_WIDTH_OPTIONS.map(opt => (
                                                      <button 
                                                          key={opt.class}
                                                          onClick={() => updateTempStyle('borderWidth', opt.class)}
                                                          className={`py-1.5 text-[10px] border border-slate-300 rounded ${tempSubStyle.borderWidth === opt.class ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold' : 'bg-white'}`}
                                                      >
                                                          {opt.label}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex-shrink-0">
                         <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={tempSubOverlap} 
                                    onChange={(e) => setTempSubOverlap(e.target.checked)} 
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <span className="text-sm font-bold text-slate-800">중복수업 허용 (수준별 수업/코티칭)</span>
                            </label>
                         </div>
                         <div className="ml-7 text-xs text-slate-600 bg-white/60 p-3 rounded border border-indigo-100 leading-relaxed">
                             <div className="font-bold text-indigo-600 mb-1 flex items-center gap-1">
                                 <Info size={12} /> 기능 설명
                             </div>
                             영어, 수학 등 <b>수준별 이동 수업</b>이나 <b>코티칭</b> 수업처럼,<br/>
                             <span className="bg-yellow-100 px-1 rounded font-bold text-slate-800">"동일한 시간, 동일한 대상(학급)"</span>에 <br/>
                             여러 선생님이 동시에 배정되어야 하는 과목인 경우 체크하세요.
                         </div>
                     </div>
                  </div>

                  <div className="mt-4 flex gap-3 pt-3 border-t flex-shrink-0">
                      <button 
                          onClick={() => setSubjectToDelete(editingSubject)}
                          className="px-3 py-3 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100 transition-colors"
                          title="과목 삭제"
                      >
                          <Trash2 size={18}/>
                      </button>
                      <button onClick={() => setEditingSubject(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">취소</button>
                      <button onClick={saveSubjectModal} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-2"><Save size={18}/> 저장하기</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Subject Delete Confirmation Modal --- */}
      {subjectToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-80 animate-in zoom-in-95 border-2 border-red-100">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                          <AlertCircle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">과목 삭제 확인</h3>
                      <p className="text-sm text-slate-600 mb-6">
                          '{subjectToDelete}' 과목을 정말 삭제하시겠습니까?<br/>
                          <span className="text-red-500 font-bold text-xs">해당 과목의 모든 배정 데이터가 삭제됩니다.</span>
                      </p>
                      <div className="flex gap-2 w-full">
                          <button 
                              onClick={() => setSubjectToDelete(null)}
                              className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-200"
                          >
                              취소
                          </button>
                          <button 
                              onClick={handleConfirmDeleteSubject}
                              className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 shadow-md"
                          >
                              삭제 실행
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Room Edit Modal --- */}
      {editingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Edit2 size={20} className="text-indigo-600"/> 특별실 정보 수정
                      </h3>
                      <button onClick={() => setEditingRoom(null)}><X className="text-slate-400 hover:text-slate-700"/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">특별실 이름</label>
                          <input 
                              value={tempRoomName}
                              onChange={(e) => setTempRoomName(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">동시 수용 가능 학급 수</label>
                          <input 
                              type="number" 
                              min="1" 
                              max="10"
                              value={tempRoomCap}
                              onChange={(e) => setTempRoomCap(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center"
                          />
                      </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                      <button onClick={() => setEditingRoom(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">취소</button>
                      <button onClick={saveRoomModal} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors">수정 완료</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
