
// Domain Types

export type DayOfWeek = '월' | '화' | '수' | '목' | '금';
// Extended to 15 to support flexible schedules (e.g. including breaks/lunch as blocks)
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface SchoolInfo {
  name: string;
  classesPerGrade: Record<number, number>; // e.g., { 1: 4, 6: 5 } -> Grade 1 has 4 classes
  maxPeriods: Record<number, number>; // e.g., { 1: 5, 6: 6 } -> Grade 1 ends at 5th period
  bellSchedules: BellSchedule[]; // New: Multiple bell schedules
  hasDistinctSchedules: boolean; // New: Toggle for single vs multiple schedules
}

export interface BellSchedule {
  id: string;
  name: string; // e.g., "저학년(1~2)", "고학년(3~6)"
  targetGrades: number[]; // [1, 2]
  periods: Record<number, { 
    start: string; 
    end: string; 
    name?: string;
    type?: 'CLASS' | 'ETC'; // Distinguish between regular class and break/lunch
  }>; 
}

export interface Room {
  id: string;
  name: string;
  capacity: number; // How many classes can be here simultaneously
}

export interface TeacherAssignment {
  subject: string;
  roomId?: string; // Optional fixed room for this subject
  targets?: string[]; // ["3", "4", "5-1"] -> Grade 3, Grade 4, Class 5-1 only. Empty = All.
  hours?: number; // NEW: Specific hours for this assignment (overrides global subject hours)
}

export interface Teacher {
  id: string;
  name: string;
  color: string; // Visual color for the block
  assignments: TeacherAssignment[]; // Multiple subjects/rooms
  maxHours?: number; // Weekly teaching hours goal
  memo?: string; // NEW: Personal memo for the teacher
}

// NEW: Stores layout configuration for TeacherManagement page
export interface TeacherLayoutConfig {
  grades: string[]; // List of row IDs (e.g. ['1','2','custom-123'])
  extraClassCounts: Record<string, number>; // Added classes per row
  customLabels: Record<string, string>; // Custom names for rows/classes
  hiddenLevel: string[]; // IDs of level classes that are hidden (Renamed from hiddenIntegrated)
  levelClassCounts?: Record<string, number>; // NEW: Count of level classes per row (Renamed from integratedClassCounts)
}

// NEW: Subject Configuration (e.g., Allow Overlap)
export interface SubjectConfig {
  allowOverlap: boolean; // Global overlap permission
  syncGradeClasses?: boolean; // If true, assigning to one class assigns to ALL classes in that grade
  allowOverlapByGrade?: number[]; // NEW: Specific grades where overlap is allowed (e.g. [3, 6] allows overlap for 3rd and 6th grade)
}

// NEW: Rich Text Structure for custom block editing
export interface RichTextStyle {
  color?: string; // Tailwind text color class or hex
  fontSize?: string; // NEW: Tailwind font size class (e.g. text-sm, text-xl)
  isBold?: boolean;
  isUnderline?: boolean;
  isItalic?: boolean;
}

export interface RichTextLine {
  id: string;
  text: string;
  style: RichTextStyle;
}

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  period: Period;
  classId: string; // e.g., "5-1"
  subject: string;
  teacherId?: string; // Optional for homeroom subjects
  roomId?: string; // Optional if in standard classroom
  customText?: string; // Legacy custom text
  customStyle?: SubjectStyle; // NEW: Custom individual style
  richText?: RichTextLine[]; // NEW: Multi-line rich text content
}

export interface ClassBlock {
  id: string;
  grade: number;
  classNum: number;
  classId: string; // Added to fix type error in MasterSchedule
  subject: string;
  teacherId?: string; // Add teacherId to block for reference
  requiredSessions: number; // e.g., 2 times a week
  assignedSessions: number;
  roomId?: string; // Optional room requirement for this block
}

// Validation Result
export interface Conflict {
  hasConflict: boolean;
  type?: 'critical' | 'allowed'; // NEW: Distinguish between critical errors and allowed overlaps
  reason?: string;
  conflictingSlots?: TimeSlot[]; 
  ignoreKey?: string; 
}

// Styling Types
export interface SubjectStyle {
  bgColor: string;     // e.g. "bg-purple-100"
  textColor: string;   // e.g. "text-purple-800"
  borderColor: string; // e.g. "border-purple-300"
  borderWidth: string; // e.g. "border-2"
  borderStyle: string; // e.g. "border-solid", "border-dashed"
  fontWeight: string;  // e.g. "font-bold"
}

export interface PaletteColor {
    id: string;
    name?: string; // e.g. "Pastel Red"
    category: string; // e.g. "Pastel", "Vivid"
    class: string; // Taildwind classes
}
