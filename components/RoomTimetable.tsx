
import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule, downloadFile, generateHtmlDoc, printContent, exportToImage } from '../services/scheduleService';
import { DAYS } from '../constants';
import { CalendarRange, Download, FileSpreadsheet, Printer, Check, Timer, ChevronDown, Columns, PanelLeft, PanelRight, UserCheck, Image } from 'lucide-react';
import { Room, Period, TeacherLayoutConfig, SubjectStyle } from '../types';

// Helper to extract grade number
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
    
    const intensity = grade * 100;
    const bgMatch = baseStyle.match(/bg-([a-z]+)-(\d+)/);
    
    if (bgMatch) {
        const hue = bgMatch[1];
        // Replace only the background part
        return baseStyle.replace(/bg-[a-z]+-\d+/, `bg-${hue}-${intensity}`);
    }
    
    return baseStyle;
};

// Helper to format class names
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

export const RoomTimetable: React.FC = () => {
  const { rooms, timetable, getSubjectColor, schoolInfo, teacherConfig } = useSchedule();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [bellScheduleMode, setBellScheduleMode] = useState<'dual' | 'auto'>('auto');

  // Initialize selected room
  useEffect(() => {
      if (rooms.length > 0 && !selectedRoomId) {
          setSelectedRoomId(rooms[0].id);
      }
  }, [rooms, selectedRoomId]);

  const activePeriods = useMemo(() => {
    // Collect ALL unique period indices from ALL bell schedules to ensure no data is cut off
    const allPeriods = new Set<number>();
    schoolInfo.bellSchedules.forEach(s => {
        Object.keys(s.periods).forEach(p => allPeriods.add(Number(p)));
    });
    return Array.from(allPeriods).sort((a,b) => a-b) as Period[];
  }, [schoolInfo.bellSchedules]);

  const getRoomStatus = (roomId: string, day: string, period: number) => {
    return timetable.filter(t => t.roomId === roomId && t.day === day && t.period === period);
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
  
  // Logic for Auto Detection
  let showDual = false;
  let showB = false;

  if (hasDual) {
      if (bellScheduleMode === 'dual') {
          showDual = true;
      } else {
          // Auto Detect Logic for Room
          // Check all slots in this room
          const occupants = timetable.filter(t => t.roomId === selectedRoomId);
          const occupantGrades = new Set<number>();
          occupants.forEach(o => {
              const g = extractGrade(o.classId);
              if (g > 0) occupantGrades.add(g);
          });

          const hasLow = Array.from(occupantGrades).some(g => g <= 2);
          const hasHigh = Array.from(occupantGrades).some(g => g >= 3);

          if (hasLow && hasHigh) {
              showDual = true;
          } else if (hasHigh) {
              showB = true;
          }
          // Default A
      }
  }

  const showRightSide = showDual;
  const leftScheduleIdx = showB ? 1 : 0;

  const generateHtml = () => {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (!room) return '';
      
      let html = `<div style="text-align:center; margin-bottom:30px;"><h2>${room.name} 시간표</h2><p>수용인원: ${room.capacity}학급</p></div>`;
      html += `<table border="1" style="width:100%; border-collapse: collapse; text-align: center;">`;
      html += `<thead><tr style="background:#f3f4f6;">`;
      
      if (showRightSide) html += `<th style="width:100px;">저(A)</th>`;
      else html += `<th style="width:100px;">${bellScheduleMode === 'auto' ? '시간' : '시간(A)'}</th>`;
      
      DAYS.forEach(d => html += `<th>${d}</th>`);
      
      if (showRightSide) html += `<th style="width:100px;">고(B)</th>`;
      
      html += `</tr></thead><tbody>`;
      
      activePeriods.forEach(p => {
          const tLeft = getBellTime(leftScheduleIdx, p);
          const tRight = showRightSide ? getBellTime(1, p) : null;
          
          html += `<tr>`;
          
          // Left Track
          const timeA = tLeft ? `<div style="font-size:12px; font-weight:bold;">${tLeft.name}</div><div style="font-size:10px; color:#2563eb">${tLeft.start}~${tLeft.end}</div>` : '-';
          html += `<td style="background:#f9fafb; padding:8px;">${timeA}</td>`;

          // Contents
          DAYS.forEach(d => {
              const occupants = getRoomStatus(room.id, d, p);
              const content = occupants.map(o => `${formatClassId(o.classId, teacherConfig)}(${o.subject})`).join('<br>');
              html += `<td style="padding:8px;">${content}</td>`;
          });

          // Right Track
          if (showRightSide) {
            const timeB = tRight ? `<div style="font-size:12px; font-weight:bold;">${tRight.name}</div><div style="font-size:10px; color:#e11d48">${tRight.start}~${tRight.end}</div>` : '-';
            html += `<td style="background:#f9fafb; padding:8px;">${timeB}</td>`;
          }
          
          html += `</tr>`;
      });
      html += `</tbody></table>`;
      return html;
  };

  const handleDownload = (format: 'xls' | 'print') => {
      const roomName = rooms.find(r => r.id === selectedRoomId)?.name || '특별실';
      const title = `${roomName}_시간표`;
      const htmlContent = generateHtmlDoc(title, generateHtml());
      if (format === 'xls') { downloadFile(`${title}.xls`, htmlContent, 'application/vnd.ms-excel'); }
      else { printContent(htmlContent); }
      setShowDownloadMenu(false);
  };

  const handleExportImage = () => {
      const roomName = rooms.find(r => r.id === selectedRoomId)?.name || '특별실';
      exportToImage('room-timetable-container', `${roomName}_시간표`);
      setShowDownloadMenu(false);
  };

  const COL_WIDTHS = { DAY: '50px', PERIOD_TRACK: '80px' };

  return (
    <div className="p-4 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-slate-50 overflow-y-auto">
      <header className="mb-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg shadow-sm"><CalendarRange size={24} /></div>
            <h1 className="text-xl font-bold text-slate-800">특별실 시간표 조회</h1>
        </div>
        
        <div className="flex items-center gap-4">
             {hasDual && (
               <div className="flex bg-white p-1 rounded-lg border shadow-sm mr-2">
                   <button onClick={() => setBellScheduleMode('dual')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${bellScheduleMode === 'dual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                       <Columns size={12} /> 투트랙 (A+B)
                   </button>
                   <button onClick={() => setBellScheduleMode('auto')} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${bellScheduleMode === 'auto' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                       <UserCheck size={12} /> 자동 (Auto)
                   </button>
               </div>
             )}

             <div className="relative">
                  <select 
                    value={selectedRoomId} 
                    onChange={(e) => setSelectedRoomId(e.target.value)} 
                    className="appearance-none bg-white border border-slate-300 py-2 pl-4 pr-10 rounded-lg font-bold outline-none shadow-sm text-slate-700 min-w-[150px]"
                  >
                    {rooms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronDown size={14} /></div>
              </div>

            <div className="relative">
                <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)} 
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold shadow-sm hover:bg-indigo-100 transition-colors text-sm"
                >
                    <Download size={16} /> 저장/인쇄
                </button>
                {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => handleDownload('xls')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xls)</button>
                    <button onClick={() => handleDownload('print')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={handleExportImage} className="w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-2 transition-colors font-bold bg-indigo-50/50"><Image size={16} /> 1장 이미지 다운</button>
                </div>
                )}
                {showDownloadMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>}
            </div>
        </div>
      </header>

      <div id="room-timetable-container" className="flex-1 overflow-auto bg-slate-50 rounded-xl pb-16 scrollbar-thin">
          <div className="max-w-6xl mx-auto mt-2 animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-3 h-8 bg-emerald-500 rounded-sm"></span>
                        {rooms.find(r => r.id === selectedRoomId)?.name || '선택된 특별실 없음'}
                        <span className="ml-2 text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border">
                            수용인원: {rooms.find(r => r.id === selectedRoomId)?.capacity}학급
                        </span>
                    </h2>
                    {hasDual && bellScheduleMode === 'auto' && (
                      <span className={`text-xs px-3 py-1 border rounded-full font-bold flex items-center gap-1 shadow-sm ${showDual ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : (showB ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-blue-50 border-blue-200 text-blue-600')}`}>
                          <Timer size={12}/> {showDual ? '투트랙 (A+B)' : (showB ? '시정표 B (고학년)' : '시정표 A (저학년)')}
                      </span>
                    )}
                </div>

                {/* Grid Header */}
                <div className={`grid ${showRightSide ? 'grid-cols-7' : 'grid-cols-6'} border-b divide-x`}>
                    <div className={`p-3 font-bold text-center text-sm ${showRightSide ? 'text-blue-600 bg-blue-50/30' : 'text-slate-600 bg-slate-50'}`}>
                        {showRightSide ? '저(A)' : (showB ? '시간(B)' : '시간(A)')}
                    </div>
                    {DAYS.map(day => (
                        <div key={day} className="p-3 font-bold text-slate-700 bg-slate-50 text-center">{day}</div>
                    ))}
                    {showRightSide && (
                        <div className="p-3 font-bold text-rose-600 bg-rose-50/30 text-center text-sm">고(B)</div>
                    )}
                </div>

                {/* Grid Body */}
                {activePeriods.map(period => {
                    const tLeft = getBellTime(leftScheduleIdx, period);
                    const tRight = showRightSide ? getBellTime(1, period) : null;
                    const room = rooms.find(r => r.id === selectedRoomId);
                    
                    return (
                        <div key={period} className={`grid ${showRightSide ? 'grid-cols-7' : 'grid-cols-6'} divide-x border-b last:border-0`}>
                            {/* Time Column Left */}
                            <div className={`p-2 h-24 flex flex-col items-center justify-center border-r border-slate-200 transition-colors
                                ${tLeft ? (tLeft.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50') : 'bg-slate-200 opacity-20'}
                            `}>
                                <span className={`font-bold text-sm truncate w-full text-center leading-snug mb-0.5 ${tLeft?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                    {tLeft ? tLeft.name : '-'}
                                </span>
                                {tLeft && <span className="text-[10px] text-blue-600 font-mono font-bold leading-tight tracking-tight">{tLeft.start}~{tLeft.end}</span>}
                            </div>

                            {/* Days Columns */}
                            {DAYS.map(day => {
                                const occupants = room ? getRoomStatus(room.id, day, period) : [];
                                const isOver = room && occupants.length > room.capacity;
                                const isSingle = occupants.length === 1;
                                
                                // Check if this period is an ETC (Break/Lunch) for BOTH tracks if dual
                                const isBothEtc = tLeft?.type === 'ETC' && (showRightSide ? tRight?.type === 'ETC' : true);

                                return (
                                    <div key={day} className={`p-1 h-24 relative ${isOver ? 'bg-red-50' : (isBothEtc ? 'bg-orange-50/20' : '')}`}>
                                        {isSingle ? (() => {
                                            const occ = occupants[0];
                                            const baseColor = getSubjectColor(occ.subject);
                                            const finalStyle = getGradeAdjustedStyle(baseColor, occ.classId, occ.customStyle);
                                            return (
                                                <div className={`w-full h-full rounded border shadow-sm flex flex-col justify-center items-center text-center p-1 ${finalStyle}`}>
                                                    <span className="text-base font-extrabold leading-tight">
                                                        {formatClassId(occ.classId, teacherConfig)}
                                                    </span>
                                                    <span className="text-xs font-medium mt-0.5 opacity-90">
                                                        {occ.subject}
                                                    </span>
                                                </div>
                                            );
                                        })() : (
                                            <div className="w-full h-full flex flex-col gap-1 overflow-y-auto">
                                                {occupants.map((occ, idx) => {
                                                    const baseColor = getSubjectColor(occ.subject);
                                                    const finalStyle = getGradeAdjustedStyle(baseColor, occ.classId, occ.customStyle);
                                                    
                                                    return (
                                                        <div key={idx} className={`w-full text-xs p-1.5 rounded border shadow-sm text-center font-bold truncate ${finalStyle}`}>
                                                            {formatClassId(occ.classId, teacherConfig)} ({occ.subject})
                                                        </div>
                                                    );
                                                })}
                                                {occupants.length === 0 && isBothEtc && (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-orange-300 font-bold opacity-50">
                                                        {tLeft?.name}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Time Column Right */}
                            {showRightSide && (
                                <div className={`p-2 h-24 flex flex-col items-center justify-center border-l border-slate-200 transition-colors
                                    ${tRight ? (tRight.type === 'ETC' ? 'bg-orange-50/50' : 'bg-slate-50') : 'bg-slate-200 opacity-20'}
                                `}>
                                    <span className={`font-bold text-sm truncate w-full text-center leading-snug mb-0.5 ${tRight?.type === 'ETC' ? 'text-orange-600' : 'text-slate-700'}`}>
                                        {tRight ? tRight.name : '-'}
                                    </span>
                                    {tRight && <span className="text-[10px] text-rose-600 font-mono font-bold leading-tight tracking-tight">{tRight.start}~{tRight.end}</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
             </div>
          </div>
      </div>
    </div>
  );
};
