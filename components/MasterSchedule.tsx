import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSchedule, extractGrade } from '../services/scheduleService';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DAYS } from '../constants';
import { TimeSlot, Teacher, Period, ClassBlock, DayOfWeek, TeacherAssignment, Room, Conflict, SubjectStyle } from '../types';
import { 
  ChevronDown, ChevronUp, AlertTriangle, RefreshCcw, GripVertical, Ban, 
  Edit3, Trash2, X, ClipboardCheck, BarChart3, Settings as SettingsIcon, MoreVertical,
  ArrowLeft, ArrowRight, Eye, Plus, Check, RotateCcw, AlertCircle, MousePointerClick, StickyNote, GripHorizontal, Scaling
} from 'lucide-react';

// Helper to format class names
const formatClassId = (classId: string, config: any) => {
    if (classId === '미배정') return '-';
    if (config.customLabels && config.customLabels[classId]) return config.customLabels[classId];
    
    if (classId.includes('레벨')) {
        const [prefix, suffix] = classId.split('레벨');
        const num = parseInt(suffix);
        if (!isNaN(num)) {
             const circled = (num >= 1 && num <= 20) ? String.fromCharCode(0x2460 + num - 1) : `(${num})`;
             return `${prefix}학년 L${circled}`;
        }
        return `${prefix}학년 L`;
    }
    return classId;
};

// Grade-based Color Intensity with Smart User Preference Preservation
const getGradeAdjustedStyle = (baseStyle: string, classId: string, customStyle?: SubjectStyle) => {
    if (customStyle) {
        return `${customStyle.bgColor} ${customStyle.textColor} ${customStyle.borderColor} ${customStyle.borderWidth} ${customStyle.borderStyle} ${customStyle.fontWeight}`;
    }
    if (classId === '미배정') {
        return 'bg-slate-100 text-slate-400 border-slate-300';
    }
    
    const match = classId.match(/(?:^|-|custom-)?(\d+)/);
    const grade = match ? parseInt(match[1]) : 0;
    
    if (!grade || grade < 1 || grade > 6) return baseStyle;

    const intensity = grade * 100; // 100, 200, ... 600
    const bgMatch = baseStyle.match(/bg-([a-z]+)-(\d+)/);
    if (!bgMatch) return baseStyle;
    
    const bgHue = bgMatch[1];
    
    let newStyle = baseStyle.replace(/bg-[a-z]+-\d+/, `bg-${bgHue}-${intensity}`);

    const textMatch = baseStyle.match(/text-([a-z]+)-(\d+)/);
    if (textMatch) {
        const textHue = textMatch[1];
        if (textHue === bgHue || ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(textHue)) {
             const isLightHue = ['yellow', 'amber', 'lime', 'cyan', 'orange'].includes(bgHue);
             let newTextColor = `text-${bgHue}-900`; 
             
             if (intensity >= 500) {
                 newTextColor = isLightHue ? `text-${bgHue}-950` : 'text-white';
             } else if (intensity >= 400 && !isLightHue) {
                 newTextColor = 'text-white';
             }
             newStyle = newStyle.replace(/text-[a-z]+-\d+/, newTextColor);
        }
    }

    const borderMatch = baseStyle.match(/border-([a-z]+)-(\d+)/);
    if (borderMatch) {
        const borderHue = borderMatch[1];
        if (borderHue === bgHue || ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(borderHue)) {
             const borderIntensity = Math.min(intensity + 200, 900);
             const newBorderColor = `border-${bgHue}-${borderIntensity}`;
             newStyle = newStyle.replace(/border-[a-z]+-\d+/, newBorderColor);
        }
    }
        
    return newStyle;
};

// New Helper: Reverse engineer row ID from a target string to correctly set select value
const getRowIdFromTarget = (target: string, grades: string[]) => {
    if (!target) return '';
    const sortedGrades = [...grades].sort((a, b) => b.length - a.length);
    
    for (const gradeId of sortedGrades) {
        if (target === gradeId || target.startsWith(`${gradeId}-`) || target.startsWith(`${gradeId}레벨`)) {
            return gradeId;
        }
    }
    const match = target.match(/^(\d+)/);
    return match ? match[1] : '';
};

// Item Types for DnD
const ItemTypes = {
    SLOT: 'slot'
};

// --- Components ---

const DroppableCell: React.FC<{ 
    day: DayOfWeek, 
    period: Period, 
    teacherId: string, 
    slot?: TimeSlot, 
    onDrop: (item: any, day: DayOfWeek, period: Period) => void,
    onCellClick: (teacherId: string, day: DayOfWeek, period: Period, e: React.MouseEvent) => void,
    onDeleteClick: (slotId: string) => void,
    onSlotMouseEnter?: (slot: TimeSlot) => void,
    onSlotMouseLeave?: () => void,
    isConflict: boolean,
    isHighlighted: boolean,
    isSwapSource: boolean,
    isSwapTarget: boolean,
    isPreviewValid: boolean,
    isModeActive: boolean, 
    etcInfo: { name: string, isBlocked: boolean } | null,
    teacherConfig: any,
    getSubjectColor: any,
    rooms: Room[]
}> = ({ day, period, teacherId, slot, onDrop, onCellClick, onDeleteClick, onSlotMouseEnter, onSlotMouseLeave, isConflict, isHighlighted, isSwapSource, isSwapTarget, isPreviewValid, isModeActive, etcInfo, teacherConfig, getSubjectColor, rooms }) => {
    
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: [ItemTypes.SLOT],
        drop: (item) => onDrop(item, day, period),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
        canDrop: () => !etcInfo?.isBlocked
    }), [etcInfo]);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.SLOT,
        item: { type: 'move', slot },
        canDrag: !!slot,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [slot]);

    let cellClass = "h-12 border-b border-r relative transition-all text-xs flex flex-col items-center justify-center p-0.5 group ";
    
    // Background Logic Priority
    if (isSwapSource) cellClass += "bg-indigo-100 ring-2 ring-inset ring-indigo-500 z-10 ";
    else if (isSwapTarget) cellClass += "bg-green-50 ring-2 ring-inset ring-green-500 cursor-pointer ";
    else if (isPreviewValid) cellClass += "bg-emerald-50 ring-2 ring-inset ring-emerald-400 cursor-pointer animate-pulse "; // Preview
    else if (isConflict) {
        cellClass += "bg-red-50 z-20 "; 
    }
    else if (isOver && canDrop) cellClass += "bg-indigo-50 ring-2 ring-inset ring-indigo-300 ";
    else if (etcInfo?.isBlocked) cellClass += "bg-slate-50 "; 
    else cellClass += "bg-white hover:bg-slate-50 cursor-pointer ";

    // Mode Active Cursor Fix
    if (isModeActive && !isSwapSource && !isSwapTarget && !isPreviewValid) {
        cellClass = cellClass.replace("cursor-pointer", "cursor-not-allowed opacity-60");
    }

    // Highlighting Logic (Blinking Yellow for conflicting partners)
    if (isHighlighted) {
        cellClass += "animate-pulse ring-4 ring-yellow-400 bg-yellow-100 z-50 ";
    }

    // Custom Conflict Style (Hazard Border)
    const conflictStyle: React.CSSProperties = isConflict && !isHighlighted ? {
        border: "3px solid transparent",
        borderImage: "repeating-linear-gradient(-45deg, #000 0, #000 5px, #dc2626 0, #dc2626 10px) 1",
        boxShadow: "inset 0 0 4px rgba(220, 38, 38, 0.5)"
    } : {};

    const renderContent = () => {
        if (etcInfo?.isBlocked) {
            return (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-bold select-none text-center leading-tight p-1">
                    {etcInfo.name}
                </div>
            );
        }
        if (slot) {
            // Apply styles
            const isOther = slot.subject === '기타';
            const baseStyle = getSubjectColor(slot.subject);
            let contentClass = `w-full h-full rounded flex flex-col items-center justify-center ${isDragging ? 'opacity-50' : 'opacity-100'} `;
            
            // Use Gradient Logic here
            if (isOther && slot.customStyle) {
                contentClass += `${slot.customStyle.bgColor} ${slot.customStyle.textColor} border ${slot.customStyle.borderColor}`;
            } else {
                // Apply Grade Gradient
                contentClass += getGradeAdjustedStyle(baseStyle, slot.classId, slot.customStyle);
            }

            // Lookup room name if roomId exists
            const roomName = slot.roomId ? rooms.find(r => r.id === slot.roomId)?.name : '';

            return (
                <div 
                    ref={drag as unknown as React.Ref<HTMLDivElement>} 
                    className={`${contentClass} relative group-hover:ring-1 group-hover:ring-slate-300`}
                    onMouseEnter={() => onSlotMouseEnter?.(slot)}
                    onMouseLeave={() => onSlotMouseLeave?.()}
                >
                    <span className="font-bold truncate w-full text-center leading-tight text-xs">
                        {isOther ? (slot.customText || '기타') : formatClassId(slot.classId, teacherConfig)}
                    </span>
                    
                    {/* Tooltip for Subject Name (Hover) */}
                    {!isOther && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap font-bold">
                            {slot.subject}
                            {roomName ? ` (${roomName})` : ''}
                            {/* Little Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                    )}

                    {isConflict && <AlertTriangle size={12} className="text-red-600 bg-white rounded-full p-0.5 absolute top-0.5 right-0.5 shadow-sm" />}
                    
                    {/* Hover Delete Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(slot.id); }}
                        className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded p-0.5 transition-all shadow-sm"
                        title="삭제"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            );
        }
        if (isPreviewValid) {
            return <div className="text-emerald-500 animate-bounce"><MousePointerClick size={20} /></div>
        }
        return null;
    };

    return (
        <div ref={drop as unknown as React.Ref<HTMLDivElement>} onClick={(e) => onCellClick(teacherId, day, period, e)} className={cellClass} style={conflictStyle}>
            {renderContent()}
        </div>
    );
};

export const MasterSchedule: React.FC = () => {
  const { 
      timetable, teachers, setTeachers, teacherConfig, schoolInfo, subjects,
      removeTimeSlot, updateTimeSlot, addTimeSlot, checkConflict,
      getUnassignedSpecialistBlocks, getSubjectColor, updateTeacher, clearTeacherSchedule,
      rooms
  } = useSchedule();

  const [activePeriods, setActivePeriods] = useState<Period[]>([]);
  const [columnsPerRow, setColumnsPerRow] = useState(3);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [swapSourceTeacherId, setSwapSourceTeacherId] = useState<string | null>(null);
  
  const [activeCell, setActiveCell] = useState<{teacherId: string, day: DayOfWeek, period: Period} | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [otherBlockText, setOtherBlockText] = useState('');
  
  const [previewBlock, setPreviewBlock] = useState<ClassBlock | null>(null);
  const [assigningData, setAssigningData] = useState<{ block: ClassBlock, teacherId: string } | null>(null);

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [tempTeacherName, setTempTeacherName] = useState('');
  const [tempMaxHours, setTempMaxHours] = useState(20);
  const [tempAssignments, setTempAssignments] = useState<TeacherAssignment[]>([]);
  
  const [resetConfirmTeacherId, setResetConfirmTeacherId] = useState<string | null>(null);
  const [highlightedConflictIds, setHighlightedConflictIds] = useState<Set<string>>(new Set());

  // Memo State (Updated: Size and Resizing)
  const [activeMemo, setActiveMemo] = useState<{ 
      teacherId: string, 
      text: string, 
      x: number, 
      y: number,
      width: number,
      height: number
  } | null>(null);
  
  const interactionRef = useRef<{ 
      type: 'drag' | 'resize' | null, 
      startX: number, 
      startY: number, 
      initialX: number, 
      initialY: number,
      initialW: number, 
      initialH: number 
  }>({ 
      type: null, 
      startX: 0, 
      startY: 0, 
      initialX: 0, 
      initialY: 0, 
      initialW: 0, 
      initialH: 0 
  });

  useEffect(() => {
      const periods = new Set<number>();
      // Added optional chaining for safety when loading legacy files without bellSchedules
      schoolInfo.bellSchedules?.forEach(s => {
          Object.keys(s.periods).forEach(p => periods.add(Number(p)));
      });
      const sorted = Array.from(periods).sort((a,b)=>a-b) as Period[];
      setActivePeriods(sorted.length > 0 ? sorted : [1,2,3,4,5,6]);
  }, [schoolInfo]);

  // Unified Mouse Handling for Drag & Resize
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!interactionRef.current.type || !activeMemo) return;
          
          const deltaX = e.clientX - interactionRef.current.startX;
          const deltaY = e.clientY - interactionRef.current.startY;

          if (interactionRef.current.type === 'drag') {
              setActiveMemo(prev => prev ? { 
                  ...prev, 
                  x: interactionRef.current.initialX + deltaX, 
                  y: interactionRef.current.initialY + deltaY 
              } : null);
          } else if (interactionRef.current.type === 'resize') {
              setActiveMemo(prev => prev ? {
                  ...prev,
                  width: Math.max(250, interactionRef.current.initialW + deltaX),
                  height: Math.max(200, interactionRef.current.initialH + deltaY)
              } : null);
          }
      };
      
      const handleMouseUp = () => {
          interactionRef.current.type = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [activeMemo]);

  const handleInteractionStart = (e: React.MouseEvent, type: 'drag' | 'resize') => {
      if (!activeMemo) return;
      e.preventDefault(); // Prevent text selection
      interactionRef.current = {
          type,
          startX: e.clientX,
          startY: e.clientY,
          initialX: activeMemo.x,
          initialY: activeMemo.y,
          initialW: activeMemo.width,
          initialH: activeMemo.height
      };
  };

  const openMemo = (teacher: Teacher) => {
      // Default Size enlarged: 400x320
      setActiveMemo({
          teacherId: teacher.id,
          text: teacher.memo || '',
          x: window.innerWidth / 2 - 200, // Center X based on new width
          y: window.innerHeight / 2 - 160, // Center Y based on new height
          width: 400,
          height: 320
      });
  };

  const saveMemo = () => {
      if (!activeMemo) return;
      const teacher = teachers.find(t => t.id === activeMemo.teacherId);
      if (teacher) {
          updateTeacher({ ...teacher, memo: activeMemo.text });
      }
      setActiveMemo(null);
  };

  const deleteMemo = () => {
      if (!activeMemo) return;
      const teacher = teachers.find(t => t.id === activeMemo.teacherId);
      if (teacher) {
          updateTeacher({ ...teacher, memo: '' });
      }
      setActiveMemo(null);
  };

  const displayedTeachers = useMemo(() => {
      if (selectedTeacherIds.length === 0) return teachers;
      return teachers.filter(t => selectedTeacherIds.includes(t.id));
  }, [teachers, selectedTeacherIds]);

  const conflictMap = useMemo(() => {
      const map = new Set<string>();
      timetable.forEach(t => {
          if (checkConflict(t).hasConflict) map.add(t.id);
      });
      return map;
  }, [timetable, checkConflict]);

  // Handle slot mouse enter to highlight conflicting slots
  const handleSlotMouseEnter = (slot: TimeSlot) => {
      const conflict = checkConflict(slot);
      if (conflict.hasConflict && conflict.conflictingSlots) {
          const conflictingIds = new Set<string>();
          conflict.conflictingSlots.forEach(s => conflictingIds.add(s.id));
          setHighlightedConflictIds(conflictingIds);
      }
  };

  const handleSlotMouseLeave = () => {
      setHighlightedConflictIds(new Set());
  };

  const handleDrop = (item: any, targetTeacherId: string, day: DayOfWeek, period: Period) => {
      if (item.type === 'move') {
          const slot = item.slot as TimeSlot;
          if (slot.teacherId === targetTeacherId && slot.day === day && slot.period === period) return; 

          const existing = timetable.find(t => t.teacherId === targetTeacherId && t.day === day && t.period === period);
          if (existing) {
              updateTimeSlot({ ...existing, day: slot.day, period: slot.period }); 
              updateTimeSlot({ ...slot, day, period });
          } else {
              updateTimeSlot({ ...slot, day, period }); 
          }
      }
  };

  const getEtcInfo = (period: Period) => {
      // Safety check for legacy files
      if (!schoolInfo.bellSchedules || schoolInfo.bellSchedules.length === 0) return null;

      const p = schoolInfo.bellSchedules[0]?.periods[period];
      if (p?.type === 'ETC') return { name: p.name || '기타', isBlocked: true };
      
      if (schoolInfo.hasDistinctSchedules) {
          const pB = schoolInfo.bellSchedules[1]?.periods[period];
          if (pB?.type === 'ETC') return { name: pB.name || '기타', isBlocked: true };
      }
      return null;
  };

  const getBellTime = (scheduleIndex: number, period: Period) => {
      // Safety check for legacy files
      if (!schoolInfo.bellSchedules || !schoolInfo.bellSchedules[scheduleIndex]) return null;

      const p = schoolInfo.bellSchedules[scheduleIndex].periods[period];
      return p ? { start: p.start, end: p.end, name: p.name } : null;
  };

  // Helper Functions for Validity (Moved up)
  const isSlotValidForPreview = (teacherId: string, day: DayOfWeek, period: Period) => {
      const etc = getEtcInfo(period);
      if (etc?.isBlocked) return false;

      // Priority: Check previewBlock (Hover)
      if (previewBlock && previewBlock.id.startsWith(teacherId)) { 
          const existing = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);
          return !existing; 
      }
      
      // Fallback: Check assigningData (Eye Mode)
      if (assigningData && assigningData.teacherId === teacherId) {
          const existing = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);
          if (existing) return false;

          // Check conflict for assigning data
          const tempSlot: TimeSlot = {
              id: 'temp-assign-check',
              teacherId, day, period,
              classId: assigningData.block.classId,
              subject: assigningData.block.subject,
              roomId: assigningData.block.roomId
          };
          const conflict = checkConflict(tempSlot);
          return !conflict.hasConflict;
      }
      return false;
  };

  const checkSwapPossible = (targetTeacherId: string, day: DayOfWeek, period: Period) => {
      if (!swapSourceId || !swapSourceTeacherId) return false;
      if (targetTeacherId !== swapSourceTeacherId) return false;

      const sourceSlot = timetable.find(t => t.id === swapSourceId);
      if (!sourceSlot) return false;
      if (sourceSlot.day === day && sourceSlot.period === period) return false;

      const targetSlot = timetable.find(t => t.teacherId === targetTeacherId && t.day === day && t.period === period);

      // Check ETC/Schedule Block for SOURCE being moved to TARGET
      const sourceGrade = extractGrade(sourceSlot.classId);
      let schedule = schoolInfo.bellSchedules?.[0]; // Safe access
      if (schoolInfo.hasDistinctSchedules && sourceGrade > 0 && schoolInfo.bellSchedules) {
          const found = schoolInfo.bellSchedules.find(s => s.targetGrades.includes(sourceGrade));
          if (found) schedule = found;
      }
      if (schedule?.periods?.[period]?.type === 'ETC') return false;

      // Check conflict for moving source to target
      const bgTimetable: TimeSlot[] = timetable.filter(t => t.id !== sourceSlot.id && t.id !== targetSlot?.id);
      
      const tempSourceAtTarget: TimeSlot = { 
          ...sourceSlot, 
          teacherId: targetTeacherId, 
          day, 
          period, 
          id: 'temp-swap-1' 
      };
      
      const conflict1 = checkConflict(tempSourceAtTarget, bgTimetable);
      if (conflict1.hasConflict) return false;

      // If target has slot, check conflict moving to source position
      if (targetSlot) {
          const targetGrade = extractGrade(targetSlot.classId);
          let targetSched = schoolInfo.bellSchedules?.[0]; // Safe access
          if (schoolInfo.hasDistinctSchedules && targetGrade > 0 && schoolInfo.bellSchedules) {
               const found = schoolInfo.bellSchedules.find(s => s.targetGrades.includes(targetGrade));
               if (found) targetSched = found;
          }
          if (targetSched?.periods?.[sourceSlot.period]?.type === 'ETC') return false;

          const tempTargetAtSource: TimeSlot = {
              ...targetSlot,
              teacherId: sourceSlot.teacherId!,
              day: sourceSlot.day,
              period: sourceSlot.period,
              id: 'temp-swap-2'
          };
          const conflict2 = checkConflict(tempTargetAtSource, bgTimetable);
          if (conflict2.hasConflict) return false;
      }

      return true;
  };

  const handleCellClick = (teacherId: string, day: DayOfWeek, period: Period, e: React.MouseEvent) => {
      // 1. Assign Mode Strict Check
      if (assigningData) {
          if (teacherId !== assigningData.teacherId) return; // Wrong teacher
          
          const isValid = isSlotValidForPreview(teacherId, day, period);
          if (!isValid) return; // Invalid slot click ignored

          const existing = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);
          if (existing) removeTimeSlot(existing.id);

          addTimeSlot({
              id: `${teacherId}-${day}-${period}-${Date.now()}`,
              teacherId, day, period,
              classId: assigningData.block.classId,
              subject: assigningData.block.subject,
              roomId: assigningData.block.roomId
          });
          setAssigningData(null);
          setPreviewBlock(null); // Ensure preview is cleared
          return;
      }

      // 2. Swap Mode Strict Check
      if (swapSourceId) {
          const isSwapValid = checkSwapPossible(teacherId, day, period);
          if (!isSwapValid) return; // Invalid swap click ignored

          handleSwapTargetClick(teacherId, day, period);
          return;
      }
      
      // 3. Normal Context Menu
      setActiveCell({ teacherId, day, period });
      
      const modalWidth = 300;
      const windowWidth = window.innerWidth;
      let x = e.clientX + 20; 
      if (e.clientX + modalWidth > windowWidth - 20) {
          x = e.clientX - modalWidth - 20;
      }
      let y = e.clientY;
      if (y > window.innerHeight - 400) y = window.innerHeight - 420;
      setMenuPos({ x, y });
  };

  const handleSwapTargetClick = (teacherId: string, day: DayOfWeek, period: Period) => {
      if (!swapSourceId) return;
      const sourceSlot = timetable.find(t => t.id === swapSourceId);
      const targetSlot = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);

      if (sourceSlot) {
          if (targetSlot) {
              updateTimeSlot({ ...sourceSlot, teacherId, day, period });
              updateTimeSlot({ ...targetSlot, teacherId: sourceSlot.teacherId!, day: sourceSlot.day, period: sourceSlot.period });
          } else {
              updateTimeSlot({ ...sourceSlot, teacherId, day, period });
          }
      }
      setSwapSourceId(null);
      setSwapSourceTeacherId(null);
  };

  const handleAssignBlock = (block: ClassBlock) => {
      if (!activeCell) return;
      const { teacherId, day, period } = activeCell;
      const existing = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);
      if (existing) removeTimeSlot(existing.id);

      addTimeSlot({
          id: `${teacherId}-${day}-${period}-${Date.now()}`,
          teacherId, day, period,
          classId: block.classId,
          subject: block.subject,
          roomId: block.roomId
      });
      setActiveCell(null);
  };

  const handleEnterAssignMode = (block: ClassBlock, teacherId: string) => {
      setAssigningData({ block, teacherId });
      setPreviewBlock(null); // Explicitly clear preview to prevent sticking
      setActiveCell(null);
  };

  const handleDeleteSlot = (slotId?: string) => {
      if (slotId) {
          removeTimeSlot(slotId);
      } else if (activeCell) {
          const t = timetable.find(t => t.teacherId === activeCell.teacherId && t.day === activeCell.day && t.period === activeCell.period);
          if (t) removeTimeSlot(t.id);
          setActiveCell(null);
      }
  };

  const handleStartSwap = () => {
      if (!activeCell) return;
      const t = timetable.find(t => t.teacherId === activeCell.teacherId && t.day === activeCell.day && t.period === activeCell.period);
      if (t) {
          setSwapSourceId(t.id);
          setSwapSourceTeacherId(activeCell.teacherId);
          setActiveCell(null);
      } else {
          alert("교환할 수업이 없습니다.");
      }
  };

  const handleSaveOtherBlock = () => {
      if (!activeCell) return;
      const { teacherId, day, period } = activeCell;
      const existing = timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period);
      if (existing) removeTimeSlot(existing.id);

      addTimeSlot({
          id: `${teacherId}-${day}-${period}-other-${Date.now()}`,
          teacherId, day, period,
          classId: '기타', subject: '기타',
          customText: otherBlockText || '기타'
      });
      setIsOtherModalOpen(false);
      setActiveCell(null);
  };

  const moveTeacher = (index: number, direction: 'left' | 'right') => {
      if (direction === 'left' && index > 0) {
          const newTeachers = [...teachers];
          [newTeachers[index], newTeachers[index - 1]] = [newTeachers[index - 1], newTeachers[index]];
          setTeachers(newTeachers);
      } else if (direction === 'right' && index < teachers.length - 1) {
          const newTeachers = [...teachers];
          [newTeachers[index], newTeachers[index + 1]] = [newTeachers[index + 1], newTeachers[index]];
          setTeachers(newTeachers);
      }
  };

  const moveToSpecificIndex = (currentIndex: number, targetIndexStr: string) => {
      const targetIndex = parseInt(targetIndexStr) - 1;
      if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= teachers.length || targetIndex === currentIndex) return;
      
      const newTeachers = [...teachers];
      const [moved] = newTeachers.splice(currentIndex, 1);
      newTeachers.splice(targetIndex, 0, moved);
      setTeachers(newTeachers);
  };

  const handleUpdateTeacherSettings = () => {
      if (!editingTeacher) return;
      updateTeacher({
          ...editingTeacher,
          name: tempTeacherName,
          maxHours: tempMaxHours,
          assignments: tempAssignments
      });
      setEditingTeacher(null);
  };

  const handleConfirmReset = () => {
      if (resetConfirmTeacherId) {
          clearTeacherSchedule(resetConfirmTeacherId);
          setResetConfirmTeacherId(null);
          setEditingTeacher(null);
      }
  };

  const getFilteredBlocks = (teacherId: string, day: DayOfWeek, period: Period) => {
      const allBlocks = getUnassignedSpecialistBlocks(teacherId);
      
      return allBlocks.reduce<{ block: ClassBlock, conflict: Conflict }[]>((acc, block) => {
          const tempSlot: TimeSlot = {
              id: 'temp-check',
              teacherId,
              day,
              period,
              classId: block.classId,
              subject: block.subject,
              roomId: block.roomId
          };
          const currentTimetableFiltered = timetable.filter(t => 
              !(t.teacherId === teacherId && t.day === day && t.period === period)
          );
          const conflict = checkConflict(tempSlot, currentTimetableFiltered);
          const isTeacherBusy = conflict.hasConflict && conflict.conflictingSlots?.some(s => s.teacherId === teacherId);
          
          if (!isTeacherBusy) {
              acc.push({ block, conflict });
          }
          return acc;
      }, []);
  };

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-100 relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1">
            <button onClick={() => setSelectedTeacherIds([])} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedTeacherIds.length === 0 ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-300'}`}>전체 보기</button>
            {teachers.map(t => (
                <button key={t.id} onClick={() => setSelectedTeacherIds(prev => prev.includes(t.id) ? prev.filter(tid => tid !== t.id) : [...prev, t.id])} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedTeacherIds.includes(t.id) ? `bg-${t.color.split('-')[1] || 'gray'}-100 text-${t.color.split('-')[1] || 'gray'}-800 border-${t.color.split('-')[1] || 'gray'}-300` : 'bg-white text-slate-500 border-slate-200'}`}>{t.name}</button>
            ))}
        </div>
        <button onClick={() => alert("자동 충돌 감지 중")} className="flex items-center gap-1.5 ml-4 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold"><ClipboardCheck size={14} /> 충돌 점검</button>
      </div>

      <div className="flex-1 flex overflow-hidden flex-row">
        {/* Main Grid */}
        <div className="flex-1 overflow-y-auto p-4">
            {/* Swap Mode Banner */}
            {swapSourceId && (
                <div className="mb-4 bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top-2">
                    <RefreshCcw size={16} className="animate-spin-slow"/> 
                    <span>1:1 교체 모드 (같은 교사의 충돌 없는 초록색 칸을 클릭하여 교체)</span>
                    <button onClick={() => { setSwapSourceId(null); setSwapSourceTeacherId(null); }} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full ml-4 text-xs flex items-center gap-1"><X size={12}/> 종료</button>
                </div>
            )}

            {/* Assign Mode Banner */}
            {assigningData && (
                <div className="mb-4 bg-emerald-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top-2">
                    <MousePointerClick size={16} className="animate-bounce"/> 
                    <span>[{formatClassId(assigningData.block.classId, teacherConfig)} {assigningData.block.subject}] 배정 모드 (초록색 칸 클릭)</span>
                    <button onClick={() => { setAssigningData(null); setPreviewBlock(null); }} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full ml-4 text-xs flex items-center gap-1"><X size={12}/> 종료</button>
                </div>
            )}

            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))` }}>
                {displayedTeachers.map((teacher, index) => {
                    const assignedCount = timetable.filter(t => t.teacherId === teacher.id && t.subject !== '미배정').length;
                    const maxHours = teacher.maxHours || 20;
                    const isSwapActive = swapSourceTeacherId === teacher.id;
                    const isAssignActive = assigningData && assigningData.teacherId === teacher.id;
                    const hasDual = schoolInfo.hasDistinctSchedules;
                    const gridCols = hasDual ? 'grid-cols-7' : 'grid-cols-6';

                    return (
                        <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-auto">
                            {/* Card Header */}
                            <div className="p-3 border-b flex justify-between items-center rounded-t-xl bg-slate-50 relative group">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-white border rounded px-1 mr-2">
                                        <button onClick={() => moveTeacher(index, 'left')} className="p-0.5 hover:bg-slate-100 text-slate-400"><ArrowLeft size={10}/></button>
                                        <input 
                                            key={index}
                                            className="w-4 text-center text-[10px] outline-none font-bold text-slate-600" 
                                            defaultValue={index + 1}
                                            onBlur={(e) => moveToSpecificIndex(index, e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && moveToSpecificIndex(index, e.currentTarget.value)}
                                        />
                                        <button onClick={() => moveTeacher(index, 'right')} className="p-0.5 hover:bg-slate-100 text-slate-400"><ArrowRight size={10}/></button>
                                    </div>
                                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">{teacher.name.substring(0,1)}</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-sm leading-none">{teacher.name}</span>
                                        <span className={`text-[10px] font-bold mt-0.5 ${assignedCount > maxHours ? 'text-red-500' : 'text-slate-500'}`}>
                                            주 {assignedCount} / {maxHours}시간
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {isSwapActive && (
                                        <button 
                                            onClick={() => { setSwapSourceId(null); setSwapSourceTeacherId(null); }}
                                            className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded animate-pulse"
                                        >
                                            교체 종료
                                        </button>
                                    )}
                                    {isAssignActive && (
                                        <button 
                                            onClick={() => { setAssigningData(null); setPreviewBlock(null); }}
                                            className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded animate-pulse"
                                        >
                                            배정 종료
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => openMemo(teacher)} 
                                        className={`p-1.5 hover:bg-yellow-50 rounded border border-transparent hover:border-yellow-200 text-slate-400 hover:text-yellow-600 transition-colors ${teacher.memo ? 'text-yellow-500' : ''}`}
                                        title="메모 열기"
                                    >
                                        <StickyNote size={14} fill={teacher.memo ? "currentColor" : "none"}/>
                                    </button>
                                    <button onClick={() => { setEditingTeacher(teacher); setTempTeacherName(teacher.name); setTempMaxHours(teacher.maxHours || 20); setTempAssignments(teacher.assignments); }} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"><SettingsIcon size={14}/></button>
                                </div>
                            </div>

                            {/* Schedule Grid */}
                            <div className="flex-1 p-2">
                                <div className={`grid ${gridCols} border-b border-slate-200 text-center text-xs font-bold bg-slate-50 text-slate-500`}>
                                    <div className="py-2 border-r">{hasDual ? '저(A)' : '시간'}</div>
                                    {DAYS.map(d => <div key={d} className="py-2 border-r last:border-0">{d}</div>)}
                                    {hasDual && <div className="py-2 text-rose-500 bg-rose-50/50">고(B)</div>}
                                </div>
                                {activePeriods.map(p => {
                                    const etcInfo = getEtcInfo(p);
                                    const tA = getBellTime(0, p);
                                    const tB = hasDual ? getBellTime(1, p) : null;

                                    return (
                                        <div key={p} className={`grid ${gridCols} border-b last:border-0 min-h-[3rem]`}>
                                            {/* Time A */}
                                            <div className={`flex flex-col items-center justify-center text-[10px] font-bold border-r ${etcInfo?.isBlocked ? 'bg-orange-50 text-orange-400' : 'bg-slate-50 text-slate-500'}`}>
                                                {tA?.name || `${p}교시`}
                                                {hasDual && tA && <span className="text-[8px] opacity-70 font-normal scale-90">{tA.start}</span>}
                                            </div>
                                            
                                            {/* Days */}
                                            {DAYS.map(d => {
                                                const slot = timetable.find(t => t.teacherId === teacher.id && t.day === d && t.period === p);
                                                const isConflict = slot ? conflictMap.has(slot.id) : false;
                                                const isPreviewValid = isSlotValidForPreview(teacher.id, d, p);
                                                const isHighlighted = slot ? highlightedConflictIds.has(slot.id) : false;
                                                
                                                // Swap Validity Check
                                                const isSwapValidTarget = checkSwapPossible(teacher.id, d, p);
                                                
                                                const isModeActive = !!(assigningData || swapSourceId);

                                                return (
                                                    <DroppableCell 
                                                        key={`${d}-${p}`}
                                                        day={d} period={p} teacherId={teacher.id}
                                                        slot={slot}
                                                        onDrop={(item, dropDay, dropPeriod) => handleDrop(item, teacher.id, dropDay, dropPeriod)}
                                                        onCellClick={(tid, day, per, e) => handleCellClick(tid, day, per, e)} 
                                                        onDeleteClick={handleDeleteSlot}
                                                        onSlotMouseEnter={handleSlotMouseEnter}
                                                        onSlotMouseLeave={handleSlotMouseLeave}
                                                        isConflict={isConflict}
                                                        isHighlighted={isHighlighted}
                                                        isSwapSource={swapSourceId === slot?.id}
                                                        isSwapTarget={isSwapValidTarget}
                                                        isPreviewValid={isPreviewValid}
                                                        isModeActive={isModeActive}
                                                        etcInfo={etcInfo}
                                                        teacherConfig={teacherConfig}
                                                        getSubjectColor={getSubjectColor}
                                                        rooms={rooms}
                                                    />
                                                );
                                            })}

                                            {/* Time B (Dual) */}
                                            {hasDual && (
                                                <div className="flex flex-col items-center justify-center text-[10px] font-bold border-l bg-rose-50/20 text-rose-400">
                                                    {tB?.name || `${p}교시`}
                                                    {tB && <span className="text-[8px] opacity-70 font-normal scale-90">{tB.start}</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Right Sidebar and Modals ... (Rest of component remains unchanged) */}
        <div className="w-72 bg-white border-l border-slate-200 overflow-y-auto hidden lg:flex flex-col shadow-sm z-10 flex-shrink-0">
            {/* ... Sidebar content ... */}
            <div className="p-4 pb-2 border-b bg-slate-50 sticky top-0 z-20">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border shadow-sm mb-3">
                    <span className="text-xs font-bold text-slate-600">행별 갯수</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setColumnsPerRow(prev => Math.max(1, prev - 1))} className="p-1 rounded bg-slate-100 hover:bg-slate-200"><ChevronDown size={14} /></button>
                        <span className="text-sm font-bold text-indigo-600 w-4 text-center">{columnsPerRow}</span>
                        <button onClick={() => setColumnsPerRow(prev => Math.min(6, prev + 1))} className="p-1 rounded bg-slate-100 hover:bg-slate-200"><ChevronUp size={14} /></button>
                    </div>
                </div>
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 pb-2"><BarChart3 size={16} className="text-indigo-600"/> 배정 현황 (시수)</h3>
            </div>
            <div className="p-4 pt-2 space-y-4">
                {teachers.map(teacher => {
                    const assigned = timetable.filter(t => t.teacherId === teacher.id && t.subject !== '미배정').length;
                    const max = teacher.maxHours || 20;
                    const ratio = Math.min(100, (assigned / max) * 100);
                    return (
                        <div key={teacher.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold">{teacher.name}</span>
                                <span className={`font-mono ${assigned > max ? 'text-red-600' : 'text-slate-500'}`}>{assigned}/{max}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${assigned > max ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${ratio}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Resizable Draggable Memo Modal */}
      {activeMemo && (() => {
          const tName = teachers.find(t => t.id === activeMemo.teacherId)?.name || '메모';
          return (
              <div 
                  className="fixed z-[100] bg-yellow-50 rounded-xl shadow-2xl border border-yellow-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
                  style={{ 
                      top: activeMemo.y, 
                      left: activeMemo.x,
                      width: activeMemo.width,
                      height: activeMemo.height
                  }}
              >
                  <div 
                      className="bg-yellow-100 p-2 flex justify-between items-center cursor-move border-b border-yellow-200 flex-shrink-0"
                      onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                  >
                      <div className="flex items-center gap-1.5 text-yellow-800 font-bold text-xs">
                          <GripHorizontal size={14} className="opacity-50"/>
                          {tName} 선생님 메모
                      </div>
                      <button onClick={saveMemo} className="text-yellow-700 hover:text-yellow-900"><X size={16}/></button>
                  </div>
                  <textarea 
                      value={activeMemo.text}
                      onChange={(e) => setActiveMemo(prev => prev ? {...prev, text: e.target.value} : null)}
                      className="w-full h-full p-4 bg-yellow-50 outline-none text-base resize-none text-slate-700 leading-relaxed scrollbar-thin"
                      placeholder="특이사항, 연가, 출장 등 메모..."
                      autoFocus
                  />
                  <div className="p-2 border-t border-yellow-200 bg-yellow-50/50 flex justify-between items-center flex-shrink-0 relative">
                      <button onClick={deleteMemo} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="메모 삭제"><Trash2 size={14}/></button>
                      
                      {/* Resize Handle */}
                      <div 
                          className="absolute right-0 bottom-0 p-1 cursor-se-resize text-yellow-400 hover:text-yellow-600"
                          onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                      >
                          <Scaling size={16} />
                      </div>

                      <button onClick={saveMemo} className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1.5 rounded text-xs font-bold transition-colors mr-4">저장/닫기</button>
                  </div>
              </div>
          );
      })()}

      {/* Context Menu, Other Modal, Edit Modal... (Keep unchanged) */}
      {activeCell && (
        <>
            <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setActiveCell(null)} />
            <div 
                className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden" 
                style={{ top: menuPos.y, left: menuPos.x }}
            >
                <div className="flex justify-between items-center p-3 border-b bg-slate-50">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MoreVertical size={16} className="text-slate-400"/> 배정 옵션
                    </span>
                    <button onClick={() => handleDeleteSlot()} className="text-xs text-red-500 bg-white border border-red-100 px-2 py-1 rounded hover:bg-red-50 font-bold shadow-sm">
                        삭제
                    </button>
                </div>
                
                <div className="p-3 space-y-2">
                    <button onClick={handleStartSwap} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <RefreshCcw size={16}/> 1:1 교체 모드
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { const t = teachers.find(t=>t.id===activeCell.teacherId); if(t) handleAssignBlock({classId:'미배정', subject:'미배정'} as ClassBlock); }} className="py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1">
                            <Ban size={12}/> 미배정 (-)
                        </button>
                        <button onClick={() => { setIsOtherModalOpen(true); setOtherBlockText(''); }} className="py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1">
                            <Edit3 size={12}/> 기타 (직접 입력)
                        </button>
                    </div>

                    <div className="mt-2">
                        <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider pl-1">
                            배정 가능 블록 (충돌 포함)
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {getFilteredBlocks(activeCell.teacherId, activeCell.day, activeCell.period).map(({ block, conflict }) => (
                                <div key={block.id} className="flex gap-1 group">
                                    <button 
                                        onClick={() => handleAssignBlock(block)}
                                        className={`flex-1 text-left p-2.5 rounded-lg border-2 font-bold text-xs shadow-sm transition-all flex justify-between items-center
                                            ${conflict.hasConflict 
                                                ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                                                : 'border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-700'}
                                        `}
                                        title={conflict.hasConflict ? conflict.reason : '배정 가능'}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {conflict.hasConflict && <AlertTriangle size={12} className="text-red-500" />}
                                            <span>{formatClassId(block.classId, teacherConfig)} ({block.subject})</span>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${conflict.hasConflict ? 'bg-red-200 text-red-800' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {conflict.hasConflict ? '덮어쓰기' : '선택'}
                                        </span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEnterAssignMode(block, activeCell!.teacherId); }}
                                        onMouseEnter={() => setPreviewBlock(block)}
                                        onMouseLeave={() => setPreviewBlock(null)}
                                        className="w-8 flex items-center justify-center border border-slate-200 rounded-lg bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-300 transition-colors cursor-pointer"
                                        title="배정 모드 진입 (클릭하여 배정)"
                                    >
                                        <Eye size={14}/>
                                    </button>
                                </div>
                            ))}
                            {getFilteredBlocks(activeCell.teacherId, activeCell.day, activeCell.period).length === 0 && (
                                <div className="text-center py-6 text-slate-300 text-xs bg-slate-50 rounded-lg border border-dashed">
                                    배정 가능한 블록이 없거나, 해당 교사가 이미 수업 중입니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Other Block Modal */}
      {isOtherModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-5 w-72 animate-in zoom-in-95">
                  <h3 className="font-bold text-slate-800 mb-3 text-lg">기타 활동 입력</h3>
                  <input 
                      value={otherBlockText}
                      onChange={(e) => setOtherBlockText(e.target.value)}
                      placeholder="예: 출장, 연가, 회의"
                      className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm mb-4 focus:border-indigo-500 outline-none font-bold text-slate-700"
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsOtherModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
                      <button onClick={handleSaveOtherBlock} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">확인</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Teacher Settings Modal */}
      {editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <SettingsIcon size={20} className="text-indigo-600"/> 교사 정보 수정
                      </h3>
                      <button onClick={() => setEditingTeacher(null)}><X className="text-slate-400 hover:text-slate-700"/></button>
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">이름</label>
                              <input 
                                  value={tempTeacherName} 
                                  onChange={(e) => setTempTeacherName(e.target.value)} 
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">주당 시수</label>
                              <input 
                                  type="number" 
                                  value={tempMaxHours} 
                                  onChange={(e) => setTempMaxHours(parseInt(e.target.value) || 20)} 
                                  className="w-full px-3 py-2 border rounded-lg text-center font-bold text-sm"
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-500 mb-2 flex justify-between">
                              <span>담당 과목 및 시수</span>
                              <button 
                                onClick={() => {
                                    const teacherSubjects = editingTeacher.assignments.map(a => a.subject);
                                    const uniqueSubjects = [...new Set(teacherSubjects)];
                                    const defaultSub = uniqueSubjects.length > 0 ? uniqueSubjects[0] : (subjects[0] || '국어');
                                    setTempAssignments([...tempAssignments, { subject: defaultSub, hours: 2 }]);
                                }}
                                className="text-indigo-600 hover:bg-indigo-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors"
                              >
                                  <Plus size={10}/> 추가
                              </button>
                          </label>
                          
                          <div className="space-y-2">
                              {tempAssignments.map((assign, idx) => {
                                  const teacherSubjects = [...new Set(editingTeacher.assignments.map(a => a.subject))];
                                  const subjectOptions = teacherSubjects.length > 0 ? teacherSubjects : subjects;

                                  const relatedAssigns = editingTeacher.assignments.filter(a => a.subject === assign.subject);
                                  let gradeOptions = new Set<string>();
                                  let allowAllGrades = false;

                                  if (relatedAssigns.length === 0) {
                                      allowAllGrades = true; 
                                  } else {
                                      relatedAssigns.forEach(a => {
                                          if (!a.targets || a.targets.length === 0) {
                                              allowAllGrades = true;
                                          } else {
                                              a.targets.forEach(t => {
                                                  const rowId = getRowIdFromTarget(t, teacherConfig.grades || []);
                                                  if (rowId) gradeOptions.add(rowId);
                                              });
                                          }
                                      });
                                  }
                                  
                                  const allGrades = teacherConfig.grades || ['1','2','3','4','5','6'];
                                  const finalGradeOptions = allowAllGrades 
                                      ? allGrades 
                                      : allGrades.filter(g => gradeOptions.has(g));

                                  return (
                                  <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                      <select 
                                          value={assign.subject} 
                                          onChange={(e) => {
                                              const newAssigns = [...tempAssignments];
                                              newAssigns[idx] = { ...assign, subject: e.target.value };
                                              setTempAssignments(newAssigns);
                                          }}
                                          className="flex-1 text-xs border rounded p-1"
                                      >
                                          {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <select 
                                          value={(assign.targets && assign.targets.length > 0) ? getRowIdFromTarget(assign.targets[0], teacherConfig.grades || []) : ''}
                                          onChange={(e) => {
                                              const val = e.target.value;
                                              const newAssigns = [...tempAssignments];
                                              newAssigns[idx] = { ...assign, targets: val ? [val] : [] };
                                              setTempAssignments(newAssigns);
                                          }}
                                          className="w-24 text-xs border rounded p-1"
                                      >
                                          <option value="">전체</option>
                                          {finalGradeOptions.map(g => {
                                              const label = teacherConfig.customLabels?.[g] || (['1','2','3','4','5','6'].includes(g) ? `${g}학년` : g);
                                              const displayLabel = label || g; 
                                              return <option key={g} value={g}>{displayLabel}</option>
                                          })}
                                      </select>
                                      <div className="flex items-center gap-1">
                                          <input 
                                              type="number" 
                                              value={assign.hours || 0}
                                              onChange={(e) => {
                                                  const newAssigns = [...tempAssignments];
                                                  newAssigns[idx] = { ...assign, hours: parseInt(e.target.value) || 0 };
                                                  setTempAssignments(newAssigns);
                                              }}
                                              className="w-10 text-center text-xs border rounded p-1"
                                          />
                                          <span className="text-[10px] text-slate-400">시간</span>
                                      </div>
                                      <button 
                                          onClick={() => setTempAssignments(tempAssignments.filter((_, i) => i !== idx))}
                                          className="text-red-300 hover:text-red-500 p-1"
                                      >
                                          <Trash2 size={12}/>
                                      </button>
                                  </div>
                              )})}
                              {tempAssignments.length === 0 && <div className="text-center text-xs text-slate-400 py-2">담당 과목이 없습니다.</div>}
                          </div>
                      </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 pt-3 border-t">
                      <button 
                          onClick={() => setResetConfirmTeacherId(editingTeacher.id)} 
                          className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold mr-auto flex items-center gap-1"
                      >
                          <RotateCcw size={12}/> 시간표 초기화
                      </button>
                      <button onClick={() => setEditingTeacher(null)} className="px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-50 rounded-lg">취소</button>
                      <button onClick={handleUpdateTeacherSettings} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors">저장</button>
                  </div>
              </div>
          </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirmTeacherId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-80 animate-in zoom-in-95 border-2 border-red-100">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                          <AlertCircle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">시간표 초기화 확인</h3>
                      <p className="text-sm text-slate-600 mb-6">
                          해당 교사의 배정된 시간표가 모두 삭제됩니다.<br/>
                          <span className="text-red-500 font-bold text-xs">이 작업은 되돌릴 수 없습니다.</span>
                      </p>
                      <div className="flex gap-2 w-full">
                          <button 
                              onClick={() => setResetConfirmTeacherId(null)}
                              className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-200"
                          >
                              취소
                          </button>
                          <button 
                              onClick={handleConfirmReset}
                              className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 shadow-md"
                          >
                              초기화 실행
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
    </DndProvider>
  );
};