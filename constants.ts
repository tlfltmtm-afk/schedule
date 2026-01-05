
import { DayOfWeek, PaletteColor, BellSchedule } from './types';

export const DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금'];
// Expanded to 15 to match types.ts
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

export const SUBJECT_COLORS: Record<string, string> = {
  '영어': 'bg-purple-100 text-purple-800 border-purple-300 border',
  '체육': 'bg-green-100 text-green-800 border-green-300 border',
  '과학': 'bg-blue-100 text-blue-800 border-blue-300 border',
  '음악': 'bg-pink-100 text-pink-800 border-pink-300 border',
  '미술': 'bg-orange-100 text-orange-800 border-orange-300 border',
  '국어': 'bg-slate-100 text-slate-800 border-slate-300 border',
  '수학': 'bg-slate-100 text-slate-800 border-slate-300 border',
  '사회': 'bg-slate-100 text-slate-800 border-slate-300 border',
  '도덕': 'bg-slate-100 text-slate-800 border-slate-300 border',
  '실과': 'bg-slate-100 text-slate-800 border-slate-300 border',
  '창체': 'bg-yellow-100 text-yellow-800 border-yellow-300 border',
  'Default': 'bg-gray-100 text-gray-800 border-gray-300 border'
};

// --- Detailed Design Options for Settings Modal ---

export const BG_OPTIONS = [
    { class: 'bg-white', label: '흰색' },
    { class: 'bg-slate-50', label: '연회색' },
    { class: 'bg-slate-100', label: '회색' },
    { class: 'bg-slate-200', label: '진회색' },
    { class: 'bg-red-50', label: '연빨강' },
    { class: 'bg-red-100', label: '빨강' },
    { class: 'bg-red-200', label: '진빨강' },
    { class: 'bg-orange-50', label: '연주황' },
    { class: 'bg-orange-100', label: '주황' },
    { class: 'bg-amber-50', label: '연노랑' },
    { class: 'bg-amber-100', label: '노랑' },
    { class: 'bg-yellow-200', label: '진노랑' },
    { class: 'bg-lime-50', label: '연라임' },
    { class: 'bg-lime-100', label: '라임' },
    { class: 'bg-green-50', label: '연초록' },
    { class: 'bg-green-100', label: '초록' },
    { class: 'bg-emerald-100', label: '에메랄드' },
    { class: 'bg-teal-50', label: '연청록' },
    { class: 'bg-teal-100', label: '청록' },
    { class: 'bg-cyan-50', label: '연하늘' },
    { class: 'bg-sky-100', label: '하늘' },
    { class: 'bg-blue-50', label: '연파랑' },
    { class: 'bg-blue-100', label: '파랑' },
    { class: 'bg-indigo-50', label: '연남색' },
    { class: 'bg-indigo-100', label: '남색' },
    { class: 'bg-violet-50', label: '연보라' },
    { class: 'bg-violet-100', label: '보라' },
    { class: 'bg-purple-100', label: '자주' },
    { class: 'bg-fuchsia-100', label: '핑크' },
    { class: 'bg-pink-50', label: '연분홍' },
    { class: 'bg-rose-100', label: '로즈' },
    // Dark/Vivid Backgrounds
    { class: 'bg-slate-800', label: '다크' },
    { class: 'bg-red-500', label: '강렬빨강' },
    { class: 'bg-blue-500', label: '강렬파랑' },
    { class: 'bg-green-500', label: '강렬초록' },
    { class: 'bg-yellow-400', label: '강렬노랑' },
    { class: 'bg-purple-500', label: '강렬보라' },
];

export const TEXT_OPTIONS = [
    { class: 'text-slate-900', label: '검정' },
    { class: 'text-slate-600', label: '회색' },
    { class: 'text-slate-400', label: '연회색' },
    { class: 'text-white', label: '흰색' },
    { class: 'text-red-600', label: '빨강' },
    { class: 'text-red-400', label: '연빨강' },
    { class: 'text-orange-600', label: '주황' },
    { class: 'text-amber-600', label: '노랑' },
    { class: 'text-green-600', label: '초록' },
    { class: 'text-emerald-600', label: '진초록' },
    { class: 'text-blue-600', label: '파랑' },
    { class: 'text-blue-400', label: '연파랑' },
    { class: 'text-indigo-600', label: '남색' },
    { class: 'text-purple-600', label: '보라' },
    { class: 'text-pink-600', label: '분홍' },
];

export const BORDER_COLOR_OPTIONS = [
    { class: 'border-slate-200', label: '기본(연함)' },
    { class: 'border-slate-300', label: '기본(중간)' },
    { class: 'border-slate-400', label: '기본(진함)' },
    { class: 'border-slate-800', label: '검정' },
    { class: 'border-transparent', label: '투명' },
    { class: 'border-red-300', label: '빨강' },
    { class: 'border-red-500', label: '진한빨강' },
    { class: 'border-orange-300', label: '주황' },
    { class: 'border-amber-300', label: '노랑' },
    { class: 'border-green-300', label: '초록' },
    { class: 'border-green-500', label: '진한초록' },
    { class: 'border-blue-300', label: '파랑' },
    { class: 'border-blue-500', label: '진한파랑' },
    { class: 'border-indigo-300', label: '남색' },
    { class: 'border-purple-300', label: '보라' },
    { class: 'border-purple-500', label: '진한보라' },
    { class: 'border-pink-300', label: '분홍' },
];

export const BORDER_STYLE_OPTIONS = [
    { class: 'border-solid', label: '실선' },
    { class: 'border-dashed', label: '대시' },
    { class: 'border-dotted', label: '점선' },
    { class: 'border-double', label: '이중선' },
    { class: 'border-none', label: '없음' },
];

export const BORDER_WIDTH_OPTIONS = [
    { class: 'border', label: '얇게 (1px)' },
    { class: 'border-2', label: '보통 (2px)' },
    { class: 'border-4', label: '두껍게 (4px)' },
    { class: 'border-8', label: '매우두껍게' },
];

// Expanded Palette with Categories and Distinct Styles (Legacy Support + Presets)
export const COLOR_PALETTE: PaletteColor[] = [
  // --- Category: Basic (Standard) ---
  { id: 'basic-white', category: '기본 (Standard)', class: 'bg-white text-gray-900 border-gray-400 border' },

  // --- Category: Pastel (Standard) ---
  { id: 'pastel-red', category: '파스텔 (기본)', class: 'bg-red-100 text-red-900 border-red-300 border-2' },
  { id: 'pastel-orange', category: '파스텔 (기본)', class: 'bg-orange-100 text-orange-900 border-orange-300 border-2' },
  { id: 'pastel-amber', category: '파스텔 (기본)', class: 'bg-amber-100 text-amber-900 border-amber-300 border-2' },
  { id: 'pastel-green', category: '파스텔 (기본)', class: 'bg-green-100 text-green-900 border-green-300 border-2' },
  { id: 'pastel-teal', category: '파스텔 (기본)', class: 'bg-teal-100 text-teal-900 border-teal-300 border-2' },
  { id: 'pastel-blue', category: '파스텔 (기본)', class: 'bg-blue-100 text-blue-900 border-blue-300 border-2' },
  { id: 'pastel-indigo', category: '파스텔 (기본)', class: 'bg-indigo-100 text-indigo-900 border-indigo-300 border-2' },
  { id: 'pastel-purple', category: '파스텔 (기본)', class: 'bg-purple-100 text-purple-900 border-purple-300 border-2' },
  { id: 'pastel-pink', category: '파스텔 (기본)', class: 'bg-pink-100 text-pink-900 border-pink-300 border-2' },
  { id: 'pastel-slate', category: '파스텔 (기본)', class: 'bg-slate-100 text-slate-900 border-slate-300 border-2' },

  // --- Category: Vivid (Strong Fill) ---
  { id: 'vivid-red', category: '비비드 (강조)', class: 'bg-red-500 text-white border-red-700 border-2 font-bold' },
  { id: 'vivid-orange', category: '비비드 (강조)', class: 'bg-orange-500 text-white border-orange-700 border-2 font-bold' },
  { id: 'vivid-green', category: '비비드 (강조)', class: 'bg-emerald-500 text-white border-emerald-700 border-2 font-bold' },
  { id: 'vivid-blue', category: '비비드 (강조)', class: 'bg-blue-500 text-white border-blue-700 border-2 font-bold' },
  { id: 'vivid-indigo', category: '비비드 (강조)', class: 'bg-indigo-500 text-white border-indigo-700 border-2 font-bold' },
  { id: 'vivid-purple', category: '비비드 (강조)', class: 'bg-purple-500 text-white border-purple-700 border-2 font-bold' },
  
  // --- Category: Outline (White BG, Thick Border) ---
  { id: 'outline-red', category: '아웃라인 (테두리)', class: 'bg-white text-red-700 border-red-500 border-4 font-bold' },
  { id: 'outline-orange', category: '아웃라인 (테두리)', class: 'bg-white text-orange-700 border-orange-500 border-4 font-bold' },
  { id: 'outline-green', category: '아웃라인 (테두리)', class: 'bg-white text-green-700 border-green-500 border-4 font-bold' },
  { id: 'outline-blue', category: '아웃라인 (테두리)', class: 'bg-white text-blue-700 border-blue-500 border-4 font-bold' },
  { id: 'outline-purple', category: '아웃라인 (테두리)', class: 'bg-white text-purple-700 border-purple-500 border-4 font-bold' },
  { id: 'outline-dark', category: '아웃라인 (테두리)', class: 'bg-white text-slate-800 border-slate-700 border-4 font-bold' },

  // --- Category: Light/Soft (Subtle) ---
  { id: 'soft-rose', category: '소프트 (연함)', class: 'bg-rose-50 text-rose-600 border-rose-200 border' },
  { id: 'soft-yellow', category: '소프트 (연함)', class: 'bg-yellow-50 text-yellow-700 border-yellow-200 border' },
  { id: 'soft-lime', category: '소프트 (연함)', class: 'bg-lime-50 text-lime-700 border-lime-200 border' },
  { id: 'soft-sky', category: '소프트 (연함)', class: 'bg-sky-50 text-sky-700 border-sky-200 border' },
  { id: 'soft-violet', category: '소프트 (연함)', class: 'bg-violet-50 text-violet-700 border-violet-200 border' },
  { id: 'soft-gray', category: '소프트 (연함)', class: 'bg-gray-50 text-gray-500 border-gray-200 border' },
];

export const INITIAL_ROOMS = [
  { id: 'gym', name: '강당', capacity: 2 },
  { id: 'sci1', name: '과학실1', capacity: 1 },
  { id: 'sci2', name: '과학실2', capacity: 1 },
  { id: 'eng1', name: '영어1실', capacity: 1 },
  { id: 'eng2', name: '영어2실', capacity: 1 },
  { id: 'com', name: '컴퓨터실', capacity: 1 },
  { id: 'playground', name: '운동장', capacity: 3 },
];

export const INITIAL_TEACHERS = [
  { 
    id: 't1', 
    name: '영어A', 
    color: 'pastel-purple', 
    assignments: [{ subject: '영어', roomId: 'eng1' }] 
  },
  { 
    id: 't2', 
    name: '체육A', 
    color: 'pastel-green', 
    assignments: [{ subject: '체육', roomId: 'gym' }] 
  },
  { 
    id: 't3', 
    name: '과학A', 
    color: 'pastel-blue', 
    assignments: [{ subject: '과학', roomId: 'sci1' }] 
  },
];

export const INITIAL_SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '체육', '음악', '미술', '도덕', '실과', '창체'];

// Default Bell Schedules
export const INITIAL_BELL_SCHEDULES: BellSchedule[] = [
  {
    id: 'schedule-a',
    name: '기본 시정표',
    targetGrades: [1, 2, 3, 4, 5, 6],
    periods: {
      1: { start: '09:00', end: '09:40', type: 'CLASS', name: '1교시' },
      2: { start: '09:50', end: '10:30', type: 'CLASS', name: '2교시' },
      3: { start: '10:40', end: '11:20', type: 'CLASS', name: '3교시' },
      4: { start: '11:30', end: '12:10', type: 'CLASS', name: '4교시' },
      5: { start: '13:00', end: '13:40', type: 'CLASS', name: '5교시' },
      6: { start: '13:50', end: '14:30', type: 'CLASS', name: '6교시' }
    }
  },
  {
    id: 'schedule-b',
    name: '시정표 B',
    targetGrades: [3, 4, 5, 6],
    periods: {
      1: { start: '09:00', end: '09:40', type: 'CLASS', name: '1교시' },
      2: { start: '09:50', end: '10:30', type: 'CLASS', name: '2교시' },
      3: { start: '10:40', end: '11:20', type: 'CLASS', name: '3교시' },
      4: { start: '11:30', end: '12:10', type: 'CLASS', name: '4교시' },
      5: { start: '13:10', end: '13:50', type: 'CLASS', name: '5교시' }, 
      6: { start: '14:00', end: '14:40', type: 'CLASS', name: '6교시' }
    }
  }
];
