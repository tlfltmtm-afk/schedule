
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    SchoolInfo, Teacher, Room, SubjectStyle, SubjectConfig, 
    TeacherLayoutConfig, TimeSlot, Conflict, ClassBlock, BellSchedule 
} from '../types';
import { 
    INITIAL_ROOMS, INITIAL_TEACHERS, INITIAL_SUBJECTS, INITIAL_BELL_SCHEDULES, SUBJECT_COLORS 
} from '../constants';

// --- Helpers ---

export const extractGrade = (classId: string): number => {
    const match = classId.match(/(?:^|-|custom-)?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

export const hashPassword = async (password: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const downloadFile = (fileName: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const generateHtmlDoc = (title: string, bodyContent: string) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
            body { font-family: sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            h2, h3 { text-align: center; }
            @media print {
                body { padding: 0; }
                .page-break { page-break-after: always; }
            }
        </style>
    </head>
    <body>
        ${bodyContent}
    </body>
    </html>
    `;
};

export const printContent = (htmlContent: string) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
};

export const exportToImage = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        alert("요소를 찾을 수 없습니다.");
        return;
    }
    
    // @ts-ignore
    if (!window.html2canvas) {
         alert("이미지 변환 라이브러리(html2canvas)가 로드되지 않았습니다. 페이지를 새로고침 해보세요.");
         return;
    }

    // Show loading feedback
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    try {
        // @ts-ignore
        const canvas = await window.html2canvas(element, {
            scale: 2, // High resolution
            useCORS: true, 
            logging: false,
            // Capture full dimensions including scroll
            width: element.scrollWidth,
            height: element.scrollHeight,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc: any) => {
                const clonedEl = clonedDoc.getElementById(elementId);
                if (clonedEl) {
                    // 1. Root Container Expansion
                    clonedEl.style.overflow = 'visible';
                    clonedEl.style.height = 'auto';
                    clonedEl.style.width = 'fit-content';
                    clonedEl.style.maxHeight = 'none';
                    clonedEl.style.maxWidth = 'none';

                    // 2. Reset Zoom/Transform Container (Specific for ClassSchedule All View)
                    const transformContainer = clonedEl.querySelector('div[style*="transform"]');
                    if (transformContainer) {
                        transformContainer.style.transform = 'none';
                        transformContainer.style.width = 'fit-content'; // Expand to fit children
                        transformContainer.style.minWidth = '100%'; // Ensure at least full width
                    }

                    // 3. Expand Horizontal Scrolling Rows (Specific for Grade Rows)
                    const scrollContainers = clonedEl.querySelectorAll('.overflow-x-auto');
                    scrollContainers.forEach((node: any) => {
                        const row = node as HTMLElement;
                        row.style.overflow = 'visible';
                        row.style.width = 'fit-content';
                        row.style.maxWidth = 'none';
                        row.style.display = 'flex'; // Ensure flex layout is maintained
                        row.style.flexWrap = 'nowrap'; // Prevent wrapping if it was single row
                    });
                }
            }
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Image export failed", error);
        alert("이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
        document.body.style.cursor = originalCursor;
    }
};

// --- Context ---

interface ScheduleContextType {
    schoolInfo: SchoolInfo;
    setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
    teachers: Teacher[];
    setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
    addTeacher: (teacher: Teacher) => void;
    updateTeacher: (teacher: Teacher) => void;
    removeTeacher: (id: string) => void;
    rooms: Room[];
    addRoom: (room: Room) => void;
    removeRoom: (id: string) => void;
    updateRoom: (room: Room) => void;
    reorderRooms: (rooms: Room[]) => void;
    subjects: string[];
    setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
    timetable: TimeSlot[];
    addTimeSlot: (slot: TimeSlot) => void;
    removeTimeSlot: (id: string) => void;
    updateTimeSlot: (slot: TimeSlot) => void;
    
    subjectStyles: Record<string, SubjectStyle>;
    subjectConfigs: Record<string, SubjectConfig>;
    subjectHours: Record<string, number>;
    teacherConfig: TeacherLayoutConfig;
    setTeacherConfig: React.Dispatch<React.SetStateAction<TeacherLayoutConfig>>;
    
    updateSubjectDetails: (subject: string, newName: string, style: SubjectStyle, config: Partial<SubjectConfig>) => void;
    getSubjectColor: (subject: string) => string;
    checkConflict: (slot: TimeSlot, currentTimetable?: TimeSlot[]) => Conflict;
    getRequiredHours: (subject: string) => number;
    getUnassignedSpecialistBlocks: (teacherId: string) => ClassBlock[];
    getClassList: () => string[];
    
    importData: (json: any) => { total: number, conflicts: number };
    
    isAdmin: boolean;
    projectPassword: string | null;
    verifyPassword: (password: string) => Promise<boolean>;
    
    transferredTimetableCode: string;
    setTransferredTimetableCode: React.Dispatch<React.SetStateAction<string>>;

    addSubjectGradeOverlap: (subject: string, grade: number) => void;
    clearTeacherSchedule: (teacherId: string) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State Initialization
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
        name: '행복초등학교',
        classesPerGrade: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 },
        maxPeriods: { 1: 5, 2: 5, 3: 6, 4: 6, 5: 6, 6: 6 },
        bellSchedules: INITIAL_BELL_SCHEDULES,
        hasDistinctSchedules: false
    });

    const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
    const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
    const [subjects, setSubjects] = useState<string[]>(INITIAL_SUBJECTS);
    const [timetable, setTimetable] = useState<TimeSlot[]>([]);
    
    const [subjectStyles, setSubjectStyles] = useState<Record<string, SubjectStyle>>({});
    const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfig>>({});
    const [subjectHours, setSubjectHours] = useState<Record<string, number>>({});
    
    const [teacherConfig, setTeacherConfig] = useState<TeacherLayoutConfig>({
        grades: ['1', '2', '3', '4', '5', '6'],
        extraClassCounts: {},
        customLabels: {},
        hiddenLevel: []
    });

    const [transferredTimetableCode, setTransferredTimetableCode] = useState('');
    const [projectPassword, setProjectPassword] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Methods
    const addTeacher = (t: Teacher) => setTeachers(prev => [...prev, t]);
    const updateTeacher = (t: Teacher) => setTeachers(prev => prev.map(teacher => teacher.id === t.id ? t : teacher));
    const removeTeacher = (id: string) => {
        setTeachers(prev => prev.filter(t => t.id !== id));
        setTimetable(prev => prev.filter(t => t.teacherId !== id));
    };

    const addRoom = (r: Room) => setRooms(prev => [...prev, r]);
    const removeRoom = (id: string) => setRooms(prev => prev.filter(r => r.id !== id));
    const updateRoom = (r: Room) => setRooms(prev => prev.map(room => room.id === r.id ? r : room));
    const reorderRooms = (newRooms: Room[]) => setRooms(newRooms);

    const addTimeSlot = (slot: TimeSlot) => setTimetable(prev => [...prev, slot]);
    const removeTimeSlot = (id: string) => setTimetable(prev => prev.filter(t => t.id !== id));
    const updateTimeSlot = (slot: TimeSlot) => setTimetable(prev => prev.map(t => t.id === slot.id ? slot : t));

    const updateSubjectDetails = (subject: string, newName: string, style: SubjectStyle, config: Partial<SubjectConfig>) => {
        if (subject !== newName) {
            setSubjects(prev => prev.map(s => s === subject ? newName : s));
            setTeachers(prev => prev.map(t => ({
                ...t,
                assignments: t.assignments.map(a => a.subject === subject ? { ...a, subject: newName } : a)
            })));
            setTimetable(prev => prev.map(t => t.subject === subject ? { ...t, subject: newName } : t));
            
            const newStyles = { ...subjectStyles, [newName]: style };
            delete newStyles[subject];
            setSubjectStyles(newStyles);
            
            const newConfigs = { ...subjectConfigs, [newName]: { ...subjectConfigs[subject], ...config } };
            delete newConfigs[subject];
            setSubjectConfigs(newConfigs);
        } else {
            setSubjectStyles(prev => ({ ...prev, [subject]: style }));
            setSubjectConfigs(prev => ({ ...prev, [subject]: { ...prev[subject], ...config } }));
        }
    };

    const getSubjectColor = (subject: string) => {
        if (subjectStyles[subject]) {
            const s = subjectStyles[subject];
            return `${s.bgColor} ${s.textColor} ${s.borderColor} ${s.borderWidth} ${s.borderStyle} ${s.fontWeight}`;
        }
        return SUBJECT_COLORS[subject] || SUBJECT_COLORS['Default'];
    };

    const checkConflict = (slot: TimeSlot, currentTimetable: TimeSlot[] = timetable): Conflict => {
        if (!slot.teacherId && !slot.classId) return { hasConflict: false };

        const conflicts: TimeSlot[] = [];
        let reason = '';

        // 1. Teacher Check
        if (slot.teacherId) {
            const teacherBusy = currentTimetable.find(t => 
                t.id !== slot.id && 
                t.teacherId === slot.teacherId && 
                t.day === slot.day && 
                t.period === slot.period
            );
            if (teacherBusy) {
                conflicts.push(teacherBusy);
                reason = '교사 중복 배정';
            }
        }

        // 2. Class Check (Enhanced for Level/Integrated classes)
        if (slot.classId && slot.classId !== '미배정' && slot.classId !== '기타') {
             const slotGrade = extractGrade(slot.classId);
             const isSlotLevel = slot.classId.includes('레벨') || slot.classId.includes('통합');

             // Find ALL conflicting class slots
             const classBusyList = currentTimetable.filter(t => {
                if (t.id === slot.id) return false;
                if (t.day !== slot.day || t.period !== slot.period) return false;
                if (t.classId === '미배정' || t.classId === '기타') return false;

                // Case A: Exact Match (e.g. 2-3 vs 2-3)
                if (t.classId === slot.classId) return true;

                // Case B: Level/Integrated Overlap (e.g. 2-3 vs 2학년 L)
                // If specific class collides with a whole-grade level class, that's a conflict
                const tGrade = extractGrade(t.classId);
                // Only check grade overlap if distinct grades are found
                if (slotGrade !== 0 && tGrade !== 0 && slotGrade === tGrade) {
                    const isTLevel = t.classId.includes('레벨') || t.classId.includes('통합');
                    // If either the new slot OR the existing slot is a level/integrated class,
                    // they spatially collide because Level classes cover the student body.
                    if (isSlotLevel || isTLevel) return true;
                }
                return false;
             });

             if (classBusyList.length > 0) {
                 for (const classBusy of classBusyList) {
                     const config = subjectConfigs[slot.subject];
                     const isAllowed = config?.allowOverlap || 
                                       (config?.allowOverlapByGrade && config.allowOverlapByGrade.includes(slotGrade));
                     
                     const busyConfig = subjectConfigs[classBusy.subject];
                     const busyAllowed = busyConfig?.allowOverlap ||
                                         (busyConfig?.allowOverlapByGrade && busyConfig.allowOverlapByGrade.includes(extractGrade(classBusy.classId)));

                     // CRITICAL CHECK: Even if overlap is allowed (for Level classes), 
                     // it is ONLY allowed if the subjects are the SAME.
                     // Different subjects colliding is ALWAYS a conflict (e.g. Korean vs English Level Class).
                     const isSameSubject = slot.subject === classBusy.subject;

                     if (!isSameSubject) {
                         conflicts.push(classBusy);
                         reason = reason ? `${reason}, 학급 중복(타교과)` : '학급 중복 배정 (타교과)';
                     } else {
                         // Same subject, check if overlap is configured to be allowed
                         if (!isAllowed && !busyAllowed) {
                             conflicts.push(classBusy);
                             reason = reason ? `${reason}, 학급 중복` : '학급 중복 배정';
                         }
                     }
                 }
             }
        }

        // 3. Room Check
        if (slot.roomId) {
            const room = rooms.find(r => r.id === slot.roomId);
            if (room) {
                const occupants = currentTimetable.filter(t => 
                    t.id !== slot.id &&
                    t.roomId === slot.roomId &&
                    t.day === slot.day &&
                    t.period === slot.period
                );
                if (occupants.length >= room.capacity) {
                    conflicts.push(...occupants);
                    reason = reason ? `${reason}, 특별실 초과` : `특별실(${room.name}) 정원 초과`;
                }
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflictingSlots: conflicts,
            reason
        };
    };

    const getRequiredHours = (subject: string) => {
        return subjectHours[subject] || 2; 
    };

    const getUnassignedSpecialistBlocks = (teacherId: string): ClassBlock[] => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return [];

        const blocks: ClassBlock[] = [];
        
        teacher.assignments.forEach((assign) => {
            const allTargetsToProcess = (assign.targets && assign.targets.length > 0) 
                ? assign.targets 
                : (teacherConfig.grades || []);

            let expandedClasses: string[] = [];

            allTargetsToProcess.forEach(target => {
                if (teacherConfig.grades.includes(target) && !target.includes('-') && !target.includes('레벨')) {
                    const grade = parseInt(target);
                    if (!isNaN(grade)) {
                        const count = (schoolInfo.classesPerGrade[grade] || 0) + (teacherConfig.extraClassCounts[grade] || 0);
                        for (let c = 1; c <= count; c++) expandedClasses.push(`${grade}-${c}`);
                    } else if (target.startsWith('custom-')) {
                         const count = teacherConfig.extraClassCounts[target] || 0;
                         for (let c = 1; c <= count; c++) expandedClasses.push(`${target}-${c}`);
                    }
                } else {
                    expandedClasses.push(target);
                }
            });

            expandedClasses = [...new Set(expandedClasses)];

            expandedClasses.forEach(cls => {
                const assignedCount = timetable.filter(t => 
                    t.teacherId === teacherId && 
                    t.subject === assign.subject && 
                    t.classId === cls
                ).length;

                const needed = (assign.hours || 0) - assignedCount;
                if (needed > 0) {
                    for(let i=0; i<needed; i++) {
                         blocks.push({
                             id: `${teacherId}-${cls}-${assign.subject}-${i}`,
                             grade: extractGrade(cls),
                             classNum: parseInt(cls.split('-')[1]) || 0,
                             classId: cls,
                             subject: assign.subject,
                             requiredSessions: assign.hours || 0,
                             assignedSessions: assignedCount,
                             roomId: assign.roomId
                         });
                    }
                }
            });
        });

        return blocks;
    };

    const getClassList = () => {
        const classes: string[] = [];
        Object.entries(schoolInfo.classesPerGrade).forEach(([gradeStr, count]) => {
            const grade = parseInt(gradeStr);
            const classCount = count as number; 
            for (let c = 1; c <= classCount; c++) {
                classes.push(`${grade}-${c}`);
            }
        });
        return classes;
    };

    const verifyPassword = async (password: string): Promise<boolean> => {
        if (!projectPassword) return true;
        const hash = await hashPassword(password);
        if (hash === projectPassword) {
            setIsAdmin(true);
            return true;
        }
        return false;
    };

    const importData = (json: any) => {
        if (json.schoolInfo) {
            setSchoolInfo({
                ...json.schoolInfo,
                bellSchedules: json.schoolInfo.bellSchedules || INITIAL_BELL_SCHEDULES,
                hasDistinctSchedules: json.schoolInfo.hasDistinctSchedules ?? false
            });
        }
        if (json.teachers) setTeachers(json.teachers);
        if (json.rooms) setRooms(json.rooms);
        if (json.subjects) setSubjects(json.subjects);
        if (json.timetable) setTimetable(json.timetable);
        if (json.subjectStyles) setSubjectStyles(json.subjectStyles);
        if (json.subjectHours) setSubjectHours(json.subjectHours);
        
        if (json.teacherConfig) {
            setTeacherConfig({
                ...json.teacherConfig,
                levelClassCounts: json.teacherConfig.levelClassCounts || {}
            });
        }
        
        if (json.subjectConfigs) setSubjectConfigs(json.subjectConfigs);
        
        if (json.projectPassword) {
            setProjectPassword(json.projectPassword);
            setIsAdmin(false); 
        } else {
            setProjectPassword(null);
            setIsAdmin(true); 
        }
        
        let conflicts = 0;
        json.timetable?.forEach((t: TimeSlot) => {
            const check = checkConflict(t, json.timetable);
            if (check.hasConflict) conflicts++;
        });

        return { total: json.timetable?.length || 0, conflicts };
    };

    const addSubjectGradeOverlap = (subject: string, grade: number) => {
        setSubjectConfigs(prev => {
            const current = prev[subject] || { allowOverlap: false };
            const currentGrades = current.allowOverlapByGrade || [];
            if (!currentGrades.includes(grade)) {
                return {
                    ...prev,
                    [subject]: {
                        ...current,
                        allowOverlapByGrade: [...currentGrades, grade]
                    }
                };
            }
            return prev;
        });
    };

    const clearTeacherSchedule = (teacherId: string) => {
        setTimetable(prev => prev.filter(t => t.teacherId !== teacherId));
    };

    return React.createElement(ScheduleContext.Provider, {
        value: {
            schoolInfo, setSchoolInfo,
            teachers, setTeachers, addTeacher, updateTeacher, removeTeacher,
            rooms, addRoom, removeRoom, updateRoom, reorderRooms,
            subjects, setSubjects,
            timetable, addTimeSlot, removeTimeSlot, updateTimeSlot,
            subjectStyles, subjectConfigs, subjectHours,
            teacherConfig, setTeacherConfig,
            updateSubjectDetails, getSubjectColor, checkConflict,
            getRequiredHours, getUnassignedSpecialistBlocks, getClassList,
            importData, isAdmin, projectPassword, verifyPassword,
            transferredTimetableCode, setTransferredTimetableCode,
            addSubjectGradeOverlap, clearTeacherSchedule
        }
    }, children);
};

export const useSchedule = () => {
    const context = useContext(ScheduleContext);
    if (!context) {
        throw new Error('useSchedule must be used within a ScheduleProvider');
    }
    return context;
};
