
import React, { useState, useEffect } from 'react';
import { useSchedule } from '../services/scheduleService';
import { DAYS } from '../constants';
import { Sparkles, Copy, Layout, Palette, Image as ImageIcon, Wand2, Eye, ExternalLink, StickyNote, AlignLeft, AlignCenter, AlignRight, AlignJustify, MoveVertical, MoveHorizontal, ChevronDown, ChevronUp, Maximize2, MonitorPlay, X, Info, Check, MessageSquarePlus, Plus, Trash2, Edit3, Table, Code, CheckCircle2 } from 'lucide-react';

const PRESET_THEMES = [
  { id: 'space', label: '우주/행성', value: 'space theme, planets, stars, galaxy background, futuristic sci-fi atmosphere' },
  { id: 'forest', label: '숲속/자연', value: 'magical forest, nature, leaves, trees, sunlight filtering through leaves, studio ghibli background style' },
  { id: 'ocean', label: '바다/해저', value: 'underwater world, ocean, coral reef, cute fish, bubbles, blue tones, disney style' },
  { id: 'animal', label: '동물농장', value: 'cute fluffy animals, puppies, kittens, bears, pastel colors, soft textures' },
  { id: 'pixel', label: '픽셀 아트', value: 'pixel art style, 8-bit game, retro game ui, colorful blocks, minecraft style' },
  { id: 'school', label: '교실/학용품', value: 'classroom items, blackboard, chalk, books, pencils, stationery, isometric view' },
  { id: 'fantasy', label: '동화나라', value: 'fairytale castle, fantasy world, pastel clouds, dreamlike, cinderella castle' },
];

const PRESET_STYLES = [
  { id: 'watercolor', label: '수채화', value: 'watercolor painting style, soft edges, artistic, wet on wet' },
  { id: '3d', label: '3D 렌더링', value: '3d isometric render, blender, c4d, clay material, high quality, soft lighting' },
  { id: 'anime', label: '애니메이션', value: 'anime style, vibrant colors, detailed line art, cel shading' },
  { id: 'illustration', label: '일러스트', value: 'flat vector illustration, clean lines, minimalist design' },
  { id: 'popart', label: '팝아트', value: 'pop art style, comic book dots, bold outlines, vivid colors' },
];

const PRESET_COLORS = [
  { id: 'pastel', label: '파스텔톤', value: 'soft pastel color palette, pink and blue, marshmallow colors' },
  { id: 'vivid', label: '비비드/원색', value: 'vivid and saturated colors, bright primary colors' },
  { id: 'vintage', label: '빈티지', value: 'vintage retro color palette, sepia tones, warm colors, beige paper texture' },
  { id: 'neon', label: '네온', value: 'neon glowing colors, dark background with bright lights, cyberpunk colors' },
  { id: 'white', label: '화이트/심플', value: 'white background, clean, minimal, monochromatic' },
];

type MarginType = 'background' | 'memo' | 'text';
type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';

interface MarginSubSection {
    id: string;
    content: string;
    designType: MarginType;
    vAlign: VAlign;
    hAlign: HAlign;
}

interface ElementState {
  visible: boolean;
  position: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'center';
  designType?: MarginType;
  content?: string;
  size?: number; // percentage of total width or height (5-40)
  hAlign?: HAlign;
  vAlign?: VAlign;
  subSections?: MarginSubSection[]; 
}

export const ClassScheduleDecorator: React.FC = () => {
  const { transferredTimetableCode, setTransferredTimetableCode } = useSchedule();

  // 1. Text Data
  const [className, setClassName] = useState('6학년 1반');
  const [motto, setMotto] = useState('행복을 스스로 만드는 긍정의 왕관유자');
  const [timetableCode, setTimetableCode] = useState(''); 
  
  // Auto-populate data from context
  useEffect(() => {
      if (transferredTimetableCode) {
          setTimetableCode(transferredTimetableCode);
          try {
              const parsed = JSON.parse(transferredTimetableCode);
              if (parsed.title) {
                  const name = parsed.title.replace(' 시간표', '');
                  setClassName(name);
              }
          } catch(e) {}
      }
  }, [transferredTimetableCode]);

  // 2. Layout Elements State
  const [elements, setElements] = useState<Record<string, ElementState>>({
    title: { visible: true, position: 'top-left' },
    motto: { visible: true, position: 'top-right' },
    timetable: { visible: true, position: 'center' },
    topMargin: { visible: false, position: 'top-center', designType: 'background', content: '', size: 10, hAlign: 'center', vAlign: 'middle' },
    bottomMargin: { visible: false, position: 'center', designType: 'background', content: '', size: 10, hAlign: 'center', vAlign: 'middle' },
    leftMargin: { visible: false, position: 'center', designType: 'memo', content: '', size: 20, hAlign: 'center', vAlign: 'middle', subSections: [] },
    rightMargin: { visible: true, position: 'center', designType: 'memo', content: '알림장 공간', size: 25, hAlign: 'center', vAlign: 'middle', subSections: [] },
  });

  // 3. Visual Concepts
  const [themeInput, setThemeInput] = useState(PRESET_THEMES[1].value);
  const [styleInput, setStyleInput] = useState(PRESET_STYLES[1].value);
  const [colorInput, setColorInput] = useState(PRESET_COLORS[0].value);
  const [customRequirements, setCustomRequirements] = useState('');
  const [ratioInput, setRatioInput] = useState('4:3');

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false); 
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    generatePrompt();
  }, [className, motto, elements, themeInput, styleInput, colorInput, customRequirements, ratioInput, timetableCode]);

  const toggleElement = (key: string) => {
    setElements(prev => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible }
    }));
  };

  const updateElement = (key: string, updates: Partial<ElementState>) => {
    setElements(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  const addSubSection = (key: string) => {
      setElements(prev => {
          const current = prev[key];
          const initialItem: MarginSubSection = {
              id: `sub-${Date.now()}-1`,
              content: current.content || '',
              designType: current.designType || 'memo',
              vAlign: current.vAlign || 'middle',
              hAlign: current.hAlign || 'center'
          };
          const newItem: MarginSubSection = {
              id: `sub-${Date.now()}-2`,
              content: '',
              designType: 'memo',
              vAlign: 'middle',
              hAlign: 'center'
          };

          const newSubSections = (current.subSections && current.subSections.length > 0)
              ? [...current.subSections, newItem]
              : [initialItem, newItem];
          
          if (newSubSections.length > 3) return prev;

          return { ...prev, [key]: { ...current, subSections: newSubSections } };
      });
  };

  const removeSubSection = (key: string, index: number) => {
      setElements(prev => {
          const current = prev[key];
          if (!current.subSections) return prev;
          const newSubSections = current.subSections.filter((_, idx) => idx !== index);
          if (newSubSections.length === 0) {
              return { ...prev, [key]: { ...current, subSections: [] } };
          }
          return { ...prev, [key]: { ...current, subSections: newSubSections } };
      });
  };

  const updateSubSection = (key: string, index: number, updates: Partial<MarginSubSection>) => {
      setElements(prev => {
          const current = prev[key];
          if (!current.subSections) return prev;
          const newSubSections = current.subSections.map((item, idx) => 
              idx === index ? { ...item, ...updates } : item
          );
          return { ...prev, [key]: { ...current, subSections: newSubSections } };
      });
  };

  const generatePrompt = () => {
    let rowCount = 0;
    let scheduleDataStr = "No data provided.";
    
    if (timetableCode.trim()) {
        try {
            const parsed = JSON.parse(timetableCode);
            const grid = parsed.grid || parsed;
            rowCount = Object.keys(grid).length;
            scheduleDataStr = JSON.stringify(grid, null, 2);
        } catch (e) {
            scheduleDataStr = "Invalid JSON Code.";
        }
    }

    const promptParts = [];
    promptParts.push(`**Persona**: You are a professional "Precision Typography & Layout Designer" expert in data visualization. Your mission is to transform raw JSON data into a perfectly aligned, aesthetic school timetable image.`);
    
    promptParts.push(`\n### 0. DATA_RENDERING_RULES (STRICT ADHERENCE)`);
    promptParts.push(`- **Grid Lock**: Create a table with exactly 5 columns (labeled "월", "화", "수", "목", "금") and ${rowCount || 6} rows.`);
    promptParts.push(`- **Language Lock**: All subject names, headers, and time ranges must be rendered in KOREAN ("한글") exactly as provided. DO NOT TRANSLATE.`);
    promptParts.push(`- **Text Integrity**: Render every character accurately. Wrap visual text in double quotes to distinguish it from instructions.`);
    promptParts.push(`- **Row Mapping**: Each row's first column (Time Track) must display both the 'name' and the 'time' (e.g., "1교시" and "09:00~09:40").`);
    
    promptParts.push(`\n### RAW DATA (Render this accurately):`);
    promptParts.push(`\`\`\`json\n${scheduleDataStr}\n\`\`\``);

    promptParts.push(`\n### 1. Global Specifications`);
    promptParts.push(`- **Canvas Aspect Ratio**: ${ratioInput}`);
    promptParts.push(`- **Theme & Art Style**: ${themeInput}, ${styleInput}`);
    promptParts.push(`- **Color Palette**: ${colorInput}`);
    promptParts.push(`- **Subject Color Coding**: Automatically assign distinct, soft background colors to different subjects to enhance readability. Ensure the text color contrasts well with the background (e.g., dark text on light background).`);
    if (customRequirements) promptParts.push(`- **Important Special Requests**: ${customRequirements}`);

    promptParts.push(`\n### 2. Header Elements`);
    if (elements.title.visible) promptParts.push(`- [Main Header]: Render the text "${className}" at ${elements.title.position} using large, bold, high-contrast typography.`);
    if (elements.motto.visible) promptParts.push(`- [Sub Header/Motto]: Render the text "${motto}" at ${elements.motto.position} in an elegant medium-weight font.`);
    
    promptParts.push(`\n### 3. Spatial Layout & Margin Specifications`);
    promptParts.push(`- [Center Timetable]: A glass-morphism translucent panel containing the data grid. Keep the font size clean and readable.`);
    
    Object.entries(elements).forEach(([key, val]) => {
        const element = val as ElementState;
        if (!element.visible || ['title', 'motto', 'timetable'].includes(key)) return;
        
        const side = key.replace('Margin', '').toUpperCase();
        const dimLabel = (side === 'TOP' || side === 'BOTTOM') ? 'Height' : 'Width';
        promptParts.push(`- [${side} ZONE]:`);
        promptParts.push(`  * Dimensions: Occupy exactly ${element.size}% of total canvas ${dimLabel.toLowerCase()}.`);

        if (element.subSections && element.subSections.length > 0) {
            promptParts.push(`  * Divided vertically into ${element.subSections.length} sections:`);
            element.subSections.forEach((sub, idx) => {
                const designDesc = sub.designType === 'text' ? `Text: "${sub.content}"` : sub.designType === 'memo' ? 'Memo board texture' : 'Background art';
                promptParts.push(`    - Section ${idx + 1}: ${designDesc} [Align: ${sub.vAlign}-${sub.hAlign}]`);
            });
        } else {
            const designDesc = element.designType === 'text' ? `Text: "${element.content}"` : element.designType === 'memo' ? 'Memo board texture' : 'Thematic background art';
            promptParts.push(`  * Design: ${designDesc} [Align: ${element.vAlign}-${element.hAlign}].`);
        }
    });

    promptParts.push(`\n### 4. Constraints (DO NOT VIOLATE)`);
    promptParts.push(`- DO NOT overlap background art with the timetable text; readability is the top priority.`);
    promptParts.push(`- DO NOT translate any Korean text to English.`);
    promptParts.push(`- DO NOT create a 6th column or miss any day from Monday to Friday.`);
    promptParts.push(`- Ensure high contrast between the text and the cell background.`);

    promptParts.push(`\n### 5. Interaction & Feedback (Post-Generation)`);
    promptParts.push(`After generating the image, you MUST ask the user the following questions to guide refinement:`);
    promptParts.push(`1. "담임 교과(국어, 수학 등)는 기본 디자인(흰 배경+검정 글자)으로 바꿀까요? (기본값: 흰 배경)"`);
    promptParts.push(`2. "점심이나 쉬는 시간을 표 중간에 추가할까요?"`);
    promptParts.push(`3. "폰트, 색상, 배치 등 더 고치고 싶은 부분이 있나요?"`);

    setGeneratedPrompt(promptParts.join('\n'));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const getAlignmentClasses = (v?: VAlign, h?: HAlign) => {
    let classes = 'flex ';
    if (v === 'top') classes += 'items-start ';
    else if (v === 'middle') classes += 'items-center ';
    else if (v === 'bottom') classes += 'items-end ';
    
    if (h === 'left') classes += 'justify-start ';
    else if (h === 'center') classes += 'justify-center ';
    else if (h === 'right') classes += 'justify-end ';
    
    return classes;
  };

  const renderDataPreview = () => {
      try {
          const data = JSON.parse(timetableCode);
          const grid = data.grid || data;
          return (
              <table className="w-full text-xs border-collapse">
                  <thead>
                      <tr className="bg-slate-100">
                          <th className="border p-2">교시/시간</th>
                          {DAYS.map(d => <th key={d} className="border p-2">{d}</th>)}
                      </tr>
                  </thead>
                  <tbody>
                      {Object.entries(grid).map(([key, val]: [string, any]) => (
                          <tr key={key}>
                              <td className="border p-2 font-bold bg-slate-50">
                                  <div>{val.name}</div>
                                  <div className="text-[10px] text-blue-500 font-normal">{val.time}</div>
                              </td>
                              {DAYS.map(d => <td key={d} className="border p-2">{val.days[d]}</td>)}
                          </tr>
                      ))}
                  </tbody>
              </table>
          );
      } catch (e) {
          return <div className="text-red-500 text-sm p-4">데이터 형식이 올바르지 않거나 데이터가 없습니다.</div>;
      }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
      
      {/* Left Column: Settings */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            <header className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Wand2 className="text-indigo-600" size={28} />
                학급시간표 디자인 AI 프롬프트 생성기
                </h1>
                <p className="text-slate-500 text-sm">설정값을 조정하여 나만의 시간표 디자인을 설계하세요.</p>
            </header>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Layout size={20} className="text-indigo-600" />
                    구조 및 요소 배치 설정
                </h3>

                <div className="space-y-6">
                    {/* Timetable Data Input Section */}
                    <div className={`p-4 rounded-xl border transition-all ${timetableCode ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Code size={14} /> 시간표 데이터 상태
                            </label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowDataModal(true)}
                                    disabled={!timetableCode.trim()}
                                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                >
                                    <Table size={12} /> 데이터 확인
                                </button>
                                {timetableCode && (
                                    <button 
                                        onClick={() => { setTransferredTimetableCode(''); setTimetableCode(''); }}
                                        className="text-xs px-2 py-1 bg-white border border-red-200 text-red-500 rounded hover:bg-red-50 flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> 초기화
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <textarea 
                                value={timetableCode}
                                onChange={(e) => setTimetableCode(e.target.value)}
                                placeholder="시간표 조회 페이지에서 [시간표 꾸미기] 버튼을 누르면 여기가 자동으로 채워집니다."
                                className="w-full p-3 border border-slate-300 rounded-lg text-[10px] font-mono bg-white h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            {timetableCode && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded shadow-sm flex items-center gap-1 animate-in fade-in">
                                    <CheckCircle2 size={10} /> 연동 완료
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">학급 명칭</label>
                            <input value={className} onChange={(e) => setClassName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">학급 급훈/목표</label>
                            <input value={motto} onChange={(e) => setMotto(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        {['topMargin', 'rightMargin', 'leftMargin', 'bottomMargin'].map(key => {
                            const val = elements[key];
                            const label = key === 'topMargin' ? '상단' : key === 'rightMargin' ? '우측' : key === 'leftMargin' ? '좌측' : '하단';
                            const isVertical = key === 'topMargin' || key === 'bottomMargin';
                            const isSide = key === 'rightMargin' || key === 'leftMargin';
                            const hasSubSections = val.subSections && val.subSections.length > 0;

                            return (
                                <div key={key} className={`p-4 rounded-xl border-2 transition-all ${val.visible ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={val.visible} onChange={() => toggleElement(key)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" id={`chk-${key}`} />
                                            <label htmlFor={`chk-${key}`} className={`text-sm font-bold cursor-pointer ${val.visible ? 'text-indigo-900' : 'text-slate-400'}`}>{label} 여백</label>
                                        </div>
                                        {val.visible && !hasSubSections && (
                                            <div className="flex bg-white rounded-lg border p-0.5 shadow-inner">
                                                {(['background', 'memo', 'text'] as MarginType[]).map(t => (
                                                    <button key={t} onClick={() => updateElement(key, { designType: t })} className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all ${val.designType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t === 'background' ? '배경' : t === 'memo' ? '메모' : '텍스트'}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {val.visible && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center"><div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">{isVertical ? <MoveVertical size={12}/> : <MoveHorizontal size={12}/>} 크기 조절</div><span className="text-[10px] font-mono font-bold text-indigo-600">{val.size}%</span></div>
                                                <input type="range" min="5" max="40" step="1" value={val.size} onChange={(e) => updateElement(key, { size: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                            </div>
                                            {isSide ? (
                                                <div className="space-y-3">
                                                    {hasSubSections ? (
                                                        <div className="space-y-2">
                                                            {val.subSections!.map((sub, idx) => (
                                                                <div key={sub.id} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm relative group">
                                                                    <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-indigo-400">영역 {idx + 1}</span><div className="flex gap-1"><div className="flex bg-slate-100 rounded p-0.5">{(['background', 'memo', 'text'] as MarginType[]).map(t => (<button key={t} onClick={() => updateSubSection(key, idx, { designType: t })} className={`px-1.5 py-0.5 text-[9px] rounded ${sub.designType === t ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>{t === 'background' ? '배경' : t === 'memo' ? '메모' : '텍스트'}</button>))}</div><button onClick={() => removeSubSection(key, idx)} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={12}/></button></div></div>
                                                                    {(sub.designType === 'text' || sub.designType === 'memo') && (<div className="flex gap-2 items-center"><input value={sub.content} onChange={(e) => updateSubSection(key, idx, { content: e.target.value })} placeholder="내용..." className="flex-1 px-2 py-1 border rounded text-xs bg-slate-50" /><div className="grid grid-cols-3 gap-0.5 w-12 bg-slate-100 border rounded p-0.5">{(['top', 'middle', 'bottom'] as VAlign[]).map(v => (['left', 'center', 'right'] as HAlign[]).map(h => (<button key={`${v}-${h}`} onClick={() => updateSubSection(key, idx, { vAlign: v, hAlign: h })} className={`w-3 h-3 rounded-[1px] ${sub.vAlign === v && sub.hAlign === h ? 'bg-indigo-500' : 'bg-white hover:bg-slate-200'}`} />)))}</div></div>)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        (val.designType === 'text' || val.designType === 'memo') && (
                                                            <div className="flex gap-4 items-center"><input value={val.content} onChange={(e) => updateElement(key, { content: e.target.value })} placeholder="내용 입력..." className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white" /><div className="grid grid-cols-3 gap-0.5 w-16 bg-white border rounded p-0.5">{(['top', 'middle', 'bottom'] as VAlign[]).map(v => (['left', 'center', 'right'] as HAlign[]).map(h => (<button key={`${v}-${h}`} onClick={() => updateElement(key, { vAlign: v, hAlign: h })} className={`w-4 h-4 rounded-sm transition-all ${val.vAlign === v && val.hAlign === h ? 'bg-indigo-600' : 'bg-slate-100 hover:bg-slate-200'}`} />)))}</div></div>
                                                        )
                                                    )}
                                                    {(!val.subSections || val.subSections.length < 3) && (<button onClick={() => addSubSection(key)} className="w-full py-1.5 border border-dashed border-indigo-300 text-indigo-500 text-xs font-bold rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-1"><Plus size={12} /> {hasSubSections ? '영역 추가 (최대 3개)' : '영역 나누기'}</button>)}
                                                </div>
                                            ) : (
                                                (val.designType === 'text' || val.designType === 'memo') && (<div className="flex gap-4 items-center"><input value={val.content} onChange={(e) => updateElement(key, { content: e.target.value })} placeholder="내용 입력..." className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white" /><div className="grid grid-cols-3 gap-0.5 w-16 bg-white border rounded p-0.5">{(['top', 'middle', 'bottom'] as VAlign[]).map(v => (['left', 'center', 'right'] as HAlign[]).map(h => (<button key={`${v}-${h}`} onClick={() => updateElement(key, { vAlign: v, hAlign: h })} className={`w-4 h-4 rounded-sm transition-all ${val.vAlign === v && val.hAlign === h ? 'bg-indigo-600' : 'bg-slate-100 hover:bg-slate-200'}`} />)))}</div></div>)
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Palette size={20} className="text-orange-500" /> 디자인 컨셉 설정</h3>
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">테마 (Theme)</label>
                        <div className="flex flex-wrap gap-2 mb-2 items-center"><button onClick={() => setThemeInput('')} className="px-2 py-1 bg-white border border-slate-300 text-slate-500 text-[10px] font-bold rounded hover:bg-slate-50 flex items-center gap-1"><Edit3 size={10} /> 직접 입력</button><div className="w-px h-4 bg-slate-200 mx-1"></div>{PRESET_THEMES.map(t => <button key={t.id} onClick={() => setThemeInput(t.value)} className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100">{t.label}</button>)}</div>
                        <textarea value={themeInput} onChange={(e) => setThemeInput(e.target.value)} placeholder="원하는 테마를 자유롭게 서술하세요" className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 h-20 resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">화풍 (Art Style)</label>
                            <div className="flex flex-wrap gap-2 mb-2 items-center"><button onClick={() => setStyleInput('')} className="px-2 py-1 bg-white border border-slate-300 text-slate-500 text-[10px] font-bold rounded hover:bg-slate-50 flex items-center gap-1"><Edit3 size={10} /> 직접 입력</button><div className="w-px h-4 bg-slate-200 mx-1"></div>{PRESET_STYLES.map(s => <button key={s.id} onClick={() => setStyleInput(s.value)} className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded hover:bg-pink-50 hover:text-pink-600 border border-transparent hover:border-pink-100">{s.label}</button>)}</div>
                            <input value={styleInput} onChange={(e) => setStyleInput(e.target.value)} placeholder="원하는 화풍 입력..." className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">비율</label>
                            <div className="flex gap-1">{['4:3', '16:9', '1:1', '9:16'].map(r => (<button key={r} onClick={() => setRatioInput(r)} className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg transition-all ${ratioInput === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{r}</button>))}</div>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1"><MessageSquarePlus size={12} /> 디자인 추가 요청사항 (선택)</label>
                        <textarea value={customRequirements} onChange={(e) => setCustomRequirements(e.target.value)} placeholder="예: 칠판 한구석에 귀여운 곰돌이 인형을 그려줘, 글씨는 금색으로 해줘..." className="w-full p-3 border border-indigo-100 rounded-xl text-xs bg-indigo-50/30 h-20 resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
            </section>
      </div>

      {/* Right Column: Preview & Output */}
      <div className="w-[480px] xl:w-[550px] flex-shrink-0 border-l border-slate-200 bg-white/50 h-full overflow-y-auto p-6 space-y-6 scrollbar-thin">
            <section className="bg-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-purple-900/40 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4 relative z-10"><h2 className="text-white font-extrabold flex items-center gap-2 text-sm"><Eye size={16} className="text-indigo-400" /> 가상 시안 미리보기</h2><span className="text-indigo-200 text-[10px] font-bold bg-indigo-900/60 px-2 py-1 rounded border border-indigo-700/50">{ratioInput}</span></div>
                <div className="flex justify-center items-center bg-black/20 rounded-xl p-4 min-h-[250px]">
                    <div className={`bg-white/5 border border-white/20 rounded-xl relative overflow-hidden backdrop-blur-md flex flex-col shadow-lg transition-all duration-500`} style={{ aspectRatio: ratioInput.replace(':', '/'), width: '70%' }}>
                        {elements.topMargin.visible && (<div className={`w-full bg-white/10 border-b border-white/10 flex p-2 text-[8px] text-white/40 ${getAlignmentClasses(elements.topMargin.vAlign, elements.topMargin.hAlign)}`} style={{ height: `${elements.topMargin.size}%` }}>{elements.topMargin.designType === 'text' ? elements.topMargin.content : 'Top'}</div>)}
                        <div className="flex-1 flex overflow-hidden">
                            {elements.leftMargin.visible && (<div className={`h-full bg-white/5 border-r border-white/10 text-[8px] text-white/40 flex flex-col`} style={{ width: `${elements.leftMargin.size}%` }}>{(elements.leftMargin.subSections && elements.leftMargin.subSections.length > 0) ? (elements.leftMargin.subSections.map((sub, idx) => (<div key={sub.id} className={`flex-1 w-full flex border-b border-white/10 last:border-0 p-1 ${getAlignmentClasses(sub.vAlign, sub.hAlign)}`}>{sub.designType === 'text' ? sub.content : `L${idx+1}`}</div>))) : (<div className={`w-full h-full p-2 flex ${getAlignmentClasses(elements.leftMargin.vAlign, elements.leftMargin.hAlign)}`}>{elements.leftMargin.designType === 'text' ? elements.leftMargin.content : 'L'}</div>)}</div>)}
                            <div className="flex-1 p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-start">
                                    {elements.title.visible && <div className="px-2 py-1 bg-indigo-500 text-white rounded text-[8px] font-bold">{className}</div>}
                                    {elements.motto.visible && <div className="px-2 py-1 bg-emerald-500 text-white rounded text-[6px] font-bold truncate max-w-[80px]">{motto}</div>}
                                </div>
                                {elements.timetable.visible && (<div className="flex-1 bg-white/80 rounded-lg p-1 flex flex-col gap-1 border border-white/30"><div className="h-3 bg-slate-200 rounded-sm w-full"></div><div className="flex-1 bg-slate-100/50 rounded-sm"></div></div>)}
                            </div>
                            {elements.rightMargin.visible && (<div className={`h-full bg-white/10 border-l border-white/20 text-[8px] text-white/50 flex flex-col`} style={{ width: `${elements.rightMargin.size}%` }}>{(elements.rightMargin.subSections && elements.rightMargin.subSections.length > 0) ? (elements.rightMargin.subSections.map((sub, idx) => (<div key={sub.id} className={`flex-1 w-full flex border-b border-white/10 last:border-0 p-1 ${getAlignmentClasses(sub.vAlign, sub.hAlign)}`}>{sub.designType === 'text' ? sub.content : `R${idx+1}`}</div>))) : (<div className={`w-full h-full p-2 flex ${getAlignmentClasses(elements.rightMargin.vAlign, elements.rightMargin.hAlign)}`}>{elements.rightMargin.designType === 'text' ? elements.rightMargin.content : 'R'}</div>)}</div>)}
                        </div>
                        {elements.bottomMargin.visible && (<div className={`w-full bg-white/10 border-t border-white/10 p-2 text-[8px] text-white/40 ${getAlignmentClasses(elements.bottomMargin.vAlign, elements.bottomMargin.hAlign)}`} style={{ height: `${elements.bottomMargin.size}%` }}>{elements.bottomMargin.designType === 'text' ? elements.bottomMargin.content : 'Bottom'}</div>)}
                    </div>
                </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Sparkles size={20} /></div><div><h3 className="font-bold text-slate-800 text-sm">AI 프롬프트 생성 완료</h3><p className="text-xs text-slate-500">설정한 값을 바탕으로 최적의 프롬프트가 준비되었습니다.</p></div></div>
                <div className="flex flex-col gap-3">
                    <button onClick={copyToClipboard} className={`w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 ${copyFeedback ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>{copyFeedback ? <Check size={18} /> : <Copy size={18} />}{copyFeedback ? '복사 완료!' : '프롬프트 복사하기'}</button>
                    <div className="flex gap-2"><button onClick={() => setShowPromptModal(true)} className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Maximize2 size={14} /> 내용 확인</button><button onClick={() => window.open('https://gemini.google.com/', '_blank')} className="flex-1 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl font-bold text-xs hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center justify-center gap-2"><MonitorPlay size={14} /> Gemini 이동</button></div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Info size={12}/> 사용 방법</h4>
                    <ol className="space-y-2">
                        <li className="flex gap-2 text-xs text-slate-600"><span className="bg-slate-100 text-slate-500 font-bold w-4 h-4 flex items-center justify-center rounded-full text-[10px] flex-shrink-0">1</span><span>위의 <strong>'프롬프트 복사하기'</strong> 버튼을 클릭하세요.</span></li>
                        <li className="flex gap-2 text-xs text-slate-600"><span className="bg-slate-100 text-slate-500 font-bold w-4 h-4 flex items-center justify-center rounded-full text-[10px] flex-shrink-0">2</span><span><strong>Gemini</strong> (Google AI) 사이트로 이동합니다.</span></li>
                        <li className="flex gap-2 text-xs text-slate-600"><span className="bg-slate-100 text-slate-500 font-bold w-4 h-4 flex items-center justify-center rounded-full text-[10px] flex-shrink-0">3</span><span>방금 복사한 <strong>프롬프트</strong>를 붙여넣고 이미지를 생성하세요.</span></li>
                    </ol>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-bold leading-relaxed">⚠️ 중요: 연동된 시간표 데이터에는 각 교시의 <strong>시작/종료 시간</strong>이 포함되어 있어 AI가 더욱 정확한 시정표를 그릴 수 있습니다. 모델은 <strong>'Gemini 2.5 (Nano Banana)'</strong> 최신 버전을 권장합니다.</div>
                </div>
            </section>
      </div>

      {/* Modals */}
      {showPromptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-700">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="text-yellow-400" size={18} /> Generated Prompt</h3><button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50"><pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-indigo-100 select-all">{generatedPrompt}</pre></div>
                  <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl flex justify-end gap-3"><button onClick={() => setShowPromptModal(false)} className="px-4 py-2 text-slate-300 hover:text-white text-sm font-bold">닫기</button><button onClick={copyToClipboard} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"><Copy size={16} /> 복사하기</button></div>
              </div>
          </div>
      )}

      {showDataModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={18} className="text-indigo-600" /> 연동 데이터 확인</h3><button onClick={() => setShowDataModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50"><div className="bg-white border rounded-lg overflow-hidden">{renderDataPreview()}</div></div>
                  <div className="p-4 border-t flex justify-end"><button onClick={() => setShowDataModal(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">확인</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
