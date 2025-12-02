import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- CONFIG ---
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- COMPONENTS ---

// 1. Loading Screen (Updated: Smooth exit)
const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 120) { // ให้วิ่งเลย 100 ไปหน่อย
          clearInterval(timer);
          setIsFinished(true);
          setTimeout(onComplete, 500); // รอ animation จบ
          return 120;
        }
        return prev + 2;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${isFinished ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
      </div>
      
      {/* Sleigh Animation */}
      <div className="relative mb-8 w-full max-w-xs h-16">
        <div className="absolute top-0 transition-all duration-100 ease-linear"
          style={{ left: `${progress - 20}%` }}> 
           <div className="flex items-end gap-1 text-4xl whitespace-nowrap filter drop-shadow-lg">
             🦌🦌🛷🎅
           </div>
        </div>
      </div>
      
      <p className="text-white/80 mt-12 text-sm font-medium animate-pulse">กำลังเดินทางไปบ้านซานต้า...</p>
    </div>
  );
};

// 2. Santa Icon (Updated: Added "จับแล้ว!" text)
const SantaIcon = ({ name, hasDrawn, isMe }) => (
  <div className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isMe ? 'bg-red-50 ring-2 ring-red-200' : ''}`}>
    <div className={`text-3xl relative ${hasDrawn ? '' : 'grayscale opacity-50'}`}>
      🎅
      {hasDrawn && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
           <span className="text-[10px] text-green-500">✓</span>
        </div>
      )}
    </div>
    <span className={`text-xs font-medium truncate max-w-[64px] ${hasDrawn ? 'text-gray-700' : 'text-gray-400'}`}>
      {name}
    </span>
    {hasDrawn && (
      <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-bold">
        จับแล้ว!
      </span>
    )}
  </div>
);

// 3. Recovery Modal (Updated: Label names)
const RecoveryModal = ({ isOpen, onClose, onRecover }) => {
  const [creatorName, setCreatorName] = useState('');
  const [friendName, setFriendName] = useState('');
  const [groupNameSearch, setGroupNameSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!groupNameSearch.trim() || !creatorName.trim() || !friendName.trim()) {
      setError('กรอกให้ครบทุกช่องนะ'); return;
    }
    setIsSearching(true); setError(''); setResult(null);
    try {
      const { data: groups } = await supabase.from('groups').select('*').ilike('name', `%${groupNameSearch.trim()}%`);
      if (!groups || groups.length === 0) { setError('ไม่พบกลุ่มชื่อนี้'); return; }
      
      for (const group of groups) {
        const { data: participants } = await supabase.from('participants').select('name').eq('group_id', group.id);
        const names = participants?.map(p => p.name.toLowerCase()) || [];
        // Check if both names exist in the group
        const hasCreator = names.some(n => n.includes(creatorName.toLowerCase()));
        const hasFriend = names.some(n => n.includes(friendName.toLowerCase()));
        if (hasCreator && hasFriend) { setResult(group); return; }
      }
      setError('ชื่อสมาชิกไม่ตรงกับกลุ่มที่เจอ');
    } catch (err) { setError('เกิดข้อผิดพลาด'); } finally { setIsSearching(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">✕</button>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">🔑 กู้คืนรหัสกลุ่ม</h3>
        
        <div className="space-y-3">
          <div>
             <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อกลุ่ม</label>
             <input type="text" value={groupNameSearch} onChange={(e) => setGroupNameSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none" placeholder="เช่น แก๊งออฟฟิศ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อคนสร้าง (หรือคุณ)</label>
                <input type="text" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none" placeholder="ชื่อ..." />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อเพื่อน 1 คน</label>
                <input type="text" value={friendName} onChange={(e) => setFriendName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none" placeholder="ชื่อ..." />
             </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center bg-red-50 py-1 rounded-lg">{error}</p>}
          {result ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mt-2">
              <p className="text-green-700 font-bold mb-1">เจอแล้ว!</p>
              <p className="text-3xl font-mono font-bold text-gray-800 tracking-widest my-2">{result.id}</p>
              <button onClick={() => { onRecover(result); }} className="w-full bg-green-500 text-white font-bold py-2 rounded-lg text-sm shadow-md hover:bg-green-600">ไปที่กลุ่มเลย →</button>
            </div>
          ) : (
            <button onClick={handleSearch} disabled={isSearching} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-200 mt-2">
              {isSearching ? '⏳ กำลังค้นหา...' : '🔍 ค้นหา'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Budget Stepper (Updated: Better Layout)
const BudgetStepper = ({ value, onChange, min, max }) => (
  <div className="flex flex-col items-center">
    <div className="bg-white border-2 border-gray-100 rounded-2xl px-2 py-2 flex items-center gap-3 shadow-sm">
      <button type="button" onClick={() => onChange(Math.max(min, value - 100))} disabled={value <= min}
        className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        −
      </button>
      <div className="w-16 text-center font-bold text-gray-700 text-lg">
        {value}
      </div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 100))} disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-xl text-green-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        +
      </button>
    </div>
  </div>
);

// --- MAIN APP ---

export default function Home() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [appStep, setAppStep] = useState('landing');
  
  // Data States
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [budgetMin, setBudgetMin] = useState(300);
  const [budgetMax, setBudgetMax] = useState(500);
  const [eventDate, setEventDate] = useState(''); // New: Date State
  
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState(null);
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  const [messageToSanta, setMessageToSanta] = useState('');
  
  const [participants, setParticipants] = useState([]);
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [drawnResult, setDrawnResult] = useState(null);
  const [myDrawResult, setMyDrawResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // --- UTILS & EFFECTS ---
  useEffect(() => { if (notification) setTimeout(() => setNotification(null), 3000); }, [notification]);
  useEffect(() => { if (error) setTimeout(() => setError(null), 4000); }, [error]);
  useEffect(() => { if (wishlistSaved) setTimeout(() => setWishlistSaved(false), 2000); }, [wishlistSaved]);

  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const fetchLobbyParticipants = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase.from('participants').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    setLobbyParticipants(data || []);
  }, [groupId]);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (data) {
        setEventDate(data.event_date || '');
        setBudgetMin(data.budget_min);
        setBudgetMax(data.budget_max);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId || appStep !== 'lobby') return;
    fetchLobbyParticipants();
    fetchGroupDetails(); // Fetch date when entering lobby
    const channel = supabase.channel('lobby-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchLobbyParticipants)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` }, fetchGroupDetails) // Listen for date/budget updates
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [groupId, appStep, fetchLobbyParticipants, fetchGroupDetails]);

  // --- ACTIONS ---

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setError('ตั้งชื่อกลุ่มก่อนนะ!'); return; }
    try {
      setIsLoading(true);
      const newGroupId = generateGroupId();
      const { error: createError } = await supabase.from('groups').insert({
        id: newGroupId,
        name: groupName.trim(),
        budget_min: budgetMin,
        budget_max: budgetMax,
        event_date: eventDate || null // Save Date
      }).single();

      if (createError) throw createError;
      setGroupId(newGroupId);
      setAppStep('lobby');
      setNotification('สร้างกลุ่มสำเร็จ! 🎉');
    } catch (err) { setError('สร้างไม่สำเร็จ: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateGroupDate = async (newDate) => {
    setEventDate(newDate); // Optimistic update
    try {
        await supabase.from('groups').update({ event_date: newDate }).eq('id', groupId);
    } catch (err) { setError('อัปเดตวันที่ไม่สำเร็จ'); }
  };

  const handleJoinGroup = async () => {
    if (!groupId.trim() || groupId.length < 6) { setError('รหัส 6 หลักนะ'); return; }
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase.from('groups').select('*').eq('id', groupId.toUpperCase()).single();
      if (fetchError) throw new Error('ไม่เจอกลุ่มนี้');
      setGroupId(data.id);
      setGroupName(data.name);
      setBudgetMin(data.budget_min);
      setBudgetMax(data.budget_max);
      setEventDate(data.event_date || '');
      setAppStep('lobby');
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleAddOtherMember = async (name) => {
    if (!name.trim()) return;
    const trimmedName = name.trim();
    if (lobbyParticipants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        setError(`"${trimmedName}" มีในกลุ่มแล้ว!`); return;
    }
    await supabase.from('participants').insert({ group_id: groupId, name: trimmedName, has_drawn: false });
  };

  const handleJoinAsParticipant = async () => {
    if (!myName.trim()) { setError('ใส่ชื่อก่อนนะ!'); return; }
    try {
      setIsLoading(true);
      const existing = lobbyParticipants.find(p => p.name.toLowerCase() === myName.trim().toLowerCase());
      if (existing) {
        setMyId(existing.id);
        setWishlist(existing.wishlist || '');
        setHobby(existing.hobby || '');
        setMessageToSanta(existing.message_to_santa || '');
        // Check if already drawn
        const { data: drawData } = await supabase.from('draws').select('*, receiver:receiver_id(*)').eq('drawer_id', existing.id).single();
        if (drawData) setMyDrawResult(drawData.receiver);
      } else {
        const { data } = await supabase.from('participants').insert({
          group_id: groupId, name: myName.trim(), wishlist: wishlist.trim() || null, hobby: hobby.trim() || null, message_to_santa: messageToSanta.trim() || null, has_drawn: false
        }).select().single();
        setMyId(data.id);
      }
      setAppStep('draw');
    } catch (err) { setError('เข้ากลุ่มไม่ได้: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateProfile = async () => {
    if (!myId) return;
    setSaveStatus('saving');
    await supabase.from('participants').update({ wishlist, hobby, message_to_santa: messageToSanta }).eq('id', myId);
    setSaveStatus('saved'); setTimeout(() => setSaveStatus(null), 1500);
  };

  const fetchParticipantsForDraw = useCallback(async () => {
     if (!groupId) return;
     const { data } = await supabase.from('participants').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
     setParticipants(data || []);
  }, [groupId]);

  useEffect(() => {
    if (!groupId || appStep !== 'draw') return;
    fetchParticipantsForDraw();
    const channel = supabase.channel('draw-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchParticipantsForDraw).subscribe();
    return () => supabase.removeChannel(channel);
  }, [groupId, appStep, fetchParticipantsForDraw]);

  const handleDraw = async () => {
    setIsDrawing(true); setShowResultCard(false);
    const { data: draws } = await supabase.from('draws').select('receiver_id').eq('group_id', groupId);
    const takenIds = draws?.map(d => d.receiver_id) || [];
    const validReceivers = participants.filter(p => p.id !== myId && !takenIds.includes(p.id));
    
    if (validReceivers.length === 0) { setError('ของขวัญหมดแล้ว! (หรือเหลือแค่ชื่อคุณ)'); setIsDrawing(false); return; }

    let count = 0;
    const interval = setInterval(() => {
      setDrawnResult(validReceivers[Math.floor(Math.random() * validReceivers.length)]);
      count++;
      if (count > 25) {
        clearInterval(interval);
        const finalResult = validReceivers[Math.floor(Math.random() * validReceivers.length)];
        setDrawnResult(finalResult);
        setTimeout(() => {
          setIsDrawing(false); setShowResultCard(true);
          supabase.from('draws').insert({ group_id: groupId, drawer_id: myId, receiver_id: finalResult.id });
          supabase.from('participants').update({ has_drawn: true }).eq('id', myId);
          setMyDrawResult(finalResult);
        }, 1200);
      }
    }, 80);
  };

  // Derived
  const myParticipant = participants.find(p => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult;
  const formatDate = (dateStr) => {
      if(!dateStr) return null;
      const date = new Date(dateStr);
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  // --- RENDER ---
  if (isInitialLoading) return <LoadingScreen onComplete={() => setIsInitialLoading(false)} />;

  return (
    <>
      <Head>
        <title>Secret Santa 🎅</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-500 to-red-700 font-['Nunito'] relative selection:bg-green-200">
        
        {/* Snow & Modal */}
        <div className="fixed inset-0 pointer-events-none">
             {[...Array(15)].map((_, i) => <div key={i} className="absolute bg-white rounded-full opacity-40 animate-pulse" style={{ width: Math.random()*6+2, height: Math.random()*6+2, left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s` }} />)}
        </div>
        <RecoveryModal isOpen={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} onRecover={(g) => { setGroupId(g.id); setGroupName(g.name); setBudgetMin(g.budget_min); setBudgetMax(g.budget_max); setEventDate(g.event_date); setShowRecoveryModal(false); setAppStep('lobby'); setNotification('ยินดีต้อนรับกลับ! 🎉'); }} />

        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-block bg-white p-3 rounded-full shadow-lg border-4 border-green-500 mb-2 transform hover:scale-105 transition-transform">
              <span className="text-4xl">🎅</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-md">Secret Santa</h1>
          </div>

          {/* Toast */}
          {(error || notification) && (
             <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 animate-bounce">
                <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-sm w-full ${error ? 'bg-white border-l-4 border-red-500' : 'bg-white border-l-4 border-green-500'}`}>
                   <span className="text-xl">{error ? '😅' : '🎁'}</span>
                   <span className="text-gray-700 font-medium text-sm flex-1">{error || notification}</span>
                </div>
             </div>
          )}

          {/* MAIN CARD */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl relative">

            {/* --- STEP 1: LANDING --- */}
            {appStep === 'landing' && (
              <div className="space-y-4 py-4 text-center">
                <h2 className="text-xl font-bold text-gray-800">ยินดีต้อนรับ! 🎄</h2>
                <p className="text-gray-500 text-sm mb-6">มาจับฉลากแลกของขวัญกันเถอะ</p>
                
                <button onClick={() => setAppStep('create')} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
                  🏠 สร้างกลุ่มใหม่
                </button>
                <button onClick={() => setAppStep('join')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-colors">
                  🔑 มีรหัสกลุ่มแล้ว
                </button>
                <button onClick={() => setShowRecoveryModal(true)} className="text-gray-400 text-sm underline pt-2">
                  ลืมรหัสกลุ่ม?
                </button>
              </div>
            )}

            {/* --- STEP 2: CREATE GROUP --- */}
            {appStep === 'create' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-800 text-center">สร้างกลุ่มใหม่ 🎉</h2>
                
                <div>
                   <label className="block text-sm font-bold text-gray-500 mb-2">ชื่อกลุ่ม</label>
                   <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="เช่น แก๊งออฟฟิศ" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-bold focus:border-green-400 focus:outline-none" autoFocus />
                </div>

                {/* NEW: Date Input */}
                <div>
                   <label className="block text-sm font-bold text-gray-500 mb-2">📅 วันที่แลกของ (ไม่ระบุก็ได้)</label>
                   <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:border-green-400 focus:outline-none" />
                </div>

                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                   <label className="block text-sm font-bold text-green-700 text-center mb-3">💰 งบประมาณ (บาท)</label>
                   <div className="flex items-center justify-center gap-6">
                      <BudgetStepper value={budgetMin} onChange={setBudgetMin} min={0} max={budgetMax - 100} />
                      <span className="text-gray-300 font-bold">→</span>
                      <BudgetStepper value={budgetMax} onChange={setBudgetMax} min={budgetMin + 100} max={100000} />
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAppStep('landing')} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">กลับ</button>
                  <button onClick={handleCreateGroup} disabled={isLoading} className="flex-[2] bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg">
                    {isLoading ? '⏳ ...' : 'สร้างเลย! ✨'}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 3: JOIN --- */}
            {appStep === 'join' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-800 text-center">เข้าร่วมกลุ่ม 🚪</h2>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">รหัส 6 หลัก</label>
                  <input type="text" value={groupId} onChange={e => setGroupId(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX" className="w-full text-center text-3xl tracking-widest uppercase bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-700 font-bold focus:border-green-400 focus:outline-none" autoFocus />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setAppStep('landing')} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">กลับ</button>
                  <button onClick={handleJoinGroup} disabled={isLoading || groupId.length < 6} className="flex-[2] bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">
                     {isLoading ? '⏳ ...' : 'เข้าร่วม →'}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 4: LOBBY --- */}
            {appStep === 'lobby' && (
              <div className="space-y-6">
                
                {/* Code Card */}
                <div onClick={() => { navigator.clipboard.writeText(groupId); setNotification('คัดลอกรหัสแล้ว!'); }} className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-4 text-center cursor-pointer shadow-lg active:scale-95 transition-transform">
                  <p className="text-red-100 text-xs mb-1">📢 แตะเพื่อคัดลอกรหัส</p>
                  <p className="text-4xl font-bold tracking-[0.2em] font-mono">{groupId}</p>
                </div>

                <div className="text-center">
                   <h2 className="text-xl font-bold text-gray-800">{groupName}</h2>
                   <div className="flex items-center justify-center gap-3 mt-1 text-sm font-bold">
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg">💰 {budgetMin}-{budgetMax}฿</span>
                      {/* Date Picker / Display in Lobby */}
                      <div className="relative group">
                          <input type="date" value={eventDate} onChange={(e) => handleUpdateGroupDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <span className={`px-2 py-1 rounded-lg flex items-center gap-1 ${eventDate ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-100 border border-dashed border-gray-300'}`}>
                             📅 {eventDate ? formatDate(eventDate) : 'นัดวัน?'}
                             <span className="text-[10px] opacity-50">✎</span>
                          </span>
                      </div>
                   </div>
                </div>

                {/* Input Name & Wishlist */}
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3 border border-gray-100">
                   <label className="block text-sm font-bold text-gray-600">👤 ชื่อของคุณ</label>
                   <input type="text" value={myName} onChange={e => setMyName(e.target.value)} placeholder="ชื่อเล่น..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-bold focus:border-red-400 focus:outline-none" />
                   
                   {!showWishlistForm ? (
                      <button onClick={() => setShowWishlistForm(true)} className="text-sm text-green-600 font-bold hover:underline flex items-center gap-1">
                         ✉️ เขียนจดหมายถึง Santa →
                      </button>
                   ) : (
                      <div className="bg-white border-2 border-green-100 p-3 rounded-xl space-y-3 relative animate-fade-in-up">
                         <button onClick={() => setShowWishlistForm(false)} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500">✕</button>
                         <input type="text" value={wishlist} onChange={e => {setWishlist(e.target.value); setWishlistSaved(false)}} onBlur={() => wishlist && setWishlistSaved(true)} placeholder="🎁 อยากได้อะไร?" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                         <input type="text" value={hobby} onChange={e => setHobby(e.target.value)} placeholder="🎨 งานอดิเรก" className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                         <textarea value={messageToSanta} onChange={e => setMessageToSanta(e.target.value)} placeholder="💌 ฝากบอก Santa..." rows={2} className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-400" />
                         {wishlistSaved && <p className="text-center text-xs text-green-500 font-bold">✓ บันทึกแล้ว</p>}
                      </div>
                   )}
                </div>

                {/* Members List */}
                <div className="space-y-2">
                   <p className="text-sm font-bold text-gray-500 pl-1">👥 สมาชิก ({lobbyParticipants.length} คน)</p>
                   <div className="flex gap-2">
                      <input id="addMemberInput" type="text" placeholder="พิมพ์ชื่อเพื่อน..." className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none" 
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { handleAddOtherMember(e.target.value); e.target.value=''; } }} />
                      <button onClick={() => { const el = document.getElementById('addMemberInput'); if(el.value.trim()) { handleAddOtherMember(el.value); el.value=''; } }} className="bg-green-100 text-green-600 font-bold px-4 rounded-xl hover:bg-green-200">+</button>
                   </div>
                   
                   <div className="flex flex-wrap gap-2 pt-2">
                      {lobbyParticipants.map(p => (
                        <span key={p.id} className="bg-gray-100 text-gray-700 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                           {p.name} {p.wishlist && '🎁'}
                        </span>
                      ))}
                      {lobbyParticipants.length === 0 && <p className="text-gray-300 text-sm italic w-full text-center">ยังไม่มีใครมา...</p>}
                   </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                   <button onClick={handleJoinAsParticipant} disabled={isLoading || !myName.trim()} className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50">
                      {isLoading ? '⏳ ...' : '🎅 พร้อมจับฉลาก!'}
                   </button>
                </div>
              </div>
            )}

            {/* --- STEP 5: DRAW & STATUS --- */}
            {appStep === 'draw' && (
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                   <div>
                      <h2 className="text-xl font-bold text-gray-800">{groupName}</h2>
                      <p className="text-sm text-gray-500">หวัดดี <span className="text-red-500 font-bold">{myName}</span>!</p>
                   </div>
                   <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">งบ {budgetMin}-{budgetMax}</span>
                      {eventDate && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-md font-bold">📅 {formatDate(eventDate)}</span>}
                   </div>
                </div>

                {/* Grid of Santas */}
                <div className="bg-gray-50 rounded-2xl p-4">
                   <h3 className="font-bold text-gray-400 text-xs mb-3 text-center uppercase tracking-wider">Status</h3>
                   <div className="flex flex-wrap justify-center gap-x-4 gap-y-4">
                      {participants.map(p => <SantaIcon key={p.id} name={p.name} hasDrawn={p.has_drawn} isMe={p.id === myId} />)}
                   </div>
                </div>

                {/* Action Area */}
                {showResultCard && drawnResult ? (
                   <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-100 rounded-3xl p-6 text-center animate-fade-in-up shadow-sm">
                      <p className="text-red-500 font-bold text-sm mb-2">ภารกิจของคุณคือ...</p>
                      <p className="text-3xl font-extrabold text-gray-800 mb-4">{drawnResult.name}</p>
                      {drawnResult.wishlist && <div className="bg-white/80 p-2 rounded-lg text-sm text-gray-600 mb-4">🎁 "{drawnResult.wishlist}"</div>}
                      <button onClick={() => setAppStep('result')} className="bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-red-600">ดูรายละเอียดลับ 🕵️</button>
                   </div>
                ) : hasAlreadyDrawn && myDrawResult ? (
                   <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                      <p className="text-green-600 font-bold mb-1">✅ คุณจับฉลากแล้ว</p>
                      <p className="text-2xl font-bold text-gray-800">{myDrawResult.name}</p>
                      <button onClick={() => setAppStep('result')} className="text-green-600 text-sm font-bold underline mt-3">ดูข้อมูลเพื่อน</button>
                   </div>
                ) : (
                   <div className="py-6 text-center">
                      {participants.length < 2 ? (
                         <p className="text-gray-400 italic">รอเพื่อนแป๊บนึงนะ... (ต้องมี 2 คนขึ้นไป)</p>
                      ) : (
                         <button onClick={handleDraw} disabled={isDrawing} className={`w-40 h-40 rounded-full mx-auto shadow-2xl flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95 ${isDrawing ? 'bg-gray-200 cursor-not-allowed' : 'bg-gradient-to-br from-red-500 to-red-600 hover:scale-105'}`}>
                            {isDrawing ? <span className="text-4xl animate-spin">🎲</span> : <span className="text-5xl animate-bounce">🎁</span>}
                            <span className={`font-bold ${isDrawing ? 'text-gray-400' : 'text-white'}`}>{isDrawing ? drawnResult?.name : 'จับเลย!'}</span>
                         </button>
                      )}
                   </div>
                )}
                
                {!isDrawing && !hasAlreadyDrawn && (
                  <button onClick={() => setAppStep('lobby')} className="w-full text-center text-gray-400 text-sm hover:text-gray-600">แก้ไขข้อมูลส่วนตัว</button>
                )}
              </div>
            )}

            {/* --- STEP 6: SECRET RESULT --- */}
            {appStep === 'result' && myDrawResult && (
              <div className="text-center py-6 space-y-6">
                <div className="relative inline-block">
                   <div className="absolute -top-4 -left-4 text-3xl animate-bounce" style={{animationDelay: '0.2s'}}>🎄</div>
                   <div className="absolute -top-4 -right-4 text-3xl animate-bounce" style={{animationDelay: '0.7s'}}>⭐</div>
                   <div className="bg-red-500 text-white p-8 rounded-[2rem] shadow-xl rotate-1">
                      <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-2">Secret Mission</p>
                      <h2 className="text-4xl font-extrabold">{myDrawResult.name}</h2>
                   </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-4 border border-gray-100">
                   <div className="flex justify-between items-center text-sm font-bold border-b border-gray-200 pb-2">
                      <span className="text-gray-500">💰 งบของขวัญ</span>
                      <span className="text-green-600">{budgetMin}-{budgetMax}฿</span>
                   </div>
                   {eventDate && (
                      <div className="flex justify-between items-center text-sm font-bold border-b border-gray-200 pb-2">
                         <span className="text-gray-500">📅 วันนัดหมาย</span>
                         <span className="text-red-500">{formatDate(eventDate)}</span>
                      </div>
                   )}
                   <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">🎁 สิ่งที่อยากได้</p>
                      <p className="text-gray-800 font-medium">{myDrawResult.wishlist || '-'}</p>
                   </div>
                   {myDrawResult.hobby && (
                      <div>
                         <p className="text-xs text-gray-400 font-bold uppercase mb-1">🎨 งานอดิเรก</p>
                         <p className="text-gray-800 font-medium">{myDrawResult.hobby}</p>
                      </div>
                   )}
                   {myDrawResult.message_to_santa && (
                      <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 italic text-gray-600 text-sm">
                         " {myDrawResult.message_to_santa} "
                      </div>
                   )}
                </div>

                <div className="pt-4">
                   <p className="text-gray-300 text-xs mb-4">🤫 จุ๊ๆ อย่าบอกใครนะ</p>
                   <button onClick={() => setAppStep('draw')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors">← กลับหน้าหลัก</button>
                </div>
              </div>
            )}

          </div>
          
          <p className="text-center text-red-800/40 text-xs mt-6 font-bold">Made with ❤️ for Christmas</p>
        </div>
      </div>
    </>
  );
}
