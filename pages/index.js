import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- CONFIG ---
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CSS STYLES ---
const styles = `
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }
  .animate-float-slow {
    animation: float-slow 4s ease-in-out infinite;
  }
  .flip-x {
    transform: scaleX(-1);
  }
`;

// --- COMPONENTS ---

const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 120) {
          clearInterval(timer);
          setIsFinished(true);
          setTimeout(onComplete, 500);
          return 120;
        }
        return prev + 2;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${isFinished ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
      </div>
      <div className="relative mb-8 w-full max-w-xs h-16">
        <div className="absolute top-0 transition-all duration-100 ease-linear"
          style={{ left: `${progress - 20}%` }}> 
           {/* กลับด้าน Emoji ให้กวางนำหน้า และหันหน้าไปทางขวา (scaleX(-1)) */}
           <div className="flex items-end gap-1 text-4xl whitespace-nowrap filter drop-shadow-lg flip-x">
             🦌🦌🛷🎅
           </div>
        </div>
      </div>
      <p className="text-white/80 mt-12 text-sm font-medium animate-pulse">กำลังเดินทางไปบ้านซานต้า...</p>
    </div>
  );
};

const SantaIcon = ({ name, hasDrawn, isMe }) => (
  <div className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isMe ? 'bg-red-50 ring-2 ring-red-200 scale-105' : ''}`}>
    <div className="relative">
      <div className={`text-4xl transition-all ${hasDrawn ? '' : 'grayscale opacity-50'}`}>
        🎅
      </div>
      {hasDrawn && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-green-100">
           <span className="text-xs text-green-500 font-bold">✓</span>
        </div>
      )}
    </div>
    <span className={`text-xs font-bold truncate max-w-[70px] ${hasDrawn ? 'text-gray-800' : 'text-gray-400'}`}>
      {name}
    </span>
    {hasDrawn && (
      <span className="text-[9px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full font-bold shadow-sm">
        จับแล้ว!
      </span>
    )}
  </div>
);

// Recovery Modal
const RecoveryModal = ({ isOpen, onClose, onRecover }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
        if (searchTerm.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        const { data } = await supabase.from('groups').select('*').ilike('name', `%${searchTerm}%`).limit(5);
        setSearchResults(data || []);
        setIsSearching(false);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">✕</button>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">🔍 ค้นหากลุ่ม</h3>
        
        <div className="space-y-4">
          <div className="relative">
             <label className="block text-xs font-bold text-gray-500 mb-1">พิมพ์ชื่อกลุ่ม</label>
             <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-red-400 focus:outline-none" placeholder="เช่น แก๊งออฟฟิศ..." />
             {isSearching && <div className="absolute right-3 top-9 text-xs text-gray-400">⏳</div>}
             
             {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {searchResults.map(group => (
                        <div key={group.id} onClick={() => { setSelectedGroup(group); setSearchResults([]); setSearchTerm(group.name); }} className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <p className="font-bold text-gray-700 text-sm">{group.name}</p>
                            <p className="text-xs text-gray-400">Code: {group.id}</p>
                        </div>
                    ))}
                </div>
             )}
          </div>

          {selectedGroup ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-fade-in-up">
              <p className="text-green-700 font-bold mb-1">เลือกกลุ่มนี้?</p>
              <p className="text-xl font-bold text-gray-800">{selectedGroup.name}</p>
              <button onClick={() => onRecover(selectedGroup)} className="w-full bg-green-500 text-white font-bold py-2 rounded-lg text-sm shadow-md hover:bg-green-600 transition-colors mt-2">ไปที่กลุ่มเลย →</button>
            </div>
          ) : (
            searchResults.length === 0 && searchTerm.length > 2 && !isSearching && <p className="text-center text-gray-400 text-sm italic">ไม่พบกลุ่มชื่อนี้</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Edit Profile Modal
const EditProfileModal = ({ isOpen, onClose, initialData, onSave }) => {
    const [wishlist, setWishlist] = useState(initialData.wishlist || '');
    const [hobby, setHobby] = useState(initialData.hobby || '');
    const [message, setMessage] = useState(initialData.message || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">✕</button>
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">✏️ แก้ไขข้อมูลส่วนตัว</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🎁 Wishlist</label>
                        <input type="text" value={wishlist} onChange={e => setWishlist(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🎨 งานอดิเรก</label>
                        <input type="text" value={hobby} onChange={e => setHobby(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">💌 ฝากบอก Santa</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-red-400 focus:outline-none" />
                    </div>
                    <button 
                        onClick={async () => {
                            setIsSaving(true);
                            await onSave({ wishlist, hobby, message_to_santa: message });
                            setIsSaving(false);
                            onClose();
                        }} 
                        className="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2"
                    >
                        {isSaving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BudgetStepper = ({ value, onChange, min, max }) => (
  <div className="flex flex-col items-center">
    <div className="bg-white border-2 border-gray-100 rounded-2xl px-2 py-2 flex items-center gap-3 shadow-sm">
      <button type="button" onClick={() => onChange(Math.max(min, value - 100))} disabled={value <= min} className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">−</button>
      <div className="w-16 text-center font-bold text-gray-700 text-lg">{value}</div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 100))} disabled={value >= max} className="w-8 h-8 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-xl text-green-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
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
  const [eventDate, setEventDate] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  
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
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

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

  const checkGameStatus = useCallback(async () => {
     if (!groupId) return;
     const { count } = await supabase.from('draws').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
     setGameStarted(count > 0);
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
    fetchGroupDetails();
    checkGameStatus();
    
    const channel = supabase.channel('lobby-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchLobbyParticipants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draws', filter: `group_id=eq.${groupId}` }, checkGameStatus)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [groupId, appStep, fetchLobbyParticipants, fetchGroupDetails, checkGameStatus]);

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
        event_date: eventDate || null
      }).single();

      if (createError) throw createError;
      setGroupId(newGroupId);
      setAppStep('lobby');
      setNotification('สร้างกลุ่มสำเร็จ! 🎉');
    } catch (err) { setError('สร้างไม่สำเร็จ: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateGroupDate = async (newDate) => {
    setEventDate(newDate);
    try { await supabase.from('groups').update({ event_date: newDate }).eq('id', groupId); } catch (err) {}
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
    const tempId = Math.random().toString();
    setLobbyParticipants(prev => [...prev, { id: tempId, name: trimmedName, wishlist: null }]);
    const { error } = await supabase.from('participants').insert({ group_id: groupId, name: trimmedName, has_drawn: false });
    if(error) { fetchLobbyParticipants(); setError('เพิ่มไม่ได้: ' + error.message); }
  };

  const handleJoinAsParticipant = async () => {
    if (!myName.trim()) { setError('ใส่ชื่อก่อนนะ!'); return; }
    try {
      setIsLoading(true);
      const trimmedName = myName.trim();
      
      const { data: existingUser } = await supabase.from('participants').select('*').eq('group_id', groupId).ilike('name', trimmedName).single();
      
      if (existingUser) {
        setMyId(existingUser.id);
        setWishlist(existingUser.wishlist || '');
        setHobby(existingUser.hobby || '');
        setMessageToSanta(existingUser.message_to_santa || '');
        
        // CHECK IF ALREADY DRAWN
        const { data: drawData } = await supabase.from('draws').select('*, receiver:receiver_id(*)').eq('drawer_id', existingUser.id).single();
        if (drawData) {
            setMyDrawResult(drawData.receiver);
            // DIRECT TO RESULT IF DRAWN
            setAppStep('draw'); // Will show result card automatically based on myDrawResult
        } else {
            setAppStep('draw');
        }
      } else {
        const { data, error } = await supabase.from('participants').insert({
          group_id: groupId, name: trimmedName, wishlist: wishlist.trim() || null, hobby: hobby.trim() || null, message_to_santa: messageToSanta.trim() || null, has_drawn: false
        }).select().single();
        if(error) throw error;
        setMyId(data.id);
        setAppStep('draw');
      }
    } catch (err) { setError('เข้ากลุ่มไม่ได้: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateProfile = async (newData) => {
    if (!myId) return;
    setWishlist(newData.wishlist); setHobby(newData.hobby); setMessageToSanta(newData.message_to_santa);
    await supabase.from('participants').update(newData).eq('id', myId);
    setNotification('บันทึกข้อมูลแล้ว! ✅');
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
    
    if (validReceivers.length === 0) { setError('ของขวัญหมดแล้ว!'); setIsDrawing(false); return; }

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
        <style dangerouslySetInnerHTML={{__html: styles}} />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-500 to-red-700 font-['Nunito'] relative selection:bg-green-200 pb-20">
        
        {/* Snow & Modal */}
        <div className="fixed inset-0 pointer-events-none">
             {[...Array(15)].map((_, i) => <div key={i} className="absolute bg-white rounded-full opacity-40 animate-pulse" style={{ width: Math.random()*6+2, height: Math.random()*6+2, left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s` }} />)}
        </div>
        <RecoveryModal isOpen={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} onRecover={(g) => { setGroupId(g.id); setGroupName(g.name); setBudgetMin(g.budget_min); setBudgetMax(g.budget_max); setEventDate(g.event_date); setShowRecoveryModal(false); setAppStep('lobby'); setNotification('ยินดีต้อนรับกลับ! 🎉'); }} />
        
        {/* EDIT PROFILE MODAL (GLOBAL ACCESS) */}
        <EditProfileModal 
            isOpen={showEditProfileModal} 
            onClose={() => setShowEditProfileModal(false)} 
            initialData={{ wishlist, hobby, message: messageToSanta }} 
            onSave={handleUpdateProfile} 
        />

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
          <div className="bg-white rounded-3xl p-6 shadow-2xl relative animate-float-slow">

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
                         <input type="text" value={wishlist} onChange={e => {setWishlist(e.target.value); setWishlistSaved(false)}} onBlur={() => wishlist && setWishlistSaved(true)} placeholder="🎁 อยาก
