import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule, downloadFile, generateHtmlDoc, printContent, exportToImage } from '../services/scheduleService';
import { DAYS } from '../constants';
import { DayOfWeek, Period, TeacherLayoutConfig, SubjectStyle, TimeSlot, RichTextLine, RichTextStyle } from '../types';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, Download, FileSpreadsheet, Printer, Timer, Edit2, Bold, Italic, Underline, Trash2, Smile, Plus, Check, X, Sparkles, AlertTriangle, Columns, Maximize, PanelLeft, PanelRight, UserCheck, Image } from 'lucide-react';

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

const extractGrade = (classId: string): number => {
    const match = classId.match(/(?:^|-|custom-)?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

// Gradient Helper - ONLY changes Background, keeps Text/Border
const getGradeAdjustedStyle = (baseStyle: string, classId: string, customStyle?: SubjectStyle) => {
    if (customStyle) {
        return `${customStyle.bgColor} ${customStyle.textColor} ${customStyle.borderColor} ${customStyle.borderWidth} ${customStyle.borderStyle} ${customStyle.fontWeight}`;
    }
    if (classId === '미배정') {
        return 'bg-slate-100 text-slate-400 border-slate-300';
    }
    const grade = extractGrade(classId);
    if (!grade || grade < 1 || grade > 6) return baseStyle;
    
    // Intensity mapping: 1st=100 ... 6th=600
    const intensity = grade * 100;
    const bgMatch = baseStyle.match(/bg-([a-z]+)-(\d+)/);
    
    if (bgMatch) {
        const hue = bgMatch[1];
        // Replace only the background part
        return baseStyle.replace(/bg-[a-z]+-\d+/, `bg-${hue}-${intensity}`);
    }
    
    return baseStyle;
};

// Helper to format class names (reused from MasterSchedule)
const formatClassId = (classId: string, config: TeacherLayoutConfig) => {
    if (classId === '미배정') return '-';
    if (classId === '기타') return '기타';
    if (config.customLabels && config.customLabels[classId]) return config.customLabels[classId];
    
    if (classId.includes('레벨')) {
        const [prefix, suffix] = classId.split('레벨');
        const gradeLabel = config.customLabels[prefix] || prefix;
        if (!suffix) return `${gradeLabel}학년 L`;
        const num = parseInt(suffix);
        if (!isNaN(num)) {
             const circled = (num >= 1 && num <= 20) ? String.fromCharCode(0x2460 + num - 1) : `(${num})`;
             return `${gradeLabel}학년 L${circled}`;
        }
        return `${gradeLabel}학년 L`;
    }
    if (classId.includes('-')) {
        let gradeId = '';
        let classNum = '';
        if (classId.startsWith('custom-')) {
            const lastDash = classId.lastIndexOf('-');
            if (lastDash > -1) {
                gradeId = classId.substring(0, lastDash);
                classNum = classId.substring(lastDash + 1);
            } else {
                return classId;
            }
        } else {
            [gradeId, classNum] = classId.split('-');
        }
        const gradeLabel = config.customLabels[gradeId];
        if (gradeLabel) return `${gradeLabel}-${classNum}`;
        if (classId.startsWith('custom-')) return classNum;
    }
    return classId;
};

export const TeacherTimetable: React.FC<Props> = ({ onNavigate }) => {
  const { teachers, timetable, schoolInfo, teacherConfig, getSubjectColor, updateTimeSlot, clearTeacherSchedule, setTransferredTimetableCode, rooms } = useSchedule();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [bellScheduleMode, setBellScheduleMode] = useState<'dual' | 'auto'>('auto');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [columnsPerRow, setColumnsPerRow] = useState(3);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  // Rich Text Editor State
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editorLines, setEditorLines] = useState<RichTextLine[]>([]);

  // Initialize selected teacher
  useEffect(() => {
      if (teachers.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(teachers[0].id);
      }
  }, [teachers, selectedTeacherId]);

  const activePeriods = useMemo(() => {
    const allPeriods = new Set<number>();
    schoolInfo.bellSchedules.forEach(s => {
        Object.keys(s.periods).forEach(p => allPeriods.add(Number(p)));
    });
    const sorted = Array.from(allPeriods).sort((a,b) => a-b) as Period[];
    return sorted.length > 0 ? sorted : ([1,2,3,4,5,6] as Period[]);
  }, [schoolInfo.bellSchedules]);

  const periodHeightMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (viewMode !== 'all') return map;

    activePeriods.forEach(period => {
        let maxScore = 0; 
        
        teachers.forEach(t => {
            DAYS.forEach(d => {
                const slot = timetable.find(s => s.teacherId === t.id && s.day === d && s.period === period && !s.id.includes('-sync-'));
                if (slot) {
                    let currentScore = 0;
                    if (slot.subject === '기타') {
                        currentScore = (slot.customText || '').length; 
                        if (currentScore > 0) currentScore += 2;
                    } else if (slot.richText) {
                        currentScore = slot.richText.length * 5;
                    } else {
                        const className = formatClassId(slot.classId, teacherConfig);
                        currentScore = className.length + slot.subject.length;
                    }
                    if (currentScore > maxScore) maxScore = currentScore;
                }
            });
        });
        
        if (maxScore > 18) map[period] = 'h-20';
        else if (maxScore > 10) map[period] = 'h-14';
        else map[period] = 'h-12';
    });
    return map;
  }, [teachers, timetable, activePeriods, viewMode, teacherConfig]);

  const getSlot = (teacherId: string, day: DayOfWeek, period: Period) => {
    return timetable.find(t => t.teacherId === teacherId && t.day === day && t.period === period && !t.id.includes('-sync-'));
  };

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

  const hasDual = schoolInfo.hasDistinctSchedules;
  const showRightSide = hasDual && bellScheduleMode === 'dual';
  const leftScheduleIdx = 0;

  const handleClearTeacher = () => {
      if (selectedTeacherId) {
          clearTeacherSchedule(selectedTeacherId);
          setIsConfirmingReset(false);
      }
  };

  const handleDecorateClick = () => {
      if (!selectedTeacherId) return;
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (!teacher) return;

      const scheduleData: Record<string, any> = {};
      
      activePeriods.forEach(p => {
          const tInfo = getBellTime(leftScheduleIdx, p);
          const periodKey = `${p}교시`;
          
          scheduleData[periodKey] = {
              name: tInfo?.name || periodKey,
              time: tInfo ? `${tInfo.start}~${tInfo.end}` : "",
              days: {}
          };
          
          DAYS.forEach(d => {
              const slot = getSlot(selectedTeacherId, d, p);
              if (slot) {
                  let text = "";
                  if (slot.subject === '기타') {
                      text = slot.customText || '기타';
                  } else {
                      const className = formatClassId(slot.classId, teacherConfig);
                      text = `${className} (${slot.subject})`;
                  }
                  scheduleData[periodKey].days[d] = text;
              } else {
                  scheduleData[periodKey].days[d] = "-";
              }
          });
      });

      const exportData = {
          title: `${teacher.name} 선생님 시간표`,
          type: "Teacher Schedule",
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
          const className = formatClassId(slot.classId, teacherConfig);
          const isOther = slot.subject === '기타';
          const displaySubject = isOther && slot.customText ? slot.customText : slot.subject;
          
          setEditorLines([
              {
                  id: `line-1`,
                  text: isOther ? displaySubject : className,
                  style: { color: 'text-slate-800', fontSize: 'text-base', isBold: true }
              },
              {
                  id: `line-2`,
                  text: isOther ? '' : displaySubject,
                  style: { color: 'text-slate-700', fontSize: 'text-sm', isBold: false }
              }
          ].filter(l => l.text !== ''));
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

  const generateClassesHtml = (targetTeacherIds: string[], isAllMode: boolean, format: 'xls' | 'print') => {
    let contentHtml = '';
    
    if (format === 'xls') {
        contentHtml = `<div>`;
    } else {
        contentHtml = isAllMode 
            ? `<div style="display: grid; grid-template-columns: repeat(${Math.min(3, columnsPerRow)}, 1fr); gap: 20px; page-break-inside: avoid;">`
            : `<div>`;
    }

    const tablesHtml = targetTeacherIds.map(tId => {
        const teacher = teachers.find(t => t.id === tId);
        if (!teacher) return '';
        
        let tableHtml = `<div style="page-break-inside: avoid; border: 1px solid #ccc; padding: 10px; border-radius: 8px; margin-bottom: 20px;">`;
        tableHtml += `<h3 style="text-align: center; margin: 0 0 10px 0;">${teacher.name} 선생님</h3>`;
        tableHtml += `<table border="1" style="width:100%; border-collapse: collapse; text-align: center; font-size: 11px;">`;
        tableHtml += `<thead><tr style="background:#f3f4f6;">`;
        
        if (showRightSide) {
            tableHtml += `<th style="width:40px;">저(A)</th>`;
        } else {
            tableHtml += `<th style="width:40px;">${bellScheduleMode === 'auto' ? '시간' : '시간(A)'}</th>`;
        }
        
        DAYS.forEach(d => tableHtml += `<th>${d}</th>`);
        if (showRightSide) tableHtml += `<th style="width:40px;">고(B)</th>`;
        tableHtml += `</tr></thead><tbody>`;
        
        activePeriods.forEach(p => {
           const tLeft = getBellTime(leftScheduleIdx, p);
           const tRight = showRightSide ? getBellTime(1, p) : null;
           
           tableHtml += `<tr>`;
           
           const timeA = tLeft ? `<b>${tLeft.name}</b>` : '-';
           tableHtml += `<td style="background:#f9fafb; padding: 4px;">${timeA}</td>`;
           
           DAYS.forEach(d => {
              const slot = getSlot(tId, d, p);
              let content = '';
              let cellStyle = "padding: 4px; mso-number-format:'\\@';";
              
              if (slot) {
                  if (slot.richText && slot.richText.length > 0) {
                      content = slot.richText.map(l => {
                          let style = '';
                          if (l.style.isBold) style += 'font-weight:bold;';
                          if (l.style.isUnderline) style += 'text-decoration:underline;';
                          return `<div style="${style}">${l.text}</div>`;
                      }).join('');
                  } else {
                      const className = formatClassId(slot.classId, teacherConfig);
                      content = `<strong>${className}</strong><br>${slot.subject}`;
                      if (slot.subject === '기타' && slot.customText) {
                          content = `${slot.customText}`;
                      }
                  }
                  
                  const baseStyle = getSubjectColor(slot.subject);
                  if(baseStyle.includes('bg-')) {
                      if(baseStyle.includes('bg-purple')) cellStyle += 'background-color: #f3e8ff;';
                      else if(baseStyle.includes('bg-green')) cellStyle += 'background-color: #dcfce7;';
                      else if(baseStyle.includes('bg-blue')) cellStyle += 'background-color: #dbeafe;';
                      else if(baseStyle.includes('bg-red')) cellStyle += 'background-color: #fee2e2;';
                      else if(baseStyle.includes('bg-orange')) cellStyle += 'background-color: #ffedd5;';
                      else cellStyle += 'background-color: #f1f5f9;';
                  }
              }
              tableHtml += `<td style="${cellStyle}">${content}</td>`;
           });

           if (showRightSide) {
             const timeB = tRight ? `<b>${tRight.name}</b>` : '-';
             tableHtml += `<td style="background:#f9fafb; padding: 4px;">${timeB}</td>`;
           }
           
           tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;
        return tableHtml;
    }).join('');

    contentHtml += tablesHtml + `</div>`;
    return contentHtml;
  };

  const handleDownload = (format: 'xls' | 'print', scope: 'single' | 'all') => {
      const targets = scope === 'all' ? teachers.map(t => t.id) : [selectedTeacherId];
      const selectedName = teachers.find(t => t.id === selectedTeacherId)?.name || '전담교사';
      const title = scope === 'all' ? '전체_전담교사_시간표' : `${selectedName}_시간표`;
      
      const htmlContent = generateHtmlDoc(title, generateClassesHtml(targets, scope === 'all', format));
      if (format === 'xls') {
         downloadFile(`${title}.xls`, htmlContent, 'application/vnd.ms-excel');
      } else {
         printContent(htmlContent);
      }
      setShowDownloadMenu(false);
  };

  const handleExportImage = () => {
      exportToImage('teacher-timetable-container', viewMode === 'all' ? '전담교사_전체_시간표' : `${teachers.find(t=>t.id===selectedTeacherId)?.name}_시간표`);
      setShowDownloadMenu(false);
  };

  const renderSingleView = (teacherId: string, isMini: boolean = false) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return null;

    let showDual = false;
    let showB = false;

    if (isMini) {
        showDual = schoolInfo.hasDistinctSchedules;
    } else {
        if (hasDual) {
            if (bellScheduleMode === 'dual') {
                showDual = true;
            } else {
                const targetGrades = new Set<number>();
                const slots = timetable.filter(t => t.teacherId === teacherId && t.subject !== '미배정');
                slots.forEach(s => {
                    const g = extractGrade(s.classId);
                    if (g > 0) targetGrades.add(g);
                });
                if (targetGrades.size === 0) {
                    teacher.assignments.forEach(a => {
                       (a.targets || []).forEach(t => {
                           const g = extractGrade(t);
                           if (g > 0) targetGrades.add(g);
                           const parsed = parseInt(t);
                           if (!isNaN(parsed)) targetGrades.add(parsed);
                       });
                    });
                }

                const hasLow = Array.from(targetGrades).some(g => g <= 2);
                const hasHigh = Array.from(targetGrades).some(g => g >= 3);

                if (hasLow && hasHigh) {
                    showDual = true;
                } else if (hasHigh) {
                    showB = true;
                }
            }
        }
    }

    const leftScheduleIdx = showB ? 1 : 0;

    return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col ${isMini ? 'text-[9px] h-full' : ''}`}>
      {!isMini && (
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0 sticky top-0 z-20">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <span className={`w-3 h-8 rounded-sm bg-${teacher.color.split('-')[1] || 'indigo'}-400`}></span>
                  {teacher.name} 시간표
                  {hasDual && bellScheduleMode === 'auto' && (
                      <span className={`text-xs px-3 py-1 border rounded-full font-bold flex items-center gap-1 shadow-sm ${showDual ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : (showB ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-blue-50 border-blue-200 text-blue-600')}`}>
                          <Timer size={12}/> {showDual ? '투트랙 (A+B)' : (showB ? '시정표 B (고학년)' : '시정표 A (저학년)')}
                      </span>
                  )}
              </h2>
          </div>
      )}
      {isMini && <div className="bg-slate-100 text-center font-bold py-1 border-b text-slate-700 truncate flex-shrink-0">{teacher.name}</div>}
      
      <div className={`flex-1 flex flex-col min-h-0 ${!isMini ? '' : 'overflow-hidden'}`}>
        <div className={`grid ${showDual ? 'grid-cols-7' : 'grid-cols-6'} border-b divide-x ${isMini ? 'divide-slate-100' : ''} flex-shrink-0 ${!isMini ? 'sticky top-0 z-10 shadow-sm' : ''}`}>
            <div className={`font-bold text-center ${isMini ? 'p-1 text-[8px] bg-slate-50' : 'p-3 text-sm bg-blue-50/30 text-blue-600'}`}>
                {showDual ? '저(A)' : (showB ? '시간(B)' : '시간(A)')}
            </div>
            {DAYS.map(day => (
                <div key={day} className={`${isMini ? 'p-0.5' : 'p-3'} font-bold text-slate-700 bg-slate-50 text-center`}>{day}</div>
            ))}
            {showDual && (
                <div className={`font-bold text-center ${isMini ? 'p-1 text-[8px] bg-slate-50' : 'p-3 text-sm bg-rose-50/30 text-rose-600'}`}>
                    고(B)
                </div>
            )}
        </div>

        <div className={`${!isMini ? '' : 'flex-1 overflow-auto'}`}>
            {activePeriods.map(period => {
                const tLeft = getBellTime(leftScheduleIdx, period);
                const tRight = showDual ? getBellTime(1, period) : null;
                const rowHeightClass = isMini ? (periodHeightMap[period] || 'h-12') : 'h-20';

                return (
                    <div key={period} className={`grid ${showDual ? 'grid-cols-7' : 'grid-cols-6'} divide-x border-b last:border-0 ${isMini ? 'divide-slate-100' : ''} h-auto`}>
                        <div className={`flex flex-col items-center justify-center border-r border-slate-200 transition-colors
                            ${tLeft ? (tLeft.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50') : 'bg-slate-200 opacity-20'}
                            ${isMini ? `p-0.5 ${rowHeightClass}` : 'p-2 h-20'}
                        `}>
                            <span className={`font-bold truncate w-full text-center leading-snug ${isMini ? 'text-[8px] mb-0' : 'text-sm mb-0.5'} ${tLeft?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                {tLeft ? tLeft.name : '-'}
                            </span>
                            {!isMini && tLeft && <span className="text-[10px] text-blue-600 font-mono font-bold leading-tight tracking-tight">{tLeft.start}~{tLeft.end}</span>}
                        </div>

                        {DAYS.map(day => {
                            const slot = getSlot(teacherId, day, period);
                            const isOther = slot?.subject === '기타';
                            const isBothEtc = tLeft?.type === 'ETC' && (showDual ? tRight?.type === 'ETC' : true);

                            let finalStyle = 'bg-white';
                            if (slot) {
                                const baseColor = getSubjectColor(slot.subject);
                                if (isOther) {
                                    finalStyle = slot.customStyle 
                                        ? `${slot.customStyle.bgColor} ${slot.customStyle.textColor} ${slot.customStyle.borderColor} border shadow-sm`
                                        : 'bg-slate-100 text-slate-600 border-slate-300 border shadow-sm';
                                } else {
                                    finalStyle = getGradeAdjustedStyle(baseColor, slot.classId, slot.customStyle);
                                }
                            }

                            // Tooltip info
                            const roomName = slot?.roomId ? rooms.find(r => r.id === slot.roomId)?.name : '';
                            const classLabel = slot ? formatClassId(slot.classId, teacherConfig) : '';
                            
                            return (
                                <div key={day} className={`p-1 ${rowHeightClass} relative group ${isBothEtc && !slot ? 'bg-orange-50/20' : ''}`}>
                                    {slot ? (
                                        <div className={`w-full h-full rounded flex flex-col justify-center items-center text-center relative p-0.5 border shadow-sm transition-all ${finalStyle}`}>
                                            
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
                                                <>
                                                    <span className={`font-extrabold leading-tight ${isMini ? 'text-[9px]' : 'text-base'}`}>
                                                        {isOther ? (slot.customText || '기타') : classLabel}
                                                    </span>
                                                    {!isMini && !isOther && (
                                                        <span className="text-xs font-medium opacity-80 mt-0.5">{slot.subject}</span>
                                                    )}
                                                </>
                                            )}

                                            {/* Hover Tooltip */}
                                            {!isMini && slot && (
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap font-bold">
                                                    {classLabel} {slot.subject === '기타' ? '' : `- ${slot.subject}`}
                                                    {roomName ? ` @ ${roomName}` : ''}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={(e) => openEditor(e, slot)} 
                                                className="absolute top-1 left-1 p-1 text-indigo-400 hover:text-indigo-600 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                title="텍스트/스타일 편집"
                                            >
                                                <Edit2 size={10} fill="currentColor" className="opacity-50" />
                                            </button>
                                        </div>
                                    ) : (
                                        !isMini && tLeft?.type === 'ETC' && <div className="text-[10px] text-orange-200 font-bold flex items-center justify-center h-full">{tLeft.name}</div>
                                    )}
                                </div>
                            );
                        })}

                        {showDual && (
                            <div className={`flex flex-col items-center justify-center border-l border-slate-200 transition-colors
                                ${tRight ? (tRight.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50') : 'bg-slate-200 opacity-20'}
                                ${isMini ? `p-0.5 ${rowHeightClass}` : 'p-2 h-20'}
                            `}>
                                <span className={`font-bold truncate w-full text-center leading-snug ${isMini ? 'text-[8px] mb-0' : 'text-sm mb-0.5'} ${tRight?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                    {tRight ? tRight.name : '-'}
                                </span>
                                {!isMini && tRight && <span className="text-[10px] text-rose-600 font-mono font-bold leading-tight tracking-tight">{tRight.start}~{tRight.end}</span>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  )};

  return (
    <div className="p-4 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-slate-50 relative">
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm"><FileSpreadsheet size={24} /></div>
            <h1 className="text-xl font-bold text-slate-800">전담 시간표 조회</h1>
        </div>
        <div className="flex gap-4 items-center">
           {onNavigate && viewMode === 'single' && (
                <button onClick={handleDecorateClick} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all mr-2"><Sparkles size={14} className="text-yellow-300" /><span className="drop-shadow-sm">시간표 꾸미기</span></button>
           )}
           {viewMode === 'single' && (
                <button onClick={() => { if (isConfirmingReset) { handleClearTeacher(); } else { setIsConfirmingReset(true); setTimeout(() => setIsConfirmingReset(false), 3000); } }} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all mr-2 ${isConfirmingReset ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-slate-500 hover:bg-red-50'}`}>{isConfirmingReset ? <><AlertTriangle size={14}/> 정말 초기화?</> : <><Trash2 size={14}/> 초기화</>}</button>
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
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                    <span className="text-xs font-bold text-slate-500 pl-1">행별 개수</span>
                    <button 
                        onClick={() => setColumnsPerRow(Math.max(1, columnsPerRow - 1))}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <ChevronDown size={14} />
                    </button>
                    <span className="text-xs w-4 text-center font-bold text-slate-700">{columnsPerRow}</span>
                    <button 
                        onClick={() => setColumnsPerRow(Math.min(6, columnsPerRow + 1))}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <ChevronUp size={14} />
                    </button>
                 </div>

                 <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                    <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomOut size={16} /></button>
                    <span className="text-xs w-12 text-center font-mono font-bold text-slate-600">{(zoomLevel * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomIn size={16} /></button>
                 </div>
             </div>
           )}
           {viewMode === 'single' && (
              <div className="relative">
                  <select 
                    value={selectedTeacherId} 
                    onChange={(e) => setSelectedTeacherId(e.target.value)} 
                    className="appearance-none bg-white border border-slate-300 py-2 pl-4 pr-10 rounded-lg font-bold outline-none shadow-sm text-slate-700 min-w-[150px]"
                  >
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronDown size={14} /></div>
              </div>
           )}
           <button onClick={() => setViewMode(viewMode === 'single' ? 'all' : 'single')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md transition-all active:scale-95">{viewMode === 'single' ? '전체 보기' : '개별 보기'}</button>
           <div className="relative"><button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"><Download size={16} /></button>
             {showDownloadMenu && <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                 <div className="text-xs font-bold text-slate-400 px-2 py-1">현재 교사 ({teachers.find(t=>t.id===selectedTeacherId)?.name})</div>
                 <button onClick={() => handleDownload('xls', 'single')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-green-600" /> Excel (.xls)</button>
                 <button onClick={() => handleDownload('print', 'single')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                 <div className="h-px bg-slate-100 my-1"></div>
                 <div className="text-xs font-bold text-slate-400 px-2 py-1">전체 교사 (일괄)</div>
                 <button onClick={() => handleDownload('xls', 'all')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-green-600" /> Excel (.xls)</button>
                 <button onClick={() => handleDownload('print', 'all')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                 <div className="h-px bg-slate-100 my-1"></div>
                 <button onClick={handleExportImage} className="w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-2 transition-colors font-bold bg-indigo-50/50"><Image size={16} /> 1장 인쇄 (이미지)</button>
                 </div>}
             {showDownloadMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>}
           </div>
        </div>
      </header>
      
      <div id="teacher-timetable-container" className="flex-1 overflow-auto bg-slate-50 rounded-xl pb-16 scrollbar-thin">
          <div className="pb-8">
              {viewMode === 'single' ? (
                  <div className="max-w-5xl mx-auto mt-2 animate-in fade-in zoom-in-95 duration-300">
                      {teachers.length > 0 ? renderSingleView(selectedTeacherId) : <div className="text-center py-20 text-slate-400">등록된 전담 교사가 없습니다.</div>}
                  </div>
              ) : (
                  <div className="space-y-6 origin-top-left p-4 transition-transform" style={{ transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%` }}>
                      <div 
                        className="grid gap-6"
                        style={{ gridTemplateColumns: `repeat(${columnsPerRow || 3}, minmax(0, 1fr))` }}
                      >
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="h-auto">
                                {renderSingleView(teacher.id, true)}
                            </div>
                        ))}
                      </div>
                      {teachers.length === 0 && <div className="text-slate-300 text-sm italic py-4 text-center">등록된 교사가 없습니다</div>}
                  </div>
              )}
          </div>
      </div>

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
    </div>
  );
};