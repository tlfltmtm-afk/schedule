import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule, downloadFile, generateHtmlDoc, printContent, exportToImage } from '../services/scheduleService';
import { DAYS, PERIODS, COLOR_PALETTE } from '../constants';
import { DayOfWeek, Period, TimeSlot, RichTextLine, RichTextStyle, SubjectStyle } from '../types';
import { ChevronDown, Lock, ZoomIn, ZoomOut, Download, FileSpreadsheet, Printer, Trash2, X, RotateCcw, Sparkles, Wand2, Timer, Columns, Maximize, Edit2, Bold, Italic, Underline, Plus, Smile, Check, Type, PanelLeft, PanelRight, Edit3, Palette, User, UserCheck, Image, AlertTriangle } from 'lucide-react';

interface Props {
  onNavigate?: (tab: 'decorator') => void;
}

const COMMON_EMOJIS = ["😊", "📚", "⚽", "🎵", "🎨", "🔬", "🧮", "📝", "🏫", "✨", "📢", "💡"];
const TEXT_COLORS = [
    { label: '기본', value: 'text-slate-800' },
    { label: '빨강', value: 'text-red-600' },
    { label: '파랑', value: 'text-blue-600' },
    { label: '초록', value: 'text-emerald-600' },
    { label: '보라', value: 'text-purple-600' },
    { label: '주황', value: 'text-orange-600' },
    { label: '회색', value: 'text-slate-400' },
];

const FONT_SIZES = [
    { label: '작게', value: 'text-xs' },
    { label: '보통', value: 'text-sm' },
    { label: '크게', value: 'text-base' },
    { label: '더크게', value: 'text-lg' },
    { label: '왕크게', value: 'text-xl' },
    { label: '특대', value: 'text-2xl' },
];

export const ClassSchedule: React.FC<Props> = ({ onNavigate }) => {
  const { getClassList, timetable, addTimeSlot, removeTimeSlot, updateTimeSlot, schoolInfo, subjects, getSubjectColor, setTransferredTimetableCode, rooms, teachers } = useSchedule();
  const classList = getClassList();
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedClassNum, setSelectedClassNum] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  
  const [bellScheduleMode, setBellScheduleMode] = useState<'dual' | 'auto'>('auto');
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editorLines, setEditorLines] = useState<RichTextLine[]>([]);

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [pendingCustomSlot, setPendingCustomSlot] = useState<{classId: string, day: DayOfWeek, period: Period} | null>(null);
  const [customBlockText, setCustomBlockText] = useState('');
  const [customBlockStyle, setCustomBlockStyle] = useState<SubjectStyle | null>(null);

  const selectedClass = `${selectedGrade}-${selectedClassNum}`;

  const classesByGrade = useMemo(() => {
    const grouped: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    classList.forEach(c => {
        const grade = parseInt(c.split('-')[0]);
        if (grouped[grade]) grouped[grade].push(c);
    });
    return grouped;
  }, [classList]);

  useEffect(() => {
      const maxClass = schoolInfo.classesPerGrade[selectedGrade] || 1;
      if (selectedClassNum > maxClass) {
          setSelectedClassNum(1);
      }
  }, [selectedGrade, schoolInfo.classesPerGrade]);

  const getSlot = (classId: string, day: DayOfWeek, period: Period) => {
    const direct = timetable.find(t => t.classId === classId && t.day === day && t.period === period);
    if (direct) return direct;

    const grade = parseInt(classId.split('-')[0]);
    if (isNaN(grade)) return undefined;
    
    const integrated = timetable.find(t => 
        t.day === day && 
        t.period === period && 
        (t.classId.includes(`${grade}통합`) || t.classId.includes(`${grade}레벨`))
    );
    return integrated;
  };

  const handleHomeroomAssign = (classId: string, day: DayOfWeek, period: Period, value: string) => {
    if (value === '') return;

    if (value === '__custom__') {
        setPendingCustomSlot({ classId, day, period });
        setCustomBlockText('');
        setCustomBlockStyle(null);
        setIsCustomModalOpen(true);
        return;
    }

    const existing = getSlot(classId, day, period);
    if (existing) {
        if (existing.teacherId || existing.classId.includes('통합') || existing.classId.includes('레벨')) {
            alert("전담 교사나 학년 공통 수업이 배정된 시간입니다. 내용을 수정하려면 연필 아이콘을 클릭하세요.");
            return;
        }
        removeTimeSlot(existing.id);
    }
    addTimeSlot({
      id: `${classId}-${day}-${period}-homeroom-${Date.now()}`,
      day,
      period,
      classId,
      subject: value
    });
  };

  const handleSaveCustomBlock = () => {
      if (!pendingCustomSlot) return;
      const { classId, day, period } = pendingCustomSlot;
      
      const existing = getSlot(classId, day, period);
      if (existing) {
          if (existing.teacherId || existing.classId.includes('통합') || existing.classId.includes('레벨')) {
              alert("전담 교사나 학년 공통 수업이 배정된 시간입니다.");
              setIsCustomModalOpen(false);
              return;
          }
          removeTimeSlot(existing.id);
      }

      const styleToSave = customBlockStyle || { 
          bgColor: 'bg-gray-100', 
          textColor: 'text-gray-800', 
          borderColor: 'border-gray-300', 
          borderWidth: 'border', 
          borderStyle: 'border-solid', 
          fontWeight: 'font-normal' 
      };

      addTimeSlot({
          id: `${classId}-${day}-${period}-custom-${Date.now()}`,
          day,
          period,
          classId,
          subject: '기타',
          customText: customBlockText || '기타',
          customStyle: styleToSave
      });

      setIsCustomModalOpen(false);
      setPendingCustomSlot(null);
  };

  const handleRemoveSlot = (e: React.MouseEvent, slotId: string, isLocked: boolean) => {
      e.stopPropagation();
      if (isLocked) {
          alert("전담 선생님이 배정한 수업이나 학년 공통 수업은 여기서 삭제할 수 없습니다.");
          return;
      }
      removeTimeSlot(slotId);
  };

  const handleClearClassSchedule = (classId: string) => {
      const targetSlots = timetable.filter(t => t.classId === classId);
      targetSlots.forEach(t => {
          if (!t.teacherId) {
              removeTimeSlot(t.id);
          }
      });
      setIsConfirmingReset(false);
  };

  const handleDecorateClick = () => {
      const periodRows = getPeriodsForGrade(selectedClass);
      const scheduleData: Record<string, any> = {};
      
      periodRows.forEach(row => {
          if (!row.exists || row.type === 'ETC') return;
          const periodKey = `${row.id}교시`;
          
          scheduleData[periodKey] = {
              name: row.name,
              time: row.time,
              days: {}
          };
          
          DAYS.forEach(d => {
              const slot = getSlot(selectedClass, d, row.id);
              if (slot) {
                  const isOther = slot.subject === '기타';
                  scheduleData[periodKey].days[d] = isOther ? (slot.customText || '기타') : slot.subject;
              } else {
                  scheduleData[periodKey].days[d] = "-";
              }
          });
      });

      const exportData = {
          title: `${selectedClass}반 시간표`,
          type: "Class Schedule",
          grid: scheduleData
      };

      const code = JSON.stringify(exportData, null, 2);
      setTransferredTimetableCode(code);
      alert("✅ 시간표 데이터가 꾸미기 페이지로 연동되었습니다.");
      if(onNavigate) onNavigate('decorator');
  };

  const openEditor = (e: React.MouseEvent, slot: TimeSlot) => {
      e.stopPropagation();
      setEditingSlot(slot);
      if (slot.richText && slot.richText.length > 0) {
          setEditorLines(JSON.parse(JSON.stringify(slot.richText)));
      } else {
          const isOther = slot.subject === '기타';
          setEditorLines([{
              id: `line-${Date.now()}`,
              text: isOther ? (slot.customText || '기타') : slot.subject,
              style: { color: 'text-slate-800', fontSize: 'text-base', isBold: true, isItalic: false, isUnderline: false }
          }]);
      }
  };

  const updateEditorLine = (index: number, updates: Partial<RichTextLine> | Partial<RichTextStyle>) => {
      setEditorLines(prev => prev.map((line, idx) => {
          if (idx !== index) return line;
          if ('text' in updates) {
              return { ...line, ...updates } as RichTextLine;
          } else {
              return { ...line, style: { ...line.style, ...updates } };
          }
      }));
  };

  const addEditorLine = () => {
      setEditorLines(prev => [...prev, {
          id: `line-${Date.now()}`,
          text: '',
          style: { color: 'text-slate-800', fontSize: 'text-sm', isBold: false, isItalic: false, isUnderline: false }
      }]);
  };

  const removeEditorLine = (index: number) => {
      setEditorLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveRichText = () => {
      if (editingSlot) {
          updateTimeSlot({ ...editingSlot, richText: editorLines });
          setEditingSlot(null);
      }
  };

  const insertEmoji = (emoji: string, lineIndex: number) => {
      setEditorLines(prev => prev.map((line, idx) => {
          if (idx !== lineIndex) return line;
          return { ...line, text: line.text + emoji };
      }));
  };

  const getPeriodsForGrade = (classId: string) => {
    const grade = parseInt(classId.split('-')[0]);
    let schedule = schoolInfo.bellSchedules[0];
    if (schoolInfo.hasDistinctSchedules) {
        const match = schoolInfo.bellSchedules.find(s => s.targetGrades.includes(grade));
        if (match) schedule = match;
    }
    
    const allPeriodIndices = new Set<number>();
    schoolInfo.bellSchedules.forEach(s => Object.keys(s.periods).forEach(p => allPeriodIndices.add(Number(p))));
    const sortedIndices = Array.from(allPeriodIndices).sort((a, b) => a - b);

    return sortedIndices.map(p => {
        const s1 = schoolInfo.bellSchedules[0]?.periods[p];
        const s2 = schoolInfo.hasDistinctSchedules ? schoolInfo.bellSchedules[1]?.periods[p] : null;
        const currentPeriodData = schedule.periods[p];

        return {
            id: p as Period,
            name: currentPeriodData?.name || (currentPeriodData ? `${p}교시` : '-'),
            time: currentPeriodData ? `${currentPeriodData.start}~${currentPeriodData.end}` : '',
            nameA: s1?.name || (s1 ? `${p}교시` : '-'),
            timeA: s1 ? `${s1.start}~${s1.end}` : "",
            nameB: s2?.name || (s2 ? `${p}교시` : '-'),
            timeB: s2 ? `${s2.start}~${s2.end}` : "",
            type: currentPeriodData?.type || 'CLASS',
            exists: !!currentPeriodData
        };
    });
  };

  const generateClassesHtml = (targetClasses: string[], isAllMode: boolean, format: 'xls' | 'print') => {
    let contentHtml = '';
    if (format === 'xls') {
        contentHtml = `<div>`;
    } else {
        contentHtml = isAllMode 
            ? `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; page-break-inside: avoid;">`
            : `<div>`;
    }

    const hasDual = schoolInfo.hasDistinctSchedules;
    
    const tables = targetClasses.map(classId => {
        const grade = parseInt(classId.split('-')[0]);
        let useScheduleB = false;
        if (hasDual && !isNaN(grade) && grade >= 3) {
            useScheduleB = true;
        }

        const periodRows = getPeriodsForGrade(classId);
        let tableHtml = `<div style="page-break-inside: avoid; border: 1px solid #ccc; padding: 10px; border-radius: 8px; margin-bottom: 20px;">`;
        tableHtml += `<h3 style="text-align: center; margin: 0 0 10px 0;">${classId}반 시간표</h3>`;
        tableHtml += `<table border="1" style="width:100%; border-collapse: collapse; text-align: center; font-size: 11px;">`;
        tableHtml += `<thead><tr style="background:#f3f4f6;">`;
        tableHtml += `<th style="width:40px;">시간</th>`;
        tableHtml += `${DAYS.map(d => `<th>${d}</th>`).join('')}`;
        tableHtml += `</tr></thead>`;
        
        tableHtml += `<tbody>`;
        periodRows.forEach(row => {
           if (!row.exists) return; 
           
           const timeName = useScheduleB ? row.nameB : row.nameA;
           
           tableHtml += `<tr><td style="background:#f9fafb; padding:4px;"><b>${timeName}</b></td>`;
           DAYS.forEach(d => {
              if (row.type === 'ETC') {
                 tableHtml += `<td style="background:#fff7ed; padding:4px;">${row.name}</td>`;
              } else {
                 const slot = getSlot(classId, d, row.id);
                 let cellContent = '';
                 
                 if (slot) {
                     if (slot.richText && slot.richText.length > 0) {
                         cellContent = slot.richText.map(l => {
                             let style = '';
                             if (l.style.color && l.style.color.startsWith('text-')) {
                                if (l.style.color.includes('red')) style += 'color:red;';
                                else if (l.style.color.includes('blue')) style += 'color:blue;';
                                else if (l.style.color.includes('green')) style += 'color:green;';
                                else if (l.style.color.includes('purple')) style += 'color:purple;';
                                else if (l.style.color.includes('orange')) style += 'color:orange;';
                                else if (l.style.color.includes('slate-400')) style += 'color:gray;';
                             }
                             if (l.style.fontSize) {
                                 if (l.style.fontSize === 'text-xs') style += 'font-size: 10px;';
                                 else if (l.style.fontSize === 'text-sm') style += 'font-size: 11px;';
                                 else if (l.style.fontSize === 'text-base') style += 'font-size: 12px;';
                                 else if (l.style.fontSize === 'text-lg') style += 'font-size: 14px;';
                                 else if (l.style.fontSize === 'text-xl') style += 'font-size: 16px;';
                                 else if (l.style.fontSize === 'text-2xl') style += 'font-size: 18px;';
                             } else {
                                 style += 'font-size: 12px;';
                             }

                             if (l.style.isBold) style += 'font-weight:bold;';
                             if (l.style.isItalic) style += 'font-style:italic;';
                             if (l.style.isUnderline) style += 'text-decoration:underline;';
                             return `<div style="${style}">${l.text}</div>`;
                         }).join('');
                     } else {
                         const isOther = slot.subject === '기타';
                         cellContent = isOther ? (slot.customText || '기타') : slot.subject;
                     }
                 }

                 let cellStyle = 'padding:4px; mso-number-format:"\\@";';
                 if(slot) {
                     if (slot.customStyle) {
                         const bgColor = slot.customStyle.bgColor;
                         if(bgColor.includes('purple')) cellStyle += 'background-color: #f3e8ff;';
                         else if(bgColor.includes('green')) cellStyle += 'background-color: #dcfce7;';
                         else if(bgColor.includes('blue')) cellStyle += 'background-color: #dbeafe;';
                         else if(bgColor.includes('red')) cellStyle += 'background-color: #fee2e2;';
                         else if(bgColor.includes('orange')) cellStyle += 'background-color: #ffedd5;';
                         else if(bgColor.includes('yellow')) cellStyle += 'background-color: #fef9c3;';
                         else if(bgColor.includes('gray')) cellStyle += 'background-color: #f3f4f6;';
                     } else {
                         const baseStyle = getSubjectColor(slot.subject);
                         if(baseStyle.includes('bg-purple')) cellStyle += 'background-color: #f3e8ff;';
                         else if(baseStyle.includes('bg-green')) cellStyle += 'background-color: #dcfce7;';
                         else if(baseStyle.includes('bg-blue')) cellStyle += 'background-color: #dbeafe;';
                         else if(baseStyle.includes('bg-red')) cellStyle += 'background-color: #fee2e2;';
                         else if(baseStyle.includes('bg-orange')) cellStyle += 'background-color: #ffedd5;';
                     }
                 }
                 tableHtml += `<td style="${cellStyle}">${cellContent}</td>`;
              }
           });
           tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;
        return tableHtml;
    }).join('');

    contentHtml += tables + `</div>`;
    return contentHtml;
  };

  const handleDownload = (format: 'xls' | 'print', scope: 'single' | 'all') => {
      const targets = scope === 'all' 
          ? classList 
          : [selectedClass];
      
      const title = scope === 'all' ? '전체_학급_시간표' : `${selectedClass}_시간표`;
      
      const htmlContent = generateHtmlDoc(title, generateClassesHtml(targets, scope === 'all', format));
      if (format === 'xls') {
         downloadFile(`${title}.xls`, htmlContent, 'application/vnd.ms-excel');
      } else {
         printContent(htmlContent);
      }
      setShowDownloadMenu(false);
  };

  const handleExportImage = (scope: 'single' | 'all') => {
      if (scope === 'all' && viewMode === 'single') {
          if (confirm("전체 학급 이미지를 저장하기 위해 '전체 학급 보기' 모드로 잠시 전환합니다.\n(이미지 생성 후 다시 돌아옵니다)")) {
              setViewMode('all');
              setTimeout(() => {
                  exportToImage('class-schedule-container', '전체_학급_시간표');
              }, 1000);
          }
          setShowDownloadMenu(false);
          return;
      }

      const fileName = scope === 'all' ? '전체_학급_시간표' : `${selectedClass}_시간표`;
      exportToImage('class-schedule-container', fileName);
      setShowDownloadMenu(false);
  };

  const renderSingleView = (classId: string, isMini: boolean = false) => {
    const periodRows = getPeriodsForGrade(classId);
    const hasDual = schoolInfo.hasDistinctSchedules;
    const grade = parseInt(classId.split('-')[0]);
    
    let showDual = false;
    let showB = false;

    if (isMini) {
        showDual = false;
        if (hasDual && !isNaN(grade) && grade >= 3) {
            showB = true;
        }
    } else {
        if (hasDual) {
            if (bellScheduleMode === 'dual') {
                showDual = true;
            } else {
                showDual = false;
                if (!isNaN(grade) && grade >= 3) {
                    showB = true;
                }
            }
        }
    }

    const leftScheduleIdx = showB ? 1 : 0;

    return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col ${isMini ? 'text-[9px]' : ''}`}>
      {!isMini && (
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-3 h-8 bg-indigo-600 rounded-sm"></span>
                  {classId}반 시간표
                  {hasDual && bellScheduleMode === 'auto' && (
                      <span className={`text-xs px-3 py-1 border rounded-full font-bold flex items-center gap-1 shadow-sm ${!showB ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                          <Timer size={12}/> {!showB ? '시정표 A (저학년)' : '시정표 B (고학년)'}
                      </span>
                  )}
              </h2>
          </div>
      )}
      {isMini && <div className="bg-slate-100 text-center font-bold py-1 border-b text-slate-700 truncate">{classId}반</div>}
      
      <div className={`grid ${showDual && !isMini ? 'grid-cols-7' : 'grid-cols-6'} border-b divide-x ${isMini ? 'divide-slate-100' : ''}`}>
        <div className={`font-bold text-center ${isMini ? 'p-1 text-[8px] bg-slate-50' : (showDual ? 'p-3 text-sm bg-blue-50/30 text-blue-600' : 'p-3 text-sm bg-slate-50 text-slate-600')}`}>
            {showDual ? '저(A)' : (showB ? '시간(B)' : '시간(A)')}
        </div>
        {DAYS.map(day => <div key={day} className={`${isMini ? 'p-0.5' : 'p-3'} font-bold text-slate-700 bg-slate-50 text-center`}>{day}</div>)}
        {showDual && !isMini && <div className="p-3 font-bold text-rose-600 bg-rose-50/30 text-center text-sm">고(B)</div>}
      </div>

      {periodRows.map(row => {
          const leftName = leftScheduleIdx === 1 ? row.nameB : row.nameA;
          const leftTime = leftScheduleIdx === 1 ? row.timeB : row.timeA;
          
          return (
            <div key={row.id} className={`grid ${showDual && !isMini ? 'grid-cols-7' : 'grid-cols-6'} divide-x border-b last:border-0 ${isMini ? 'divide-slate-100' : ''}`}>
            <div className={`flex flex-col items-center justify-center border-r border-slate-200 transition-colors
                ${leftTime ? 'bg-slate-50' : 'bg-slate-200 opacity-20'}
                ${isMini ? 'p-0.5 min-h-[30px]' : 'p-2 h-20'} 
            `}>
                <span className={`font-bold truncate w-full text-center leading-snug ${isMini ? 'text-[8px] mb-0' : 'text-sm mb-0.5'} text-slate-700`}>{leftName}</span>
                {!isMini && leftTime && <span className="text-xs text-blue-600 font-mono font-bold leading-tight tracking-tight">{leftTime}</span>}
            </div>

            {DAYS.map(day => {
                const slot = getSlot(classId, day, row.id);
                const isLocked = !!(slot && (slot.teacherId || slot.classId.includes('통합') || slot.classId.includes('레벨')));
                const isUnassigned = slot?.subject === '미배정';
                const isOther = slot?.subject === '기타';
                const cellHeight = isMini ? 'h-full min-h-[30px]' : 'h-20'; 
                
                if (!row.exists) return <div key={day} className={`${cellHeight} bg-slate-100/50`}></div>;
                if (row.type === 'ETC') return <div key={day} className={`${cellHeight} flex items-center justify-center bg-orange-50/20 text-orange-400 font-bold ${isMini ? 'text-[8px]' : 'text-xs'}`}>{row.name}</div>;
                
                // Tooltip Info
                const teacherName = slot?.teacherId ? teachers.find(t => t.id === slot.teacherId)?.name : '';
                const roomName = slot?.roomId ? rooms.find(r => r.id === slot.roomId)?.name : '';

                if (isMini) {
                    let miniStyle = '';
                    if (slot) {
                        miniStyle = getSubjectColor(slot.subject);
                        if (isOther && slot.customStyle) {
                            miniStyle = `${slot.customStyle.bgColor} ${slot.customStyle.textColor} ${slot.customStyle.borderColor} border`;
                        }
                    }
                    return (
                    <div key={day} className={`${cellHeight} flex items-center justify-center p-0.5`}>
                        {slot ? <div className={`w-full h-full rounded flex items-center justify-center truncate px-1 text-[10px] font-bold ${miniStyle}`}>{isUnassigned ? '-' : (isOther ? (slot.customText || '기타') : slot.subject.substring(0, 2))}</div> : null}
                    </div>
                    );
                }
                
                return (
                <div key={day} className={`p-1 ${cellHeight} relative group`}>
                    {slot ? (
                        <div className={`w-full h-full rounded-lg flex flex-col justify-center items-center relative transition-all shadow-sm 
                            ${isOther && slot.customStyle ? `${slot.customStyle.bgColor} ${slot.customStyle.textColor} ${slot.customStyle.borderColor} border` : getSubjectColor(slot.subject)} 
                            ${isUnassigned ? 'bg-slate-100 text-slate-400 border-slate-300' : ''} 
                            ${isLocked ? 'ring-2 ring-purple-100' : ''}
                        `}>
                            {slot.richText && slot.richText.length > 0 ? (
                                <div className="flex flex-col items-center justify-center leading-tight w-full px-1">
                                    {slot.richText.map(line => (
                                        <div key={line.id} className={`
                                            ${line.style.color || 'text-slate-800'}
                                            ${line.style.fontSize || 'text-base'}
                                            ${line.style.isBold ? 'font-bold' : ''}
                                            ${line.style.isItalic ? 'italic' : ''}
                                            ${line.style.isUnderline ? 'underline' : ''}
                                            text-center w-full
                                        `}>
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                isUnassigned ? <span className="text-2xl font-bold select-none">-</span> : (
                                    <span className="font-bold text-base">{isOther ? (slot.customText || '기타') : slot.subject}</span>
                                )
                            )}

                            {/* Hover Tooltip */}
                            {slot && !isUnassigned && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap font-bold">
                                    {isOther ? (slot.customText || '기타') : slot.subject}
                                    {teacherName ? ` (${teacherName} 선생님)` : ''}
                                    {roomName ? ` @ ${roomName}` : ''}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                            )}

                            <button 
                                onClick={(e) => openEditor(e, slot)} 
                                className="absolute top-1 left-1 p-1 text-indigo-400 hover:text-indigo-600 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="텍스트/스타일 편집"
                            >
                                <Edit2 size={12} fill="currentColor" className="opacity-50" />
                            </button>

                            {!isLocked && (
                                <button onClick={(e) => handleRemoveSlot(e, slot.id, false)} className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X size={14} /></button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <select 
                                className="w-full h-full appearance-none outline-none text-center text-sm font-medium cursor-pointer rounded-lg hover:bg-slate-100 text-slate-400 focus:text-slate-800 bg-transparent" 
                                value="" 
                                onChange={(e) => handleHomeroomAssign(classId, day, row.id, e.target.value)}
                            >
                                <option value="">+</option>
                                {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                <option value="__custom__" className="text-indigo-600 font-bold">직접 입력 (기타)</option>
                            </select>
                        </div>
                    )}
                </div>
                );
            })}

            {showDual && !isMini && (
                <div className={`p-2 h-20 flex flex-col items-center justify-center border-l border-slate-200 transition-colors
                    ${row.timeB ? 'bg-slate-50' : 'bg-slate-200 opacity-20'}
                `}>
                    <span className="font-bold text-slate-700 text-sm truncate w-full text-center leading-snug mb-0.5">{row.nameB}</span>
                    <span className="text-xs text-rose-600 font-mono font-bold leading-tight tracking-tight">{row.timeB}</span>
                </div>
            )}
            </div>
        )})}
    </div>
  )};

  return (
    <div className="p-4 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-slate-50 relative">
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800">학급별 시간표</h1>
        <div className="flex gap-4 items-center">
           {onNavigate && viewMode === 'single' && (
                <button onClick={handleDecorateClick} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all mr-2"><Sparkles size={14} className="text-yellow-300" /><span className="drop-shadow-sm">시간표 꾸미기</span></button>
           )}
           {viewMode === 'single' && (
                <button onClick={() => { if (isConfirmingReset) { handleClearClassSchedule(selectedClass); } else { setIsConfirmingReset(true); setTimeout(() => setIsConfirmingReset(false), 3000); } }} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all mr-2 ${isConfirmingReset ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-slate-500 hover:bg-red-50'}`}>{isConfirmingReset ? <><AlertTriangle size={14}/> 정말 초기화?</> : <><Trash2 size={14}/> 초기화</>}</button>
           )}
           
           {schoolInfo.hasDistinctSchedules && viewMode === 'single' && (
               <div className="flex bg-white p-1 rounded-lg border shadow-sm mr-2">
                   <button onClick={() => setBellScheduleMode('dual')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${bellScheduleMode === 'dual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                       <Columns size={12} /> 투트랙 (A+B)
                   </button>
                   <button onClick={() => setBellScheduleMode('auto')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${bellScheduleMode === 'auto' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                       <UserCheck size={12} /> 내 시정표만 (Auto)
                   </button>
               </div>
           )}

           {viewMode === 'all' && (
             <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm mr-2"><button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomOut size={16} /></button><span className="text-xs w-12 text-center font-mono font-bold text-slate-600">{(zoomLevel * 100).toFixed(0)}%</span><button onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomIn size={16} /></button></div>
           )}
           {viewMode === 'single' && (
              <div className="flex items-center gap-2"><div className="relative"><select value={selectedGrade} onChange={(e) => setSelectedGrade(Number(e.target.value))} className="appearance-none bg-white border border-slate-300 py-2 pl-4 pr-8 rounded-lg font-bold outline-none shadow-sm">{[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>{g}학년</option>)}</select><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronDown size={14} /></div></div><div className="relative"><select value={selectedClassNum} onChange={(e) => setSelectedClassNum(Number(e.target.value))} className="appearance-none bg-white border border-slate-300 py-2 pl-4 pr-8 rounded-lg font-bold outline-none shadow-sm">{Array.from({ length: schoolInfo.classesPerGrade[selectedGrade] || 1 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}</select><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronDown size={14} /></div></div></div>
           )}
           <button onClick={() => setViewMode(viewMode === 'single' ? 'all' : 'single')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md transition-all active:scale-95">{viewMode === 'single' ? '전체 학급 보기' : '개별 학급 보기'}</button>
           <div className="relative"><button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"><Download size={16} /></button>
             {showDownloadMenu && <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                 {viewMode === 'single' ? (
                    <>
                        <div className="text-xs font-bold text-slate-400 px-2 py-1">현재 학급 ({selectedClass}반)</div>
                        <button onClick={() => handleDownload('xls', 'single')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-green-600" /> Excel (.xls)</button>
                        <button onClick={() => handleDownload('print', 'single')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                        <button onClick={() => handleExportImage('single')} className="w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-2 transition-colors font-bold"><Image size={16} /> 1장 이미지 다운</button>
                    </>
                 ) : (
                    <>
                        <div className="text-xs font-bold text-slate-400 px-2 py-1">전체 학급 (일괄)</div>
                        <button onClick={() => handleDownload('xls', 'all')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-green-600" /> Excel (.xls)</button>
                        <button onClick={() => handleDownload('print', 'all')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                        <button onClick={() => handleExportImage('all')} className="w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-2 transition-colors font-bold"><Image size={16} /> 1장 이미지 다운 (전체)</button>
                    </>
                 )}
                 </div>}
             {showDownloadMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>}
           </div>
        </div>
      </header>
      
      {/* 시간표 본문 컨테이너 */}
      <div id="class-schedule-container" className="flex-1 overflow-auto bg-slate-50 rounded-xl pb-16 scrollbar-thin">
        <div className="pb-8">
          {viewMode === 'single' ? (
            <div className="max-w-5xl mx-auto mt-2 animate-in fade-in zoom-in-95 duration-300">
              {renderSingleView(selectedClass)}
            </div>
          ) : (
            <div className="space-y-6 origin-top-left p-4 transition-transform" style={{ transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%` }}>
              {[1, 2, 3, 4, 5, 6].map(grade => (
                <div key={grade} className="flex gap-4">
                  <div className="w-16 flex-shrink-0 flex items-center justify-center bg-slate-800 text-white font-bold rounded-lg shadow-md text-sm">
                    {grade}학년
                  </div>
                  <div className="flex-1 grid grid-flow-col auto-cols-max gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {classesByGrade[grade]?.map(classId => (
                      <div key={classId} className="w-56">
                        {renderSingleView(classId, true)}
                      </div>
                    ))}
                    {classesByGrade[grade]?.length === 0 && (
                      <div className="text-slate-300 text-sm italic py-4">학급 없음</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 편집 모달 */}
      {editingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Edit2 size={18} className="text-indigo-600" />
                          블록 내용 상세 편집
                      </h3>
                      <button onClick={() => setEditingSlot(null)}><X className="text-slate-400 hover:text-slate-700"/></button>
                  </div>
                  
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {editorLines.map((line, idx) => (
                          <div key={line.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex gap-1 items-center justify-between">
                                  <div className="flex gap-1">
                                      <button onClick={() => updateEditorLine(idx, { isBold: !line.style.isBold })} className={`p-1.5 rounded ${line.style.isBold ? 'bg-slate-300 text-slate-800' : 'hover:bg-slate-200 text-slate-500'}`}><Bold size={14}/></button>
                                      <button onClick={() => updateEditorLine(idx, { isItalic: !line.style.isItalic })} className={`p-1.5 rounded ${line.style.isItalic ? 'bg-slate-300 text-slate-800' : 'hover:bg-slate-200 text-slate-500'}`}><Italic size={14}/></button>
                                      <button onClick={() => updateEditorLine(idx, { isUnderline: !line.style.isUnderline })} className={`p-1.5 rounded ${line.style.isUnderline ? 'bg-slate-300 text-slate-800' : 'hover:bg-slate-200 text-slate-500'}`}><Underline size={14}/></button>
                                      
                                      <div className="h-4 w-px bg-slate-300 mx-1 self-center"></div>
                                      
                                      <select 
                                          value={line.style.fontSize || 'text-base'} 
                                          onChange={(e) => updateEditorLine(idx, { fontSize: e.target.value })}
                                          className="text-xs border rounded px-1 py-1 outline-none bg-white"
                                          title="글자 크기"
                                      >
                                          {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                      </select>

                                      <select 
                                          value={TEXT_COLORS.find(c => c.value === line.style.color)?.value || 'text-slate-800'} 
                                          onChange={(e) => updateEditorLine(idx, { color: e.target.value })}
                                          className="text-xs border rounded px-1 py-1 outline-none bg-white ml-1"
                                          title="글자 색상"
                                      >
                                          {TEXT_COLORS.map(c => <option key={c.value} value={c.value} className={c.value}>{c.label}</option>)}
                                      </select>
                                  </div>
                                  <button onClick={() => removeEditorLine(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                              <div className="flex gap-2">
                                  <input 
                                      value={line.text}
                                      onChange={(e) => updateEditorLine(idx, { text: e.target.value })}
                                      placeholder="내용 입력..."
                                      className={`flex-1 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none
                                          ${line.style.isBold ? 'font-bold' : ''}
                                          ${line.style.isItalic ? 'italic' : ''}
                                          ${line.style.isUnderline ? 'underline' : ''}
                                          ${line.style.color || 'text-slate-800'}
                                      `}
                                      onKeyDown={(e) => e.key === 'Enter' && addEditorLine()}
                                  />
                                  <div className="relative group/emoji">
                                      <button className="p-2 bg-white border rounded hover:bg-slate-100 text-slate-500"><Smile size={16}/></button>
                                      <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg p-2 z-20 w-48 hidden group-hover/emoji:grid grid-cols-6 gap-1">
                                          {COMMON_EMOJIS.map(emoji => (
                                              <button key={emoji} onClick={() => insertEmoji(emoji, idx)} className="hover:bg-slate-100 p-1 rounded text-lg">{emoji}</button>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                      <button onClick={addEditorLine} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 text-sm font-bold flex items-center justify-center gap-1">
                          <Plus size={14} /> 줄 추가
                      </button>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                      <button onClick={() => setEditingSlot(null)} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium">취소</button>
                      <button onClick={handleSaveRichText} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 text-sm shadow-md flex items-center gap-2">
                          <Check size={16} /> 저장하기
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 기타 블록 추가 모달 */}
      {isCustomModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit3 size={18} className="text-indigo-600" /> 기타/행사 블록 추가</h3>
                      <button onClick={() => setIsCustomModalOpen(false)}><X className="text-slate-400 hover:text-slate-700"/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">표시할 내용</label>
                          <input type="text" value={customBlockText} onChange={(e) => setCustomBlockText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="예: 행사, 자습, 동아리" autoFocus />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">스타일 선택</label>
                          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 border rounded bg-slate-50">
                              {COLOR_PALETTE.map(c => {
                                  const parts = c.class.split(' ');
                                  const isSelected = customBlockStyle?.bgColor === parts.find(p=>p.startsWith('bg-'));
                                  return (<button key={c.id} onClick={() => { setCustomBlockStyle({ bgColor: parts.find(p => p.startsWith('bg-')) || '', textColor: parts.find(p => p.startsWith('text-')) || '', borderColor: parts.find(p => p.startsWith('border-') && !p.match(/^border-\d+$/)) || '', borderWidth: parts.find(p => p.match(/^border-\d+$/)) || 'border', borderStyle: 'border-solid', fontWeight: parts.find(p => p.startsWith('font-')) || 'font-normal', }); }} className={`w-8 h-8 rounded border transition-transform hover:scale-110 ${c.class} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`} title={c.name} />);
                              })}
                          </div>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                      <button onClick={() => setIsCustomModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium">취소</button>
                      <button onClick={handleSaveCustomBlock} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 text-sm shadow-md">추가하기</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};