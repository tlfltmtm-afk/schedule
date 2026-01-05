
import React, { useState, useRef, useEffect } from 'react';
import { useSchedule } from '../services/scheduleService';
import { UserPlus, Save, X, Plus, Trash2, Palette, Users, GraduationCap, School, GripVertical, Pencil, Check, MoreVertical, Edit2, Settings, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { COLOR_PALETTE } from '../constants';
import { Teacher, TeacherAssignment } from '../types';

const extractGrade = (classId: string): number => {
    const match = classId.match(/(?:^|-|custom-)?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

export const TeacherManagement: React.FC = () => {
  const { 
    teachers, addTeacher, updateTeacher, removeTeacher, setTeachers,
    subjects, rooms, getRequiredHours, schoolInfo,
    teacherConfig, setTeacherConfig,
    subjectConfigs, addSubjectGradeOverlap
  } = useSchedule();

  // Form State
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherColor, setNewTeacherColor] = useState('pastel-purple');
  const [tempAssignments, setTempAssignments] = useState<TeacherAssignment[]>([]);
  const [maxHours, setMaxHours] = useState(20);

  // Assignment Input State
  const [currentAssignSubject, setCurrentAssignSubject] = useState(subjects[0] || '');
  const [currentAssignRoom, setCurrentAssignRoom] = useState('');
  
  // Target Selection State
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  
  // Drag State for Grades
  const [draggedGrade, setDraggedGrade] = useState<string | null>(null);
  
  // Label Edit & Menu State
  const [isLabelEditMode, setIsLabelEditMode] = useState(false);
  
  // Dropdown & Inline Edit State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete Confirmation State for Grade Rows
  const [deletingGradeId, setDeletingGradeId] = useState<string | null>(null);

  // Delete Confirmation State for Teachers
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Handlers ---

  const resetForm = () => {
    setEditingTeacherId(null);
    setNewTeacherName('');
    setNewTeacherColor('pastel-purple');
    setTempAssignments([]);
    setMaxHours(20);
    setCurrentAssignSubject(subjects[0] || '');
    setCurrentAssignRoom('');
    setSelectedTargets([]);
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherColor(teacher.color);
    setTempAssignments(teacher.assignments);
    setMaxHours(teacher.maxHours || 20);
  };

  const handleDeleteTeacherClick = (id: string) => {
    setTeacherToDelete(id);
  };

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      removeTeacher(teacherToDelete);
      if (editingTeacherId === teacherToDelete) resetForm();
      setTeacherToDelete(null);
    }
  };

  const handleSaveTeacher = () => {
    if (!newTeacherName.trim()) {
      alert("교사 이름을 입력해주세요.");
      return;
    }
    if (tempAssignments.length === 0) {
      alert("최소 하나 이상의 담당 과목을 배정해주세요.");
      return;
    }

    const teacherData: Teacher = {
      id: editingTeacherId || `teacher-${Date.now()}`,
      name: newTeacherName,
      color: newTeacherColor,
      assignments: tempAssignments,
      maxHours: maxHours
    };

    if (editingTeacherId) {
      updateTeacher(teacherData);
    } else {
      addTeacher(teacherData);
    }
    resetForm();
    alert("저장되었습니다.");
  };

  // Assignment Handlers
  const addAssignment = () => {
    if (!currentAssignSubject) {
      alert("과목을 선택해주세요.");
      return;
    }

    setTempAssignments(prev => [
      ...prev,
      {
        subject: currentAssignSubject,
        roomId: currentAssignRoom || undefined,
        targets: selectedTargets.length > 0 ? [...selectedTargets].sort() : undefined,
        hours: getRequiredHours(currentAssignSubject) // Default hours
      }
    ]);
    
    // Reset selection
    setSelectedTargets([]);
  };

  const removeAssignment = (idx: number) => {
    setTempAssignments(prev => prev.filter((_, i) => i !== idx));
  };

  const getSelectedColorData = () => {
    return COLOR_PALETTE.find(c => c.id === newTeacherColor) || COLOR_PALETTE[0];
  };

  // Reorder Handlers
  const moveTeacher = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index > 0) {
          setTeachers(prev => {
              const newArr = [...prev];
              [newArr[index], newArr[index - 1]] = [newArr[index - 1], newArr[index]];
              return newArr;
          });
      } else if (direction === 'down' && index < teachers.length - 1) {
          setTeachers(prev => {
              const newArr = [...prev];
              [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
              return newArr;
          });
      }
  };

  const moveToSpecificIndex = (currentIndex: number, targetStr: string) => {
      const targetIndex = parseInt(targetStr) - 1;
      if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= teachers.length || targetIndex === currentIndex) return;
      setTeachers(prev => {
          const newArr = [...prev];
          const [moved] = newArr.splice(currentIndex, 1);
          newArr.splice(targetIndex, 0, moved);
          return newArr;
      });
  };

  // --- Inline Target Selection Helpers using global teacherConfig ---

  const getLabel = (originalId: string) => {
      if (teacherConfig.customLabels && teacherConfig.customLabels[originalId] !== undefined) return teacherConfig.customLabels[originalId];
      if (['1','2','3','4','5','6'].includes(originalId)) return `${originalId}학년`;
      if (originalId.startsWith('custom-')) return '';
      if (originalId.includes('레벨')) {
          const [prefix, suffix] = originalId.split('레벨');
          if (!suffix) {
               return `${prefix}학년 L`;
          }
          const num = parseInt(suffix);
          if (!isNaN(num)) {
               const circled = (num >= 1 && num <= 20) ? String.fromCharCode(0x2460 + num - 1) : `(${num})`;
               return `${prefix}학년 L${circled}`;
          }
      }
      return originalId;
  };

  const getFormattedTargets = (targets: string[] | undefined) => {
      if (!targets || targets.length === 0) return '전체 학년';

      const displayItems: string[] = [];
      const usedTargets = new Set<string>();

      (teacherConfig.grades || []).forEach(grade => {
          const numGrade = parseInt(grade);
          const baseCount = !isNaN(numGrade) ? (schoolInfo.classesPerGrade[numGrade] || 0) : 0;
          const extraCounts = teacherConfig.extraClassCounts || {};
          const classCount = Math.max(0, baseCount + (extraCounts[grade] || 0));
          
          if (classCount > 0) {
              const allGradeClasses: string[] = [];
              for (let i = 1; i <= classCount; i++) {
                  allGradeClasses.push(`${grade}-${i}`);
              }

              const hasAllClasses = allGradeClasses.every(c => targets.includes(c));
              
              if (hasAllClasses) {
                  displayItems.push(getLabel(grade));
                  allGradeClasses.forEach(c => usedTargets.add(c));
              }
          }
      });

      targets.forEach(t => {
          if (!usedTargets.has(t)) {
              displayItems.push(getLabel(t));
          }
      });

      return displayItems.filter(l => l !== '').join(', ');
  };

  const handleTargetClick = (targetId: string, isGradeGroup: boolean = false, grade?: string) => {
      if (isLabelEditMode) {
          setActiveMenuId(activeMenuId === targetId ? null : targetId);
      } else {
          if (targetId.includes('레벨') && !selectedTargets.includes(targetId) && !isGradeGroup) {
              const targetGrade = extractGrade(targetId);
              const subject = currentAssignSubject;
              const config = subjectConfigs[subject];
              const isAllowed = config?.allowOverlap || (config?.allowOverlapByGrade && config.allowOverlapByGrade.includes(targetGrade));

              if (!isAllowed) {
                  const confirmMsg = `해당교과(${subject}) 해당학년(${targetGrade}학년) 중복수업을 허용하시겠습니까? \n예) 수준별 이동수업 등`;
                  if (window.confirm(confirmMsg)) {
                      addSubjectGradeOverlap(subject, targetGrade);
                  }
              }
          }

          if (isGradeGroup && grade !== undefined) {
              handleGradeLabelClick(grade);
          } else {
              toggleTarget(targetId);
          }
      }
  };

  const handleMenuEdit = (targetId: string) => {
      setRenamingId(targetId);
      setRenameValue(getLabel(targetId));
      setActiveMenuId(null);
  };

  const handleMenuDelete = (targetId: string, gradeId?: string) => {
      if ((teacherConfig.grades || []).includes(targetId)) {
          setTeacherConfig(prev => ({
              ...prev,
              grades: (prev.grades || []).filter(g => g !== targetId)
          }));
          setSelectedTargets(prev => prev.filter(t => !t.startsWith(targetId)));
      } else if (targetId.includes('레벨')) {
          setTeacherConfig(prev => ({
              ...prev,
              hiddenLevel: [...(prev.hiddenLevel || []), targetId]
          }));
          setSelectedTargets(prev => prev.filter(t => t !== targetId));
      } else if (gradeId) {
          setTeacherConfig(prev => ({
              ...prev,
              extraClassCounts: {
                  ...(prev.extraClassCounts || {}),
                  [gradeId]: ((prev.extraClassCounts || {})[gradeId] || 0) - 1
              }
          }));
          setSelectedTargets(prev => prev.filter(t => t !== targetId));
      }
      setActiveMenuId(null);
  };

  const handleRenameSave = () => {
      if (renamingId) {
          setTeacherConfig(prev => ({
              ...prev,
              customLabels: {
                  ...(prev.customLabels || {}),
                  [renamingId]: renameValue.trim()
              }
          }));
      }
      setRenamingId(null);
      setRenameValue('');
  };

  const toggleTarget = (target: string) => {
    setSelectedTargets(prev => 
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    );
  };

  const handleGradeLabelClick = (grade: string) => {
    const numGrade = parseInt(grade);
    const baseCount = !isNaN(numGrade) ? (schoolInfo.classesPerGrade[numGrade] || 0) : 0;
    const extraCounts = teacherConfig.extraClassCounts || {};
    const classCount = Math.max(0, baseCount + (extraCounts[grade] || 0));
    
    const targets: string[] = [];
    for (let i = 1; i <= classCount; i++) {
        targets.push(`${grade}-${i}`);
    }
    
    const allSelected = targets.length > 0 && targets.every(t => selectedTargets.includes(t));

    if (allSelected) {
        setSelectedTargets(prev => prev.filter(t => !targets.includes(t)));
    } else {
        setSelectedTargets(prev => {
            const newSet = new Set([...prev, ...targets]);
            return Array.from(newSet);
        });
    }
  };

  const handleRemoveGradeRow = (e: React.MouseEvent, gradeToRemove: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (deletingGradeId === gradeToRemove) {
          setTeacherConfig(prev => ({
              ...prev,
              grades: (prev.grades || []).filter(g => g !== gradeToRemove)
          }));
          setSelectedTargets(prev => prev.filter(t => !t.startsWith(gradeToRemove)));
          setDeletingGradeId(null);
      } else {
          setDeletingGradeId(gradeToRemove);
          setTimeout(() => {
              setDeletingGradeId(prev => (prev === gradeToRemove ? null : prev));
          }, 3000);
      }
  };

  const handleAddClassButton = (grade: string) => {
    setTeacherConfig(prev => ({
        ...prev,
        extraClassCounts: {
            ...(prev.extraClassCounts || {}),
            [grade]: ((prev.extraClassCounts || {})[grade] || 0) + 1
        }
    }));
  };
  
  const handleAddLevelClass = (grade: string) => {
      setTeacherConfig(prev => ({
          ...prev,
          levelClassCounts: {
              ...(prev.levelClassCounts || {}),
              [grade]: ((prev.levelClassCounts || {})[grade] || 1) + 1
          }
      }));
  };

  const handleAddGrade = () => {
      const newId = `custom-${Date.now()}`;
      setTeacherConfig(prev => ({
          ...prev,
          grades: [...(prev.grades || []), newId],
          customLabels: { ...(prev.customLabels || {}), [newId]: '' }
      }));
  };

  const handleGradeDragStart = (e: React.DragEvent, grade: string) => {
      setDraggedGrade(grade);
      e.dataTransfer.effectAllowed = 'move';
  };
  const handleGradeDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };
  const handleGradeDrop = (e: React.DragEvent, targetGrade: string) => {
      e.preventDefault();
      if (draggedGrade === null || draggedGrade === targetGrade) return;
      
      const sourceIndex = (teacherConfig.grades || []).indexOf(draggedGrade);
      const targetIndex = (teacherConfig.grades || []).indexOf(targetGrade);
      
      const newGrades = [...(teacherConfig.grades || [])];
      const [moved] = newGrades.splice(sourceIndex, 1);
      newGrades.splice(targetIndex, 0, moved);
      
      setTeacherConfig(prev => ({ ...prev, grades: newGrades }));
      setDraggedGrade(null);
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-8 p-6 pb-20">
       <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" />
            전담 교사 배정 관리
        </h1>
        <p className="text-slate-500">전담 교사를 등록하고 담당 과목 및 대상 학급을 설정합니다.</p>
      </header>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Teacher List */}
        <div className="w-full xl:w-1/3 space-y-4 xl:sticky xl:top-6 self-start">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[calc(100vh-3rem)]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-700">등록된 교사 목록 ({teachers.length})</h2>
                    <button onClick={resetForm} className="text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                        <Plus size={16}/> 신규 등록
                    </button>
                </div>
                
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    {teachers.map((teacher, index) => (
                        <div 
                            key={teacher.id}
                            className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md
                                ${editingTeacherId === teacher.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}
                            `}
                            onClick={() => startEditTeacher(teacher)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {/* Reorder Controls */}
                                    <div className="flex items-center gap-0.5 bg-slate-100 rounded px-1 mr-1 border border-slate-200" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => moveTeacher(index, 'up')} className="p-0.5 hover:bg-white hover:text-indigo-600 text-slate-400 rounded transition-colors"><ArrowUp size={10}/></button>
                                        <input 
                                            className="w-4 text-center text-[10px] outline-none font-bold text-slate-600 bg-transparent" 
                                            defaultValue={index + 1}
                                            onBlur={(e) => moveToSpecificIndex(index, e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && moveToSpecificIndex(index, e.currentTarget.value)}
                                        />
                                        <button onClick={() => moveTeacher(index, 'down')} className="p-0.5 hover:bg-white hover:text-indigo-600 text-slate-400 rounded transition-colors"><ArrowDown size={10}/></button>
                                    </div>

                                    <div className={`w-3 h-3 rounded-full bg-${teacher.color.split('-')[1] || 'gray'}-500`}></div>
                                    <span className="font-bold text-slate-800">{teacher.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTeacherClick(teacher.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        title="삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 pl-12">
                                {teacher.assignments.map((assign, idx) => (
                                    <div key={idx} className="text-xs flex items-center gap-1 text-slate-600">
                                        <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{assign.subject}</span>
                                        {assign.roomId && <span className="text-slate-400">({rooms.find(r=>r.id===assign.roomId)?.name})</span>}
                                        <span className="text-slate-500">
                                            → {getFormattedTargets(assign.targets)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {teachers.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed">
                            등록된 전담 교사가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="w-full xl:w-2/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {editingTeacherId ? <UserPlus className="text-indigo-600"/> : <Plus className="text-indigo-600"/>}
                    {editingTeacherId ? '교사 정보 수정' : '신규 교사 등록'}
                </h2>
                {editingTeacherId && (
                    <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-800">
                        취소하고 신규 등록하기
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">이름</label>
                    <input 
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="예: 영어전담, 체육부장"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">표시 색상</label>
                    <div className="relative">
                        <button 
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={`w-full px-4 py-2 border rounded-lg text-left flex items-center gap-2 hover:bg-slate-50 ${getSelectedColorData().class}`}
                        >
                            <Palette size={16} />
                            <span>{getSelectedColorData().category} - {newTeacherColor}</span>
                        </button>
                        
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-2 z-20 bg-white border rounded-xl shadow-xl p-3 w-80 max-h-80 overflow-y-auto">
                                <div className="grid grid-cols-5 gap-2">
                                {COLOR_PALETTE.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => { setNewTeacherColor(c.id); setShowColorPicker(false); }}
                                        className={`w-10 h-10 rounded-lg border-2 hover:scale-110 transition-transform ${c.class} ${newTeacherColor === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'border-transparent'}`}
                                        title={`${c.category} - ${c.id}`}
                                    />
                                ))}
                                </div>
                            </div>
                        )}
                        {showColorPicker && <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)}></div>}
                    </div>
                </div>
            </div>

            {/* Assignments Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">담당 과목 배정</label>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-6">
                    {/* 1. Subject & Room Select */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">과목</label>
                            <select 
                                value={currentAssignSubject}
                                onChange={(e) => setCurrentAssignSubject(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                                <option value="" disabled>선택</option>
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">전담 교실 (선택)</label>
                            <select 
                                value={currentAssignRoom}
                                onChange={(e) => setCurrentAssignRoom(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                                <option value="">교실 없음 (각 반 교실)</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 2. Target Selection Matrix */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <label className="block text-xs font-bold text-slate-500">대상 학년/학급 선택 (선택 안하면 전체 대상)</label>
                                <button
                                    onClick={() => { setIsLabelEditMode(!isLabelEditMode); setActiveMenuId(null); setRenamingId(null); }}
                                    className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors border
                                        ${isLabelEditMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}
                                    `}
                                    title="학년/학급 설정 모드 (순서 변경, 삭제, 명칭 수정)"
                                >
                                    {isLabelEditMode ? <Check size={14}/> : <Settings size={14}/>}
                                    {isLabelEditMode ? '설정 완료' : '설정'}
                                </button>
                            </div>
                            <div className="text-xs text-indigo-600 font-bold">
                                {selectedTargets.length > 0 ? `선택됨: ${getFormattedTargets(selectedTargets)}` : '전체 학년 대상'}
                            </div>
                        </div>
                        
                        <div className={`bg-white border rounded-lg p-4 space-y-3 transition-colors ${isLabelEditMode ? 'border-indigo-300 bg-indigo-50/10' : ''}`}>
                            {(teacherConfig.grades || []).map((grade) => {
                                const numGrade = parseInt(grade);
                                const baseCount = !isNaN(numGrade) ? (schoolInfo.classesPerGrade[numGrade] || 0) : 0;
                                const extraCounts = teacherConfig.extraClassCounts || {};
                                const classCount = Math.max(0, baseCount + (extraCounts[grade] || 0));
                                
                                const levelCounts = teacherConfig.levelClassCounts || {};
                                const levelCount = levelCounts[grade] || 1;

                                return (
                                    <div 
                                        key={grade} 
                                        className={`flex flex-wrap items-center gap-2 p-2 rounded group relative pr-8 transition-colors ${isLabelEditMode ? 'bg-slate-50 border border-dashed border-slate-300' : 'hover:bg-slate-50'}`}
                                        onDragOver={handleGradeDragOver}
                                        onDrop={(e) => isLabelEditMode && handleGradeDrop(e, grade)}
                                        draggable={isLabelEditMode}
                                    >
                                        {/* Drag Handle - Only in Edit Mode */}
                                        {isLabelEditMode && (
                                            <div 
                                                draggable 
                                                onDragStart={(e) => handleGradeDragStart(e, grade)}
                                                className="text-slate-300 cursor-move hover:text-slate-500 mr-2"
                                            >
                                                <GripVertical size={16} />
                                            </div>
                                        )}

                                        {/* Grade Label (Toggle or Edit) */}
                                        {renamingId === grade ? (
                                            <input 
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={handleRenameSave}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                                                className="w-20 px-1 py-1 text-sm border rounded"
                                            />
                                        ) : (
                                            <button 
                                                onClick={() => handleTargetClick(grade, true, grade)}
                                                className={`px-3 py-1.5 rounded text-sm font-bold border transition-colors min-w-[4rem] relative
                                                    ${isLabelEditMode 
                                                        ? 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 border-dashed'
                                                        : (selectedTargets.some(t => t.startsWith(`${grade}-`)) 
                                                            ? 'bg-indigo-600 text-white border-indigo-600' 
                                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200')
                                                    }
                                                `}
                                            >
                                                {getLabel(grade) || <span className="text-slate-400 italic font-normal text-xs">(명칭 입력)</span>}
                                                {isLabelEditMode && activeMenuId !== grade && <MoreVertical size={10} className="absolute top-0 right-0 m-0.5 text-orange-400 opacity-70"/>}
                                            </button>
                                        )}
                                        {activeMenuId === grade && (
                                            <div ref={menuRef} className="absolute top-full left-0 mt-1 z-20 bg-white border rounded shadow-lg flex flex-col min-w-[80px]">
                                                <button onClick={() => handleMenuEdit(grade)} className="text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12}/> 수정</button>
                                                <button onClick={() => handleMenuDelete(grade)} className="text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={12}/> 삭제</button>
                                            </div>
                                        )}
                                        
                                        <div className="w-px h-4 bg-slate-300 mx-1"></div>

                                        {/* Classes */}
                                        {Array.from({ length: classCount }, (_, i) => i + 1).map(c => {
                                            const targetStr = `${grade}-${c}`;
                                            const isEditing = renamingId === targetStr;
                                            
                                            if (isEditing) {
                                                return (
                                                    <input 
                                                        key={c}
                                                        autoFocus
                                                        value={renameValue}
                                                        onChange={(e) => setRenameValue(e.target.value)}
                                                        onBlur={handleRenameSave}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                                                        className="w-16 px-1 py-1 text-sm border rounded"
                                                    />
                                                );
                                            }

                                            return (
                                                <div key={c} className="relative">
                                                    <button
                                                        onClick={() => handleTargetClick(targetStr)}
                                                        className={`px-3 py-1.5 rounded text-sm border transition-colors relative
                                                            ${isLabelEditMode 
                                                                ? 'bg-orange-50 border-orange-300 text-slate-700 hover:bg-orange-100 border-dashed'
                                                                : (selectedTargets.includes(targetStr) 
                                                                    ? 'bg-indigo-500 text-white border-indigo-500' 
                                                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50')
                                                            }
                                                        `}
                                                    >
                                                        {getLabel(targetStr) || <span className="text-slate-400 italic font-normal text-xs scale-90">(명칭 입력)</span>}
                                                        {isLabelEditMode && activeMenuId !== targetStr && <MoreVertical size={10} className="absolute top-0 right-0 m-0.5 text-orange-400 opacity-50"/>}
                                                    </button>
                                                    
                                                    {activeMenuId === targetStr && (
                                                        <div ref={menuRef} className="absolute top-full left-0 mt-1 z-20 bg-white border rounded shadow-lg flex flex-col min-w-[80px]">
                                                            <button onClick={() => handleMenuEdit(targetStr)} className="text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12}/> 수정</button>
                                                            <button onClick={() => handleMenuDelete(targetStr, grade)} className="text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={12}/> 삭제</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Add Class Button - Only in Edit Mode */}
                                        {isLabelEditMode && (
                                            <button 
                                                onClick={() => handleAddClassButton(grade)}
                                                className="px-2 py-1.5 rounded text-xs border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
                                                title="해당 학년 반 추가"
                                            >
                                                + 반추가
                                            </button>
                                        )}

                                        {/* Level Classes (Dynamic Loop) */}
                                        {Array.from({length: levelCount}, (_, i) => i + 1).map(idx => {
                                            const levelId = idx === 1 ? `${grade}레벨` : `${grade}레벨${idx}`;
                                            const isLevelHidden = (teacherConfig.hiddenLevel || []).includes(levelId);
                                            
                                            if (isLevelHidden) return null;

                                            return (
                                                <div key={levelId} className="relative ml-1">
                                                    {renamingId === levelId ? (
                                                        <input 
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={handleRenameSave}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                                                            className="w-16 px-1 py-1 text-sm border rounded"
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleTargetClick(levelId)}
                                                            className={`px-3 py-1.5 rounded text-xs border transition-colors relative
                                                                ${isLabelEditMode
                                                                    ? 'bg-orange-50 border-orange-300 text-slate-700 hover:bg-orange-100 border-dashed'
                                                                    : (selectedTargets.includes(levelId) 
                                                                        ? 'bg-purple-500 text-white border-purple-500' 
                                                                        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100')
                                                                }
                                                            `}
                                                        >
                                                            {getLabel(levelId) || <span className="text-slate-400 italic font-normal text-xs scale-90">(명칭 입력)</span>}
                                                            {isLabelEditMode && activeMenuId !== levelId && <MoreVertical size={10} className="absolute top-0 right-0 m-0.5 text-orange-400 opacity-50"/>}
                                                        </button>
                                                    )}
                                                    {activeMenuId === levelId && (
                                                        <div ref={menuRef} className="absolute top-full left-0 mt-1 z-20 bg-white border rounded shadow-lg flex flex-col min-w-[80px]">
                                                            <button onClick={() => handleMenuEdit(levelId)} className="text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12}/> 수정</button>
                                                            <button onClick={() => handleMenuDelete(levelId)} className="text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={12}/> 삭제</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Add Level Class Button - Only in Edit Mode */}
                                        {isLabelEditMode && (
                                            <button 
                                                onClick={() => handleAddLevelClass(grade)}
                                                className="px-2 py-1.5 rounded text-xs border border-dashed border-purple-300 text-purple-400 hover:text-purple-600 hover:bg-purple-50 ml-1"
                                                title="수준별 수업(레벨) 추가"
                                            >
                                                + 레벨추가
                                            </button>
                                        )}

                                        {/* DELETE ROW BUTTON (Far Right) - Only in Edit Mode */}
                                        {isLabelEditMode && (
                                            <button 
                                                type="button"
                                                onClick={(e) => handleRemoveGradeRow(e, grade)}
                                                className={`absolute right-2 p-1.5 rounded transition-all duration-200 flex items-center gap-1 z-10
                                                    ${deletingGradeId === grade 
                                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-md w-auto px-2' 
                                                        : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                                                    }
                                                `}
                                                title={deletingGradeId === grade ? "확인: 정말 삭제하시겠습니까?" : "이 행 삭제"}
                                            >
                                                {deletingGradeId === grade ? (
                                                    <>
                                                        <AlertTriangle size={14} />
                                                        <span className="text-xs font-bold whitespace-nowrap">삭제 확인</span>
                                                    </>
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add Grade Button - Only in Edit Mode */}
                            {isLabelEditMode && (
                                <button 
                                    onClick={handleAddGrade}
                                    className="w-full py-2 border border-dashed border-slate-300 rounded text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Plus size={14} /> 학년 추가 (빈 항목 생성)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Add Button */}
                    <button 
                        onClick={addAssignment}
                        className="w-full px-3 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus size={18} /> 위 설정으로 배정 추가
                    </button>
                </div>

                {/* Added Assignments List */}
                <div className="space-y-2">
                    {tempAssignments.map((assign, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md font-bold text-sm">
                                    {assign.subject}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-1">
                                    <School size={14} className="text-slate-400"/>
                                    {assign.roomId ? rooms.find(r=>r.id===assign.roomId)?.name : '일반 교실'}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-1">
                                    <GraduationCap size={14} className="text-slate-400"/>
                                    <span className="font-medium text-slate-800">
                                        {getFormattedTargets(assign.targets)}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => removeAssignment(idx)}
                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                    {tempAssignments.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-sm">
                            아직 배정된 과목이 없습니다. 위에서 추가해주세요.
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t pt-6 flex justify-end gap-3">
                 <button 
                    onClick={resetForm}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                    초기화
                </button>
                <button 
                    onClick={handleSaveTeacher}
                    className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-colors"
                >
                    <Save size={18} />
                    {editingTeacherId ? '수정 내용 저장' : '교사 등록 완료'}
                </button>
            </div>
        </div>
      </div>

      {/* Delete Teacher Confirmation Modal */}
      {teacherToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-in zoom-in-95 border-2 border-red-100">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 ring-4 ring-red-50">
                          <Trash2 size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">교사 삭제 확인</h3>
                      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                          정말 이 전담 교사 정보를 삭제하시겠습니까?<br/>
                          <span className="text-red-500 font-bold text-xs mt-1 block">
                              ⚠️ 이미 배정된 시간표가 있다면 함께 삭제됩니다.
                          </span>
                      </p>
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setTeacherToDelete(null)}
                              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                          >
                              취소
                          </button>
                          <button 
                              onClick={confirmDeleteTeacher}
                              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md"
                          >
                              예, 삭제합니다
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
