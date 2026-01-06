
import React, { useState, useRef, useEffect } from 'react';
import { ScheduleProvider, useSchedule, hashPassword } from './services/scheduleService';
import { Settings } from './components/Settings';
import { MasterSchedule } from './components/MasterSchedule';
import { ClassSchedule } from './components/ClassSchedule';
import { VenueStatus } from './components/VenueStatus';
import { TeacherManagement } from './components/TeacherManagement';
import { ClassScheduleDecorator } from './components/ClassScheduleDecorator';
import { RoomTimetable } from './components/RoomTimetable';
import { TeacherTimetable } from './components/TeacherTimetable';
import { RoomAssignment } from './components/RoomAssignment';
import { Calendar, Settings as SettingsIcon, LayoutGrid, Map, Download, Menu, FolderOpen, Save, Users, Wand2, Unlock, KeyRound, FileText, Lock, FileSpreadsheet, CalendarRange, MapPin } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'teachers' | 'master' | 'room_assignment' | 'teacher_timetable' | 'class' | 'venue' | 'room_timetable' | 'decorator'>('settings');
  const [showExport, setShowExport] = useState(false);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState(false);

  // Export State
  const [exportPassword, setExportPassword] = useState('');
  const [exportFileName, setExportFileName] = useState('');

  const { timetable, schoolInfo, teachers, rooms, subjects, importData, subjectStyles, subjectHours, teacherConfig, subjectConfigs, isAdmin, verifyPassword, projectPassword } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If loading a file with password, default to 'class' tab view
  useEffect(() => {
     if (projectPassword && !isAdmin) {
         setActiveTab('class');
     }
  }, [projectPassword, isAdmin]);

  // Reset filename when export modal opens
  useEffect(() => {
      if (showExport) {
          setExportFileName(`smart_schedule_project_${new Date().toISOString().slice(0, 10)}`);
      }
  }, [showExport]);

  const handleNavClick = (tabId: string, isRestricted: boolean) => {
      // Only trigger auth modal if:
      // 1. The tab is restricted
      // 2. A project password exists (loaded from file)
      // 3. The user has not unlocked admin rights yet
      if (isRestricted && projectPassword && !isAdmin) {
          setPendingTab(tabId);
          setPendingExport(false);
          setAuthPassword('');
          setAuthError(false);
          setShowAuthModal(true);
      } else {
          setActiveTab(tabId as any);
      }
  };

  const handleExportClick = () => {
      if (projectPassword && !isAdmin) {
          setPendingExport(true);
          setPendingTab(null);
          setAuthPassword('');
          setAuthError(false);
          setShowAuthModal(true);
      } else {
          setShowExport(true);
      }
  };

  const handleUnlockAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      const isValid = await verifyPassword(authPassword);
      if (isValid) {
          setShowAuthModal(false);
          if (pendingTab) {
              setActiveTab(pendingTab as any);
              setPendingTab(null);
          }
          if (pendingExport) {
              setShowExport(true);
              setPendingExport(false);
          }
      } else {
          setAuthError(true);
      }
  };

  const handleSaveProject = async () => {
    // Validate Password if entered
    if (exportPassword && !/^\d{4}$/.test(exportPassword)) {
        alert("비밀번호는 4자리 숫자로 설정해주세요.");
        return;
    }

    let savedPassword = null;
    if (exportPassword) {
        savedPassword = await hashPassword(exportPassword);
    }

    const data = {
      schoolInfo,
      teachers,
      rooms,
      subjects,
      timetable,
      subjectStyles,
      subjectHours,
      teacherConfig,
      subjectConfigs,
      projectPassword: savedPassword, // Include HASHED password
      version: '1.4'
    };
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = (exportFileName || `smart_schedule_project_${new Date().toISOString().slice(0, 10)}`) + ".json";

    // Try File System Access API for "Save As" behavior
    try {
        // @ts-ignore
        if (window.showSaveFilePicker) {
             // @ts-ignore
             const handle = await window.showSaveFilePicker({
                 suggestedName: fileName,
                 types: [{
                     description: 'School Schedule Project',
                     accept: { 'application/json': ['.json'] },
                 }],
             });
             const writable = await handle.createWritable();
             await writable.write(jsonString);
             await writable.close();
             setShowExport(false);
             setExportPassword('');
             alert("저장이 완료되었습니다.");
             return;
        }
    } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('File System Access API fallback', err);
    }

    // Fallback download
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExport(false);
    setExportPassword('');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const report = importData(json);
        
        // Switch to Class View by default upon load
        setActiveTab('class');
        
        if (report.conflicts > 0) {
            alert(`✅ 프로젝트를 불러왔습니다.\n\n📊 요약:\n- 총 수업 개수: ${report.total}개\n- ⚠️ 충돌 감지: ${report.conflicts}개\n\n충돌이 발생한 시간표는 빨간색 테두리로 표시됩니다.`);
        } else {
            alert(`✅ 프로젝트를 성공적으로 불러왔습니다.\n\n- 총 수업 개수: ${report.total}개\n- 감지된 충돌 없음`);
        }
      } catch (err) {
        alert("파일 형식이 올바르지 않거나 손상된 파일입니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const navItems = [
    { id: 'settings', label: '설정', icon: <SettingsIcon size={18} />, restricted: true },
    { id: 'teachers', label: '전담교사 배정', icon: <Users size={18} />, restricted: true },
    { id: 'master', label: '전담 시간표 작성', icon: <LayoutGrid size={18} />, restricted: true },
    { id: 'room_assignment', label: '특별실 시간표 작성', icon: <MapPin size={18} />, restricted: true }, // New Menu
    { id: 'teacher_timetable', label: '전담 시간표 조회', icon: <FileSpreadsheet size={18} />, restricted: false },
    { id: 'class', label: '학급 시간표 조회', icon: <Calendar size={18} />, restricted: false },
    { id: 'venue', label: '특별실 현황', icon: <Map size={18} />, restricted: false },
    { id: 'room_timetable', label: '특별실 시간표 조회', icon: <CalendarRange size={18} />, restricted: false },
    { id: 'decorator', label: '시간표 꾸미기', icon: <Wand2 size={18} />, restricted: false },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full border-2 border-yellow-400 flex items-center justify-center text-3xl shadow-sm leading-none pb-1">
              🍊
            </div>
            <div className="flex flex-col">
              <span className="text-yellow-400 text-xs font-bold leading-tight">왕관유자쌤의</span>
              <span className="text-white font-bold text-lg leading-tight tracking-tight">학교시간표</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.restricted)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
              </div>
              {/* Only show lock icon if file has password AND user is not admin */}
              {item.restricted && projectPassword && !isAdmin && (
                  <Lock size={14} className="text-slate-500 group-hover:text-slate-400" />
              )}
            </button>
          ))}

          <div className="pt-6 pb-2">
            <div className="h-px bg-slate-800 mb-4 mx-2"></div>
            <div className="text-xs font-bold text-slate-500 px-4 mb-3 uppercase tracking-wider">백업 / 복원</div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
            <button 
              onClick={handleImportClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
            >
              <FolderOpen size={18} />
              <span className="font-medium">불러오기</span>
            </button>
            <button 
              onClick={handleExportClick}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400 group"
            >
              <div className="flex items-center gap-3">
                  <Save size={18} />
                  <span className="font-medium">저장 / 내보내기</span>
              </div>
              {/* Only show lock icon if file has password AND user is not admin */}
              {projectPassword && !isAdmin && (
                  <Lock size={14} className="text-slate-500 group-hover:text-slate-400" />
              )}
            </button>
            
            {projectPassword && isAdmin && (
                <div className="mt-4 px-4 py-2 bg-indigo-900/50 rounded-lg flex items-center gap-2 text-indigo-300 text-xs font-bold border border-indigo-800 mx-2 animate-in fade-in">
                    <Unlock size={14} />
                    <span>관리자 권한 인증됨</span>
                </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="md:hidden fixed w-full bg-slate-900 text-white z-50 flex items-center justify-between px-4 py-3 shadow-md">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full border border-yellow-400 flex items-center justify-center text-xl shadow-sm leading-none pb-0.5">
              🍊
            </div>
            <div className="flex flex-col">
              <span className="text-yellow-400 text-[10px] font-bold leading-none">왕관유자쌤의</span>
              <span className="text-white font-bold text-sm leading-none mt-0.5">학교시간표</span>
            </div>
         </div>
         <button className="p-1"><Menu /></button>
      </div>

      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'teachers' && <TeacherManagement />}
        {activeTab === 'master' && <MasterSchedule />}
        {activeTab === 'room_assignment' && <RoomAssignment />}
        {activeTab === 'teacher_timetable' && <TeacherTimetable onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'class' && <ClassSchedule onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'venue' && <VenueStatus />}
        {activeTab === 'room_timetable' && <RoomTimetable />}
        {activeTab === 'decorator' && <ClassScheduleDecorator />}
      </main>

      {/* Auth Modal for Restricted Access */}
      {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <Lock size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">관리자 접근 권한 필요</h3>
                      <p className="text-sm text-slate-500 mt-2">
                          이 메뉴는 연구부장(관리자) 전용입니다.<br/>
                          파일에 설정된 4자리 비밀번호를 입력하세요.
                      </p>
                  </div>
                  <form onSubmit={handleUnlockAdmin} className="space-y-4">
                      <div>
                          <input 
                              type="password" 
                              maxLength={4}
                              value={authPassword}
                              onChange={(e) => { setAuthPassword(e.target.value); setAuthError(false); }}
                              className="w-full text-center text-2xl tracking-widest px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                              placeholder="••••"
                              autoFocus
                          />
                          {authError && <p className="text-red-500 text-xs text-center mt-2 font-bold animate-pulse">비밀번호가 일치하지 않습니다.</p>}
                      </div>
                      <div className="flex gap-2">
                          <button 
                              type="button" 
                              onClick={() => setShowAuthModal(false)}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                          >
                              취소
                          </button>
                          <button 
                              type="submit" 
                              className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md"
                          >
                              확인
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showExport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-fade-in">
            <h3 className="text-xl font-bold mb-4">저장 및 내보내기</h3>
            <p className="text-slate-500 mb-6 text-sm">작업 내용을 저장하거나 제출용 파일을 다운로드하세요.</p>
            
            <div className="space-y-3">
               {/* Filename Input */}
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                       <FileText size={12}/> 파일명 설정
                   </label>
                   <div className="flex items-center gap-2">
                       <input 
                           type="text" 
                           value={exportFileName}
                           onChange={(e) => setExportFileName(e.target.value)}
                           className="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                           placeholder="파일명 입력"
                       />
                   </div>
               </div>

               {/* Password Setting Field */}
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                   <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                       <KeyRound size={12}/> 공유용 비밀번호 설정 (선택)
                   </label>
                   <input 
                       type="text" 
                       maxLength={4}
                       placeholder="4자리 숫자 (예: 1234)"
                       value={exportPassword}
                       onChange={(e) => setExportPassword(e.target.value.replace(/[^0-9]/g, ''))}
                       className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono tracking-widest"
                   />
                   <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                       * 비밀번호를 설정하면, 파일을 불러올 때 <strong>조회 전용 모드</strong>로 열리며 관리자 메뉴 접근 시 비밀번호가 필요합니다.
                   </p>
               </div>

              <button 
                onClick={handleSaveProject}
                className="w-full p-4 border rounded-lg hover:bg-slate-50 flex items-center gap-3 transition-colors bg-indigo-50 border-indigo-200"
              >
                <div className="p-2 bg-indigo-200 text-indigo-700 rounded"><Save size={20}/></div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">프로젝트 저장 (.json)</div>
                  <div className="text-xs text-slate-500">작업 중인 상태를 파일로 저장합니다.</div>
                </div>
              </button>
            </div>

            <button 
              onClick={() => { setShowExport(false); setExportPassword(''); }}
              className="mt-6 w-full py-2 text-slate-500 hover:text-slate-800"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ScheduleProvider>
      <AppContent />
    </ScheduleProvider>
  );
};

export default App;
