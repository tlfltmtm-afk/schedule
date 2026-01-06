
import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule, extractGrade } from '../services/scheduleService';
import { DAYS } from '../constants';
import { DayOfWeek, Period, TimeSlot, Room } from '../types';
import { MapPin, Plus, Trash2, AlertTriangle, Info, Check, X, User, School, Filter, ChevronDown, Users, Layers, MousePointer2, LayoutTemplate, Timer, AlertCircle, Edit3 } from 'lucide-react';

// Helper to format class names
const formatClass = (classId: string, customLabels: Record<string, string>) => {
    if (classId === '미배정' || classId === '기타') return classId;
    if (customLabels && customLabels[classId]) return customLabels[classId];
    
    if (classId.includes('-')) {
        const parts = classId.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
             const gradeLabel = customLabels[parts[0]];
             if (gradeLabel) return `${gradeLabel}-${parts[1]}`;
        }
    }
    return classId;
};

export const RoomAssignment: React.FC = () => {
  const { 
    rooms, timetable, schoolInfo, subjects, 
    addTimeSlot, removeTimeSlot, checkConflict, 
    getSubjectColor, teachers, teacherConfig 
  } = useSchedule();

  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  
  // Selection/Sidebar State
  const [assignMode, setAssignMode] = useState<'single' | 'grade' | 'multi' | 'direct'>('single');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('1');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['1-1']);
  const [selectedSubject, setSelectedSubject] = useState<string>('과학');
  
  // Direct Input State
  const [directTarget, setDirectTarget] = useState('');
  const [directSubject, setDirectSubject] = useState('');

  // Tooltip & Interaction State
  const [hoveredCell, setHoveredCell] = useState<{day: DayOfWeek, period: Period} | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x: number, y: number} | null>(null);
  const [isHoveringDelete, setIsHoveringDelete] = useState(false); 
  
  // Modal States
  const [deleteTarget, setDeleteTarget] = useState<TimeSlot | null>(null);
  const [forceAssignData, setForceAssignData] = useState<{
      day: DayOfWeek, 
      period: Period, 
      targets: string[],
      reasons: string[],
      customSubject?: string
  } | null>(null);

  useEffect(() => {
      if (rooms.length > 0 && !selectedRoomId) {
          setSelectedRoomId(rooms[0].id);
      }
  }, [rooms, selectedRoomId]);

  // Active periods including breaks defined in bell schedules
  const activePeriods = useMemo(() => {
    const allPeriods = new Set<number>();
    schoolInfo.bellSchedules.forEach(s => {
        Object.keys(s.periods).forEach(p => allPeriods.add(Number(p)));
    });
    return Array.from(allPeriods).sort((a,b) => a-b) as Period[];
  }, [schoolInfo.bellSchedules]);

  const classOptions = useMemo(() => {
      const options: { gradeId: string, classes: string[] }[] = [];
      const gradeIds = teacherConfig.grades || ['1','2','3','4','5','6'];
      
      gradeIds.forEach(gId => {
          const gradeNum = parseInt(gId);
          const baseCount = !isNaN(gradeNum) ? (schoolInfo.classesPerGrade[gradeNum] || 0) : 0;
          const extraCount = teacherConfig.extraClassCounts?.[gId] || 0;
          const total = baseCount + extraCount;
          
          if (total > 0) {
              const classes = [];
              for(let c=1; c<=total; c++) classes.push(`${gId}-${c}`);
              options.push({ gradeId: gId, classes });
          } else if (gId.startsWith('custom-')) {
              const count = teacherConfig.extraClassCounts?.[gId] || 0;
              if (count > 0) {
                  const classes = [];
                  for(let c=1; c<=count; c++) classes.push(`${gId}-${c}`);
                  options.push({ gradeId: gId, classes });
              }
          }
      });
      return options;
  }, [schoolInfo, teacherConfig]);

  const getBellTime = (scheduleIndex: number, period: number) => {
     const schedule = schoolInfo.bellSchedules[scheduleIndex];
     if (!schedule || !schedule.periods[period]) return null;
     return { 
        start: schedule.periods[period].start, 
        end: schedule.periods[period].end,
        name: schedule.periods[period].name,
        type: schedule.periods[period].type
    };
  };

  const getCellSlots = (roomId: string, day: DayOfWeek, period: Period) => {
      return timetable.filter(t => t.roomId === roomId && t.day === day && t.period === period);
  };

  const handleAssign = (day: DayOfWeek, period: Period) => {
      if (!selectedRoomId) return;

      const room = rooms.find(r => r.id === selectedRoomId);
      const currentSlots = getCellSlots(selectedRoomId, day, period);
      const reasons: string[] = [];

      // Handle Direct Mode
      if (assignMode === 'direct') {
          if (!directTarget.trim() || !directSubject.trim()) {
              alert('배정 대상 명칭과 과목/활동명을 모두 입력해주세요.');
              return;
          }

          if (room && (currentSlots.length + 1) > room.capacity) {
              reasons.push(`정원 초과 (${currentSlots.length}반 + 1반 > ${room.capacity}반)`);
          }

          const tempSlot: TimeSlot = {
              id: 'check', day, period, 
              classId: directTarget, subject: directSubject, roomId: selectedRoomId
          };
          const conflict = checkConflict(tempSlot);
          if (conflict.hasConflict) {
              reasons.push(`${directTarget}: ${conflict.reason}`);
          }

          if (reasons.length > 0) {
              setForceAssignData({
                  day, period, targets: [directTarget], reasons, customSubject: directSubject
              });
              return;
          }

          executeBatchAssign(day, period, [directTarget], directSubject);
          return;
      }

      // Handle Selection Modes (Single, Grade, Multi)
      if (selectedTargets.length === 0) {
          alert('배정할 학급을 선택해주세요.');
          return;
      }

      // 1. Check Capacity
      if (room && (currentSlots.length + selectedTargets.length) > room.capacity) {
          reasons.push(`정원 초과 (${currentSlots.length}반 + ${selectedTargets.length}반 > ${room.capacity}반)`);
      }

      // 2. Check Conflicts
      selectedTargets.forEach(target => {
          const tempSlot: TimeSlot = {
              id: 'check', day, period, 
              classId: target, subject: selectedSubject, roomId: selectedRoomId
          };
          const conflict = checkConflict(tempSlot);
          if (conflict.hasConflict) {
              reasons.push(`${formatClass(target, teacherConfig.customLabels || {})}: ${conflict.reason}`);
          }
      });

      // If conflicts exist, trigger Force Assign Modal
      if (reasons.length > 0) {
          setForceAssignData({
              day,
              period,
              targets: selectedTargets,
              reasons
          });
          return;
      }

      // If no conflicts, execute immediately
      executeBatchAssign(day, period, selectedTargets);
  };

  const executeBatchAssign = (day: DayOfWeek, period: Period, targets: string[], customSub?: string) => {
      const subjectToUse = customSub || selectedSubject;
      targets.forEach(target => {
          addTimeSlot({
              id: `${target}-${subjectToUse}-${selectedRoomId}-${day}-${period}-${Date.now()}`,
              day, period,
              classId: target,
              subject: subjectToUse,
              roomId: selectedRoomId
          });
      });
  };

  const confirmForceAssign = () => {
      if (forceAssignData) {
          executeBatchAssign(forceAssignData.day, forceAssignData.period, forceAssignData.targets, forceAssignData.customSubject);
          setForceAssignData(null);
      }
  };

  // Open the custom delete modal instead of window.confirm
  const handleDeleteClick = (e: React.MouseEvent, slot: TimeSlot) => {
      e.stopPropagation(); // Prevent triggering assign on background
      e.preventDefault();
      
      if (slot.teacherId) {
          alert("전담 선생님이 배정한 수업은 '전담 시간표 작성' 메뉴에서만 수정할 수 있습니다.");
          return;
      }
      setDeleteTarget(slot);
  };

  // Execute deletion
  const confirmDelete = () => {
      if (deleteTarget) {
          removeTimeSlot(deleteTarget.id);
          setDeleteTarget(null);
      }
  };

  const renderSidebar = () => (
      <div className="w-80 bg-white border-l border-slate-200 p-6 shadow-xl z-10 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 flex-shrink-0">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Filter size={18}/></div>
              <h2 className="text-lg font-bold text-slate-800">배정 대상 설정</h2>
          </div>

          <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg mb-6 flex-shrink-0">
              <button 
                onClick={() => { setAssignMode('single'); setSelectedTargets([]); }} 
                className={`py-2 px-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all whitespace-nowrap ${assignMode === 'single' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                  <MousePointer2 size={10}/> 개별
              </button>
              <button 
                onClick={() => { setAssignMode('grade'); setSelectedTargets([]); }} 
                className={`py-2 px-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all whitespace-nowrap ${assignMode === 'grade' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                  <LayoutTemplate size={10}/> 학년
              </button>
              <button 
                onClick={() => { setAssignMode('multi'); setSelectedTargets([]); }} 
                className={`py-2 px-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all whitespace-nowrap ${assignMode === 'multi' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                  <Users size={10}/> 다중
              </button>
              <button 
                onClick={() => { setAssignMode('direct'); setSelectedTargets([]); }} 
                className={`py-2 px-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all whitespace-nowrap ${assignMode === 'direct' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                  <Edit3 size={10}/> 직접
              </button>
          </div>

          <div className="space-y-6 flex-1">
              {assignMode === 'single' && (
                  <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">학년 선택</label>
                        <div className="grid grid-cols-3 gap-2">
                            {classOptions.map(opt => (
                                <button 
                                    key={opt.gradeId}
                                    onClick={() => { 
                                        setSelectedGradeId(opt.gradeId); 
                                        if (opt.classes.length > 0) setSelectedTargets([opt.classes[0]]); 
                                    }}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all truncate ${selectedGradeId === opt.gradeId ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                    title={formatClass(opt.gradeId, teacherConfig.customLabels || {})}
                                >
                                    {formatClass(opt.gradeId, teacherConfig.customLabels || {})}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">반 선택</label>
                        <div className="grid grid-cols-4 gap-2">
                            {classOptions.find(o => o.gradeId === selectedGradeId)?.classes.map(cls => (
                                <button 
                                    key={cls}
                                    onClick={() => setSelectedTargets([cls])}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all truncate ${selectedTargets.includes(cls) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {teacherConfig.customLabels?.[cls] ? teacherConfig.customLabels[cls] : `${cls.split('-')[1]}반`}
                                </button>
                            ))}
                        </div>
                    </div>
                  </>
              )}

              {assignMode === 'grade' && (
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">학년 선택 (일괄 배정)</label>
                      <div className="grid grid-cols-2 gap-2">
                          {classOptions.map(opt => (
                              <button 
                                  key={opt.gradeId}
                                  onClick={() => {
                                      setSelectedGradeId(opt.gradeId);
                                      setSelectedTargets(opt.classes);
                                  }}
                                  className={`py-3 rounded-lg text-sm font-bold border transition-all ${selectedGradeId === opt.gradeId ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                              >
                                  {formatClass(opt.gradeId, teacherConfig.customLabels || {})} ({opt.classes.length}개 반)
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {assignMode === 'multi' && (
                  <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">학급 다중 선택</label>
                      <div className="flex-1 overflow-y-auto border rounded-lg bg-slate-50 p-2 space-y-4 scrollbar-thin">
                          {classOptions.map(opt => (
                              <div key={opt.gradeId}>
                                  <div className="text-xs font-bold text-slate-400 mb-1 ml-1">{formatClass(opt.gradeId, teacherConfig.customLabels || {})}</div>
                                  <div className="grid grid-cols-4 gap-1">
                                      {opt.classes.map(cls => (
                                          <button 
                                              key={cls}
                                              onClick={() => setSelectedTargets(prev => prev.includes(cls) ? prev.filter(t => t !== cls) : [...prev, cls])}
                                              className={`py-1.5 rounded text-[10px] font-bold border transition-all truncate ${selectedTargets.includes(cls) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200'}`}
                                              title={formatClass(cls, teacherConfig.customLabels || {})}
                                          >
                                              {teacherConfig.customLabels?.[cls] ? teacherConfig.customLabels[cls] : `${cls.split('-')[1]}반`}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="text-right text-xs font-bold text-indigo-600 mt-2">
                          총 {selectedTargets.length}개 학급 선택됨
                      </div>
                  </div>
              )}

              {assignMode === 'direct' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">배정 대상 명칭</label>
                          <input 
                              value={directTarget}
                              onChange={(e) => setDirectTarget(e.target.value)}
                              placeholder="예: 교직원, 외부대관, 6-1"
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">과목 / 활동명</label>
                          <input 
                              value={directSubject}
                              onChange={(e) => setDirectSubject(e.target.value)}
                              placeholder="예: 전체연수, 동아리, 체육"
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                          />
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                          <p className="text-[10px] text-orange-600 leading-relaxed font-medium">
                              * 사전에 등록되지 않은 명칭을 자유롭게 사용할 수 있습니다.<br/>
                              * 배정 시 색상은 '기타/기본' 색상으로 적용됩니다.
                          </p>
                      </div>
                  </div>
              )}

              <div className="h-px bg-slate-100 my-2 flex-shrink-0"></div>

              {/* Subject Selection */}
              {assignMode !== 'direct' && (
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">과목 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                          {subjects.filter(s => !['창체','자율','동아리'].includes(s)).map(s => {
                              const style = getSubjectColor(s);
                              const isActive = selectedSubject === s;
                              return (
                                  <button 
                                    key={s}
                                    onClick={() => setSelectedSubject(s)}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${isActive ? `ring-2 ring-offset-1 ring-slate-400 ${style}` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                  >
                                      {isActive && <Check size={12} />}
                                      {s}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  const hasDual = schoolInfo.hasDistinctSchedules;
  const showRightSide = hasDual;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100 relative">
      <div className="flex-1 overflow-auto p-4 scrollbar-thin">
        <header className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <MapPin className="text-orange-500" />
                    <h1 className="text-xl font-bold text-slate-800">특별실 시간표 작성</h1>
                </div>
                <div className="relative">
                    <select 
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-300 py-2 pl-4 pr-10 rounded-lg font-bold outline-none shadow-sm text-slate-700 min-w-[150px] cursor-pointer hover:bg-slate-100"
                    >
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>
            </div>
            
            <div className="flex gap-2">
                {hasDual && (
                    <div className="px-3 py-1.5 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-2 shadow-sm mr-2">
                        <Timer size={14}/> 투트랙(A/B) 시정표 적용
                    </div>
                )}
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-2">
                    <User size={14}/> 전담 (수정불가)
                </div>
                <div className="px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-2 shadow-sm">
                    <School size={14}/> 담임 (클릭배정)
                </div>
            </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`grid ${showRightSide ? 'grid-cols-7' : 'grid-cols-6'} border-b divide-x bg-slate-50`}>
                <div className={`p-3 font-bold text-center text-sm ${showRightSide ? 'text-blue-600 bg-blue-50/30' : 'text-slate-600'}`}>
                    {showRightSide ? '저(A)' : '시간'}
                </div>
                {DAYS.map(day => <div key={day} className="p-3 font-bold text-slate-700 text-center">{day}</div>)}
                {showRightSide && <div className="p-3 font-bold text-rose-600 bg-rose-50/30 text-center text-sm">고(B)</div>}
            </div>

            {activePeriods.map(period => {
                const tLeft = getBellTime(0, period);
                const tRight = showRightSide ? getBellTime(1, period) : null;
                
                const room = rooms.find(r => r.id === selectedRoomId);

                return (
                    <div key={period} className={`grid ${showRightSide ? 'grid-cols-7' : 'grid-cols-6'} divide-x border-b last:border-0`}>
                        {/* Time Left */}
                        <div className={`p-2 h-24 flex flex-col items-center justify-center border-r border-slate-200 transition-colors
                            ${tLeft?.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50'}
                        `}>
                            <span className={`font-bold text-sm text-center ${tLeft?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                {tLeft ? tLeft.name : '-'}
                            </span>
                            {tLeft && <span className="text-[10px] text-blue-600 font-mono font-bold">{tLeft.start}~{tLeft.end}</span>}
                        </div>

                        {/* Days */}
                        {DAYS.map(day => {
                            const occupants = getCellSlots(selectedRoomId, day, period);
                            const isFull = room && occupants.length >= room.capacity;
                            const isBothEtc = tLeft?.type === 'ETC' && (showRightSide ? tRight?.type === 'ETC' : true);
                            
                            let hasHoverConflict = false;
                            if (hoveredCell?.day === day && hoveredCell?.period === period) {
                                if (assignMode === 'direct') {
                                    const cf = checkConflict({id:'check', day, period, classId: directTarget || 'temp', subject: directSubject, roomId:''});
                                    hasHoverConflict = cf.hasConflict;
                                } else {
                                    hasHoverConflict = selectedTargets.some(t => {
                                        const cf = checkConflict({id:'check', day, period, classId: t, subject:'', roomId:''});
                                        return cf.hasConflict;
                                    });
                                }
                            }

                            return (
                                <div 
                                    key={day} 
                                    className="p-1 h-24 relative flex flex-col gap-1 overflow-y-auto group bg-white hover:bg-indigo-50"
                                    onMouseEnter={() => setHoveredCell({day, period})}
                                    onMouseMove={(e) => setTooltipPos({x: e.clientX, y: e.clientY})}
                                    onMouseLeave={() => { setHoveredCell(null); setTooltipPos(null); setIsHoveringDelete(false); }}
                                >
                                    {!isFull && (
                                        <div 
                                            className="absolute inset-0 z-0 cursor-pointer"
                                            onClick={() => handleAssign(day, period)}
                                            title="클릭하여 배정"
                                        />
                                    )}

                                    {isBothEtc && <div className="absolute inset-0 bg-orange-50/20 pointer-events-none" />}
                                    {isFull && <div className="absolute inset-0 bg-slate-100/50 pointer-events-none" />}

                                    {occupants.length === 0 && isBothEtc && (
                                        <div className="absolute inset-0 flex items-center justify-center text-orange-200 font-bold text-xs select-none pointer-events-none">
                                            {tLeft?.name}
                                        </div>
                                    )}

                                    {occupants.map(slot => {
                                        const isSpecialist = !!slot.teacherId;
                                        const styleClass = getSubjectColor(slot.subject);
                                        const bgColor = styleClass.match(/bg-[a-z]+-\d+/)?.[0] || 'bg-gray-100';
                                        const textColor = styleClass.match(/text-[a-z]+-\d+/)?.[0] || 'text-gray-800';

                                        return (
                                            <div 
                                                key={slot.id} 
                                                onClick={(e) => handleDeleteClick(e, slot)} 
                                                className={`relative z-10 text-[10px] px-1.5 py-1 rounded border shadow-sm flex justify-between items-center group/item cursor-pointer transition-all ${isSpecialist ? 'bg-indigo-50 text-indigo-900 border-indigo-200 cursor-not-allowed' : `${bgColor} ${textColor} border-slate-200 hover:ring-2 hover:ring-red-400 hover:border-red-400`}`}
                                                title={isSpecialist ? "전담 수업 (수정 불가)" : "클릭하여 삭제"}
                                            >
                                                <div className="flex flex-col leading-none pointer-events-none">
                                                    <span className="font-bold">{formatClass(slot.classId, teacherConfig.customLabels || {})}</span>
                                                    <span className="text-[9px] opacity-80">{slot.subject} {isSpecialist && `(${teachers.find(t=>t.id===slot.teacherId)?.name})`}</span>
                                                </div>
                                                {!isSpecialist && (
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => handleDeleteClick(e, slot)} 
                                                        onMouseEnter={() => setIsHoveringDelete(true)}
                                                        onMouseLeave={() => setIsHoveringDelete(false)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-all z-20"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {!isFull && hoveredCell?.day === day && hoveredCell?.period === period && !isHoveringDelete && (
                                        <div className="mt-auto flex items-center justify-center p-1 rounded border border-dashed transition-colors relative z-0 pointer-events-none bg-indigo-50/50 border-indigo-300 text-indigo-400">
                                            {hasHoverConflict ? <AlertTriangle size={12} className="text-red-400"/> : <Plus size={12}/>}
                                            <span className={`text-[10px] font-bold ml-1 ${hasHoverConflict ? 'text-red-400' : ''}`}>
                                                {hasHoverConflict ? '충돌 주의' : '배정'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Time Right */}
                        {showRightSide && (
                            <div className={`p-2 h-24 flex flex-col items-center justify-center border-l border-slate-200 transition-colors
                                ${tRight?.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50'}
                            `}>
                                <span className={`font-bold text-sm text-center ${tRight?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                    {tRight ? tRight.name : '-'}
                                </span>
                                {tRight && <span className="text-[10px] text-rose-600 font-mono font-bold">{tRight.start}~{tRight.end}</span>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {renderSidebar()}

      {/* Floating Status Tooltip */}
      {hoveredCell && tooltipPos && (assignMode !== 'direct' ? selectedTargets.length > 0 : directTarget.trim() !== '') && !isHoveringDelete && !deleteTarget && !forceAssignData && (
          <div 
              className="fixed z-50 bg-slate-800 text-white rounded-xl shadow-xl p-3 w-48 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
              style={{ top: tooltipPos.y + 15, left: tooltipPos.x + 15 }}
          >
              <div className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1 border-b border-slate-600 pb-1">
                  <Info size={10} /> 학급별 현황 ({hoveredCell.day} {schoolInfo.bellSchedules[0]?.periods[hoveredCell.period]?.name || `${hoveredCell.period}교시`})
              </div>
              <div className="space-y-1.5 max-h-48 overflow-hidden">
                  {assignMode === 'direct' ? (
                      (() => {
                        const currentSlot = timetable.find(t => 
                            t.classId === directTarget && 
                            t.day === hoveredCell.day && 
                            t.period === hoveredCell.period
                        );
                        let statusText = '배정 가능';
                        let statusClass = 'text-emerald-400';
                        if (currentSlot) {
                            statusText = currentSlot.subject;
                            statusClass = 'text-yellow-300 font-bold';
                        }
                        return (
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-200 truncate max-w-[80px]">{directTarget}</span>
                                <span className={`truncate max-w-[80px] ${statusClass}`}>{statusText}</span>
                            </div>
                        );
                      })()
                  ) : (
                      selectedTargets.map(target => {
                          const currentSlot = timetable.find(t => 
                              t.classId === target && 
                              t.day === hoveredCell.day && 
                              t.period === hoveredCell.period
                          );
                          let statusText = '배정 가능';
                          let statusClass = 'text-emerald-400';
                          if (currentSlot) {
                              statusText = currentSlot.subject;
                              if (currentSlot.roomId) {
                                  const rName = rooms.find(r=>r.id===currentSlot.roomId)?.name;
                                  if (rName) statusText += ` (${rName})`;
                              }
                              statusClass = 'text-yellow-300 font-bold';
                          }
                          return (
                              <div key={target} className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-200">{formatClass(target, teacherConfig.customLabels || {})}</span>
                                  <span className={`truncate max-w-[80px] ${statusClass}`}>{statusText}</span>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      )}

      {/* Force Assign Modal */}
      {forceAssignData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full border-2 border-orange-100 transform transition-all scale-100">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600 animate-in zoom-in">
                          <Layers size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">중복 배정 및 정원 초과 허용</h3>
                      <div className="text-sm text-slate-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 w-full text-left">
                          <div className="font-bold text-orange-700 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> 감지된 충돌:</div>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                              {forceAssignData.reasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                              ))}
                          </ul>
                      </div>
                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                          <strong>특별실 격주 수업(A주/B주)</strong>이나 <strong>합반 수업</strong>인 경우 배정이 필요할 수 있습니다.<br/>
                          기존 시간표를 무시하고 강제로 배정하시겠습니까?
                      </p>
                      <div className="flex gap-2 w-full">
                          <button 
                              onClick={() => setForceAssignData(null)}
                              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                          >
                              취소
                          </button>
                          <button 
                              onClick={confirmForceAssign}
                              className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 shadow-md transition-colors flex items-center justify-center gap-1"
                          >
                              <Check size={16}/> 중복 배정 허용
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-80 max-w-full border-2 border-red-100 transform transition-all scale-100">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 animate-in zoom-in">
                          <Trash2 size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">수업 삭제 확인</h3>
                      <p className="text-slate-600 mb-6 text-sm">
                          <span className="font-bold text-indigo-600 mr-1">{formatClass(deleteTarget.classId, teacherConfig.customLabels || {})}</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{deleteTarget.subject}</span>
                          <br/>수업을 정말 삭제하시겠습니까?
                      </p>
                      <div className="flex gap-2 w-full">
                          <button 
                              onClick={() => setDeleteTarget(null)}
                              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                          >
                              취소
                          </button>
                          <button 
                              onClick={confirmDelete}
                              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-md transition-colors flex items-center justify-center gap-1"
                          >
                              <Trash2 size={16}/> 삭제
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
