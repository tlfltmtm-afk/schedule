
import React, { useState, useMemo, useEffect } from 'react';
import { useSchedule, downloadFile, generateHtmlDoc, printContent } from '../services/scheduleService';
import { DAYS } from '../constants';
import { MapPin, ZoomIn, ZoomOut, Maximize, GripVertical, Download, ChevronDown, FileSpreadsheet, Printer, AlertTriangle, Timer } from 'lucide-react';
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

// Helper to format class names (reuse logic from MasterSchedule)
const formatClassId = (classId: string, config: TeacherLayoutConfig) => {
    if (classId === '미배정') return '-';
    if (classId === '기타') return '기타';
    if (config.customLabels[classId]) return config.customLabels[classId];
    
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

export const VenueStatus: React.FC = () => {
  const { rooms, reorderRooms, timetable, getSubjectColor, schoolInfo, teacherConfig } = useSchedule();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  const activePeriods = useMemo(() => {
    // Correctly union ALL defined period keys across schedules
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

  const handleDragStart = (e: React.DragEvent, room: Room) => { setDraggedRoomId(room.id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    if (!draggedRoomId || draggedRoomId === targetRoomId) return;
    const sourceIndex = rooms.findIndex(r => r.id === draggedRoomId);
    const targetIndex = rooms.findIndex(r => r.id === targetRoomId);
    if (sourceIndex > -1 && targetIndex > -1) {
       const newRooms = [...rooms];
       const [moved] = newRooms.splice(sourceIndex, 1);
       newRooms.splice(targetIndex, 0, moved);
       reorderRooms(newRooms);
    }
    setDraggedRoomId(null);
  };

  const generateVenueHtml = () => {
      let tableHtml = `<div style="margin-bottom: 20px;"><h2>특별실 전체 현황</h2><table border="1" style="width:100%; border-collapse: collapse; text-align: center;"><thead><tr style="background:#f3f4f6;"><th>요일</th><th>저(A)</th><th>고(B)</th>`;
      rooms.forEach(r => { tableHtml += `<th>${r.name}</th>`; });
      tableHtml += `</tr></thead><tbody>`;
      DAYS.forEach(day => {
         activePeriods.forEach((period, pIndex) => {
            tableHtml += `<tr>`;
            if (pIndex === 0) { tableHtml += `<td rowspan="${activePeriods.length}" style="font-weight:bold; background:#f9fafb; vertical-align:middle;">${day}</td>`; }
            
            const tA = getBellTime(0, period);
            const tB = schoolInfo.hasDistinctSchedules ? getBellTime(1, period) : null;
            
            // Left Track A
            tableHtml += `<td style="font-size:10px;">${tA ? `<strong>${tA.name}</strong><br>${tA.start}~${tA.end}` : '-'}</td>`;
            
            // Right Track B
            if (schoolInfo.hasDistinctSchedules) {
                tableHtml += `<td style="font-size:10px;">${tB ? `<strong>${tB.name}</strong><br>${tB.start}~${tB.end}` : '-'}</td>`;
            } else {
                tableHtml += `<td>-</td>`;
            }

            rooms.forEach(room => {
                const occupants = getRoomStatus(room.id, day, period);
                const content = occupants.map(o => formatClassId(o.classId, teacherConfig)).join(', ');
                let cellStyle = "mso-number-format:'\\@';"; // Force text format for Excel
                if (occupants.length > room.capacity) {
                    cellStyle += 'background:#fef2f2; color:red; font-weight:bold;';
                }
                tableHtml += `<td style="${cellStyle}">${content}</td>`;
            });
            tableHtml += `</tr>`;
         });
      });
      tableHtml += `</tbody></table></div>`;
      return tableHtml;
  };

  const handleDownload = (format: 'xls' | 'print') => {
      const title = '특별실_전체현황';
      const htmlContent = generateHtmlDoc(title, generateVenueHtml());
      if (format === 'xls') { downloadFile(`${title}.xls`, htmlContent, 'application/vnd.ms-excel'); }
      else { printContent(htmlContent); }
      setShowDownloadMenu(false);
  };

  const hasDual = schoolInfo.hasDistinctSchedules;
  const COL_WIDTHS = { DAY: '50px', PERIOD_TRACK: '80px' };

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-slate-50 overflow-y-auto">
      <header className="mb-6 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shadow-sm"><MapPin size={24} /></div>
            <div>
            <h1 className="text-2xl font-bold text-slate-800">특별실 현황</h1>
            <p className="text-slate-500 text-sm">시정표에 설정된 모든 교시와 특별 활동(점심 등)이 정확하게 표시됩니다.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            {hasDual && (
                <div className="hidden md:flex gap-3">
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-1 shadow-sm"><Timer size={12}/> 시정표 A: 저학년</div>
                    <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-200 flex items-center gap-1 shadow-sm"><Timer size={12}/> 시정표 B: 고학년</div>
                </div>
            )}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomOut size={16} /></button>
                <span className="text-xs w-12 text-center font-mono font-bold text-slate-700">{`${(zoomLevel * 100).toFixed(0)}%`}</span>
                <button onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-1 hover:bg-slate-100 rounded transition-colors"><ZoomIn size={16} /></button>
                <div className="relative ml-2 pl-2 border-l border-slate-200">
                <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-colors"><Download size={16} />저장/인쇄</button>
                {showDownloadMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => handleDownload('xls')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xls)</button>
                        <button onClick={() => handleDownload('print')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2 transition-colors"><Printer size={16} className="text-slate-600" /> 인쇄 / PDF</button>
                    </div>
                )}
                {showDownloadMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>}
            </div>
            </div>
        </div>
      </header>

      {/* Main Status Table */}
      <div className="flex-1 bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto h-full">
            <div className="origin-top-left h-full" style={{ transform: `scale(${zoomLevel})`, width: `${100/zoomLevel}%`, minWidth: '100%' }}>
                <table className="w-full border-collapse h-full">
                <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                    <tr className="text-[11px] font-bold text-slate-500 h-10">
                        <th className="p-3 text-center border-b border-r bg-slate-100 sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ width: COL_WIDTHS.DAY }}>요일</th>
                        <th className="p-2 border-b border-r bg-blue-100/30 text-blue-600 text-center" style={{ width: COL_WIDTHS.PERIOD_TRACK }}>저(A)</th>
                        
                        {rooms.map(room => (
                            <th key={room.id} className="p-2 border-b text-center border-l bg-slate-50 text-slate-800 font-bold min-w-[70px] cursor-move group" draggable onDragStart={(e) => handleDragStart(e, room)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, room.id)}>
                                <div className="flex flex-col items-center gap-1"><span className="break-words w-full text-sm">{room.name}</span><div className="text-[9px] text-slate-400 font-normal">Cap: {room.capacity}</div><GripVertical size={10} className="text-slate-300 opacity-0 group-hover:opacity-100"/></div>
                            </th>
                        ))}

                        {hasDual && <th className="p-2 border-b border-l bg-rose-100/30 text-rose-600 text-center" style={{ width: COL_WIDTHS.PERIOD_TRACK }}>고(B)</th>}
                    </tr>
                </thead>
                <tbody>
                    {DAYS.map(day => (
                    <React.Fragment key={day}>
                        {activePeriods.map((period, pIndex) => {
                        const tA = getBellTime(0, period);
                        const tB = hasDual ? getBellTime(1, period) : null;
                        
                        // Row highlight for breaks
                        const isBothEtc = tA?.type === 'ETC' && (hasDual ? tB?.type === 'ETC' : true);

                        return (
                        <tr key={`${day}-${period}`} className={`hover:bg-slate-50 group transition-colors ${isBothEtc ? 'bg-orange-50/10' : ''}`}>
                            {pIndex === 0 && (
                                <td rowSpan={activePeriods.length} className="p-2 border-b border-r bg-white text-center font-bold text-slate-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ width: COL_WIDTHS.DAY }}>{day}</td>
                            )}
                            
                            {/* 좌측 정보 A */}
                            <td className={`border-b border-r px-0.5 py-2 text-center align-middle ${tA?.type === 'ETC' ? 'bg-orange-50/40' : 'bg-slate-50'}`}>
                                <div className={`font-bold text-[10px] leading-none ${tA?.type === 'ETC' ? 'text-orange-700' : 'text-slate-700'}`}>
                                    {tA ? tA.name : "-"}
                                </div>
                                <div className="text-[8px] text-blue-600 font-mono font-bold leading-none mt-1 tracking-tighter">{tA ? `${tA.start}~${tA.end}` : "-"}</div>
                            </td>

                            {rooms.map(room => {
                            const occupants = getRoomStatus(room.id, day, period);
                            const isOverCapacity = occupants.length > room.capacity;
                            const hasOccupants = occupants.length > 0;
                            return (
                                <td key={`${day}-${period}-${room.id}`} className={`border-b border-l p-1 transition-colors align-top h-14 ${isOverCapacity ? 'bg-red-50' : (hasOccupants ? 'bg-emerald-50/30' : '')}`}>
                                {hasOccupants ? (
                                    <div className={`w-full h-full rounded border flex flex-col justify-center items-center gap-1 p-1 relative min-h-[3rem] ${isOverCapacity ? 'border-red-400 ring-2 ring-red-200 ring-inset shadow-sm' : 'border-emerald-200 shadow-sm bg-white/60'}`}>
                                        {isOverCapacity && <AlertTriangle size={14} className="text-red-600 absolute -top-1 -right-1 z-10 bg-white rounded-full p-0.5 shadow-sm" />}
                                        {occupants.map(occ => {
                                            const baseColor = getSubjectColor(occ.subject);
                                            // Apply gradient only to background
                                            const finalStyle = getGradeAdjustedStyle(baseColor, occ.classId, occ.customStyle);
                                            return (
                                                <span key={occ.id} className={`text-[10px] font-bold px-1 rounded shadow-sm w-full text-center truncate ${finalStyle}`}>
                                                    {formatClassId(occ.classId, teacherConfig)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    isBothEtc ? <div className="w-full h-full flex items-center justify-center text-[9px] text-orange-200 font-bold">{tA?.name}</div> : null
                                )}
                                </td>
                            );
                            })}

                            {/* 우측 정보 B */}
                            {hasDual && (
                                <td className={`border-b border-l px-0.5 py-2 text-center align-middle ${tB?.type === 'ETC' ? 'bg-orange-50/40' : 'bg-slate-50'}`}>
                                    <div className={`font-bold text-[10px] leading-none ${tB?.type === 'ETC' ? 'text-orange-700' : 'text-slate-700'}`}>
                                        {tB ? tB.name : "-"}
                                    </div>
                                    <div className="text-[8px] text-rose-600 font-mono font-bold leading-none mt-1 tracking-tighter">{tB ? `${tB.start}~${tB.end}` : "-"}</div>
                                </td>
                            )}
                        </tr>
                        );})}
                        <tr className="h-2 bg-slate-100"><td colSpan={rooms.length + (hasDual ? 3 : 2)} className="border-0"></td></tr>
                    </React.Fragment>
                    ))}
                </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
