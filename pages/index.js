import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Santa Sleigh Loading Screen Component
const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return 100;
        }
        return prev + 4;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 z-50 flex flex-col items-center justify-center">
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* Moon */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-yellow-100 rounded-full shadow-lg shadow-yellow-200/50" />
      
      {/* Santa Sleigh Animation */}
      <div 
        className="relative mb-8 transition-all duration-100 ease-linear"
        style={{ transform: `translateX(${(progress - 50) * 3}px)` }}
      >
        <div className="flex items-end gap-1">
          {/* Reindeer */}
          <div className="text-4xl animate-bounce" style={{ animationDuration: '0.5s' }}>🦌</div>
          <div className="text-3xl animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.1s' }}>🦌</div>
          {/* Sleigh */}
          <div className="text-5xl">🛷</div>
          {/* Santa */}
          <div className="text-4xl -ml-6">🎅</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-64 h-3 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="text-white/80 mt-4 text-sm font-medium">กำลังเตรียมบ้านซานต้า...</p>
    </div>
  );
};

// Reindeer Component for Landing Page
const FloatingReindeer = () => (
  <div className="absolute bottom-20 left-0 right-0 overflow-hidden pointer-events-none h-16">
    <div className="animate-reindeer-slide flex items-center gap-2 whitespace-nowrap">
      <span className="text-3xl">🦌</span>
      <span className="text-2xl">🦌</span>
      <span className="text-3xl">🦌</span>
    </div>
  </div>
);

// Santa Icon Component
const SantaIcon = ({ name, hasDrawn, isMe }) => (
  <div className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isMe ? 'bg-red-50 ring-2 ring-red-300' : ''}`}>
    <div className={`text-3xl ${hasDrawn ? '' : 'grayscale opacity-50'}`}>
      🎅
    </div>
    <span className={`text-xs font-medium truncate max-w-[60px] ${hasDrawn ? 'text-gray-700' : 'text-gray-400'}`}>
      {name}
    </span>
    {hasDrawn && <span className="text-xs text-green-500">✓</span>}
  </div>
);

// Group Recovery Modal
const RecoveryModal = ({ isOpen, onClose, onRecover }) => {
  const [memberName1, setMemberName1] = useState('');
  const [memberName2, setMemberName2] = useState('');
  const [groupNameSearch, setGroupNameSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!groupNameSearch.trim() || !memberName1.trim() || !memberName2.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    
    setIsSearching(true);
    setError('');
    setResult(null);
    
    try {
      // Find group by name
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .ilike('name', `%${groupNameSearch.trim()}%`);
      
      if (!groups || groups.length === 0) {
        setError('ไม่พบกลุ่มที่ชื่อนี้');
        return;
      }
      
      // Check if both members exist in any of these groups
      for (const group of groups) {
        const { data: participants } = await supabase
          .from('participants')
          .select('name')
          .eq('group_id', group.id);
        
        const names = participants?.map(p => p.name.toLowerCase()) || [];
        const hasMatch1 = names.some(n => n.includes(memberName1.toLowerCase()));
        const hasMatch2 = names.some(n => n.includes(memberName2.toLowerCase()));
        
        if (hasMatch1 && hasMatch2) {
          setResult(group);
          return;
        }
      }
      
      setError('ไม่พบสมาชิกที่ตรงกัน ลองเช็คชื่ออีกที');
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">🔍 ค้นหากลุ่มที่ลืมรหัส</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อกลุ่ม</label>
            <input
              type="text"
              value={groupNameSearch}
              onChange={(e) => setGroupNameSearch(e.target.value)}
              placeholder="เช่น แก๊งออฟฟิศ"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อสมาชิกคนที่ 1</label>
            <input
              type="text"
              value={memberName1}
              onChange={(e) => setMemberName1(e.target.value)}
              placeholder="ชื่อเพื่อนในกลุ่ม"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อสมาชิกคนที่ 2</label>
            <input
              type="text"
              value={memberName2}
              onChange={(e) => setMemberName2(e.target.value)}
              placeholder="ชื่อเพื่อนอีกคน"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-green-700 font-bold mb-1">พบกลุ่มแล้ว! 🎉</p>
              <p className="text-gray-600 text-sm">{result.name}</p>
              <p className="text-2xl font-bold text-gray-800 tracking-widest mt-2">{result.id}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.id);
                  onRecover(result);
                }}
                className="mt-2 text-sm text-green-600 font-bold hover:underline"
              >
                📋 คัดลอกรหัส & เข้าร่วม
              </button>
            </div>
          )}
          
          {!result && (
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {isSearching ? '🔍 กำลังค้นหา...' : '🔍 ค้นหา'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  // App State
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [appStep, setAppStep] = useState('landing');
  
  // Group State
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [budgetMin, setBudgetMin] = useState(300);
  const [budgetMax, setBudgetMax] = useState(500);
  const [eventDate, setEventDate] = useState('');
  
  // User State
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState(null);
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  const [messageToSanta, setMessageToSanta] = useState('');
  
  // Game State
  const [participants, setParticipants] = useState([]);
  const [drawnResult, setDrawnResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [myDrawResult, setMyDrawResult] = useState(null);
  const [showResultCard, setShowResultCard] = useState(false);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-save indicator for wishlist
  useEffect(() => {
    if (wishlistSaved) {
      const timer = setTimeout(() => setWishlistSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [wishlistSaved]);

  // Generate Group ID
  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  // Fetch Lobby Participants
  const fetchLobbyParticipants = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setLobbyParticipants(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [groupId]);

  // Realtime for Lobby
  useEffect(() => {
    if (!groupId || appStep !== 'lobby') return;
    fetchLobbyParticipants();
    const channel = supabase
      .channel('lobby-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchLobbyParticipants)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [groupId, appStep, fetchLobbyParticipants]);

  // Create Group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('ตั้งชื่อกลุ่มก่อนนะ!');
      return;
    }
    try {
      setIsLoading(true);
      const newGroupId = generateGroupId();
      
      const { data, error: createError } = await supabase
        .from('groups')
        .insert({
          id: newGroupId,
          name: groupName.trim(),
          budget_min: budgetMin,
          budget_max: budgetMax,
          event_date: eventDate || null
        })
        .select()
        .single();

      if (createError) throw createError;
      
      setGroupId(newGroupId);
      setAppStep('lobby');
      setNotification('สร้างกลุ่มสำเร็จ! 🎉');
    } catch (err) {
      setError('สร้างไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Join Group
  const handleJoinGroup = async () => {
    if (!groupId.trim() || groupId.length < 6) {
      setError('ใส่รหัส 6 หลักให้ครบนะ');
      return;
    }
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId.toUpperCase())
        .single();

      if (fetchError) throw new Error('ไม่เจอกลุ่มนี้ ลองเช็ครหัสอีกที');
      
      setGroupId(data.id);
      setGroupName(data.name);
      setBudgetMin(data.budget_min);
      setBudgetMax(data.budget_max);
      setEventDate(data.event_date);
      setAppStep('lobby');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Other Member
  const handleAddOtherMember = async (name) => {
    if (!name.trim()) return;
    
    const trimmedName = name.trim();
    const isDuplicate = lobbyParticipants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    const isSameAsMe = myName.trim().toLowerCase() === trimmedName.toLowerCase();
    
    if (isDuplicate || isSameAsMe) {
      setError(`"${trimmedName}" มีในกลุ่มแล้วนะ!`);
      return;
    }
    
    try {
      const { error: insertError } = await supabase
        .from('participants')
        .insert({ group_id: groupId, name: trimmedName, has_drawn: false });
      if (insertError) throw insertError;
      setNotification(`เพิ่ม ${trimmedName} แล้ว! ✨`);
    } catch (err) {
      setError('เพิ่มไม่ได้: ' + err.message);
    }
  };

  // Delete Member
  const handleDeleteMember = async (memberId, memberName) => {
    try {
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', memberId);
      if (deleteError) throw deleteError;
      setNotification(`ลบ ${memberName} แล้ว`);
    } catch (err) {
      setError('ลบไม่ได้: ' + err.message);
    }
  };

  // Join as Participant
  const handleJoinAsParticipant = async () => {
    if (!myName.trim()) {
      setError('ใส่ชื่อก่อนนะ!');
      return;
    }
    
    const isDuplicate = lobbyParticipants.some(p => p.name.toLowerCase() === myName.trim().toLowerCase());
    
    try {
      setIsLoading(true);
      
      if (isDuplicate) {
        const existing = lobbyParticipants.find(p => p.name.toLowerCase() === myName.trim().toLowerCase());
        setMyId(existing.id);
        setWishlist(existing.wishlist || '');
        setHobby(existing.hobby || '');
        setMessageToSanta(existing.message_to_santa || '');
        
        const { data: drawData } = await supabase
          .from('draws')
          .select('*, receiver:receiver_id(name, wishlist, hobby, message_to_santa)')
          .eq('drawer_id', existing.id)
          .single();
        if (drawData) setMyDrawResult(drawData.receiver);
      } else {
        const { data, error: insertError } = await supabase
          .from('participants')
          .insert({
            group_id: groupId,
            name: myName.trim(),
            wishlist: wishlist.trim() || null,
            hobby: hobby.trim() || null,
            message_to_santa: messageToSanta.trim() || null,
            has_drawn: false
          })
          .select()
          .single();
        if (insertError) throw insertError;
        setMyId(data.id);
      }
      
      setAppStep('draw');
    } catch (err) {
      setError('เข้าร่วมไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async () => {
    if (!myId) return;
    try {
      setSaveStatus('saving');
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          wishlist: wishlist.trim() || null,
          hobby: hobby.trim() || null,
          message_to_santa: messageToSanta.trim() || null
        })
        .eq('id', myId);
      if (updateError) throw updateError;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (err) {
      setError('บันทึกไม่สำเร็จ');
      setSaveStatus(null);
    }
  };

  // Fetch Participants for Draw
  const fetchParticipants = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setParticipants(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [groupId]);

  // Realtime for Draw
  useEffect(() => {
    if (!groupId || appStep !== 'draw') return;
    fetchParticipants();
    const channel = supabase
      .channel('draw-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchParticipants)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [groupId, appStep, fetchParticipants]);

  // Handle Draw with slower reveal
  const handleDraw = async () => {
    setIsDrawing(true);
    setShowResultCard(false);
    
    const { data: draws } = await supabase
      .from('draws')
      .select('receiver_id')
      .eq('group_id', groupId);
    
    const takenIds = draws?.map(d => d.receiver_id) || [];
    const validReceivers = participants.filter(p => p.id !== myId && !takenIds.includes(p.id));
    
    if (validReceivers.length === 0) {
      setError('ไม่มีคนให้จับแล้ว!');
      setIsDrawing(false);
      return;
    }

    // Longer animation
    let count = 0;
    const interval = setInterval(() => {
      setDrawnResult(validReceivers[Math.floor(Math.random() * validReceivers.length)]);
      count++;
      if (count > 25) {
        clearInterval(interval);
        const finalResult = validReceivers[Math.floor(Math.random() * validReceivers.length)];
        setDrawnResult(finalResult);
        
        // Delay before showing result
        setTimeout(() => {
          setIsDrawing(false);
          setShowResultCard(true);
          saveDrawResult(finalResult);
        }, 1500);
      }
    }, 100);
  };

  // Save Draw Result
  const saveDrawResult = async (receiver) => {
    try {
      await supabase.from('draws').insert({ group_id: groupId, drawer_id: myId, receiver_id: receiver.id });
      await supabase.from('participants').update({ has_drawn: true }).eq('id', myId);
      setMyDrawResult(receiver);
    } catch (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Derived State
  const pendingDraw = participants.filter(p => !p.has_drawn);
  const completedDraw = participants.filter(p => p.has_drawn);
  const myParticipant = participants.find(p => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult;

  // Budget Stepper Component
  const BudgetStepper = ({ value, onChange, min = 100, max = 10000 }) => (
    <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 100))}
        disabled={value <= min}
        className="w-10 h-10 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-red-500 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const newVal = Math.min(max, Math.max(min, Number(e.target.value)));
          onChange(newVal);
        }}
        className="w-20 text-center bg-transparent font-bold text-gray-700 focus:outline-none"
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 100))}
        disabled={value >= max}
        className="w-10 h-10 bg-green-50 hover:bg-green-100 rounded-lg font-bold text-green-500 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );

  // Show loading screen initially
  if (isInitialLoading) {
    return <LoadingScreen onComplete={() => setIsInitialLoading(false)} />;
  }

  return (
    <>
      <Head>
        <title>Secret Santa 🎅</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        @keyframes reindeer-slide {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
        .animate-reindeer-slide {
          animation: reindeer-slide 8s linear infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti 1s ease-out forwards; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-500 to-red-700 font-['Nunito'] selection:bg-green-300 relative">
        
        {/* Snow particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-60 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Recovery Modal */}
        <RecoveryModal 
          isOpen={showRecoveryModal} 
          onClose={() => setShowRecoveryModal(false)}
          onRecover={(group) => {
            setGroupId(group.id);
            setGroupName(group.name);
            setBudgetMin(group.budget_min);
            setBudgetMax(group.budget_max);
            setShowRecoveryModal(false);
            setAppStep('lobby');
            setNotification('เข้ากลุ่มสำเร็จ! 🎉');
          }}
        />

        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          
          {/* Header */}
          <div className="text-center mb-6 pt-2">
            <div className="inline-block bg-white p-3 rounded-full shadow-lg border-4 border-green-500 mb-3">
              <span className="text-4xl">🎅</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">Secret Santa</h1>
            <p className="text-red-100 text-sm mt-1">จับฉลากแลกของขวัญ</p>
          </div>

          {/* Toast Notifications */}
          {error && (
            <div className="fixed top-4 left-4 right-4 z-50 animate-shake">
              <div className="bg-white border-l-4 border-red-500 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-md mx-auto">
                <span className="text-2xl">😅</span>
                <span className="text-gray-700 font-medium flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
          )}
          
          {notification && (
            <div className="fixed top-4 left-4 right-4 z-50">
              <div className="bg-white border-l-4 border-green-500 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-md mx-auto">
                <span className="text-2xl">🎁</span>
                <span className="text-gray-700 font-medium flex-1">{notification}</span>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            
            {/* LANDING */}
            {appStep === 'landing' && (
              <div className="space-y-4 py-4 relative">
                <FloatingReindeer />
                
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">ยินดีต้อนรับ! 🎄</h2>
                  <p className="text-gray-500 text-sm mt-1">พร้อมจับฉลากกันหรือยัง?</p>
                </div>
                
                <button
                  onClick={() => setAppStep('create')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                >
                  🏠 สร้างกลุ่มใหม่
                </button>

                <button
                  onClick={() => setAppStep('join')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all"
                >
                  🔑 มีรหัสกลุ่มแล้ว
                </button>
                
                <button
                  onClick={() => setShowRecoveryModal(true)}
                  className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 underline"
                >
                  🔍 ลืมรหัสกลุ่ม?
                </button>
              </div>
            )}

            {/* CREATE GROUP */}
            {appStep === 'create' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">สร้างกลุ่มใหม่ 🎉</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">ชื่อกลุ่ม</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="เช่น แก๊งออฟฟิศ, เพื่อนมหาลัย"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-medium focus:border-green-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl space-y-3">
                  <label className="block text-sm font-bold text-green-700 text-center">💰 งบประมาณ (บาท)</label>
                  <div className="flex items-center justify-center gap-4">
                    <BudgetStepper value={budgetMin} onChange={setBudgetMin} min={100} max={budgetMax - 100} />
                    <span className="text-gray-400 font-bold">→</span>
                    <BudgetStepper value={budgetMax} onChange={setBudgetMax} min={budgetMin + 100} max={10000} />
                  </div>
                  <p className="text-center text-xs text-gray-400">กด +/- เพื่อปรับทีละ 100 บาท</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setAppStep('landing')}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                  >
                    ← กลับ
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={isLoading}
                    className="flex-[2] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? '⏳ กำลังสร้าง...' : 'สร้างเลย! ✨'}
                  </button>
                </div>
              </div>
            )}

            {/* JOIN GROUP */}
            {appStep === 'join' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">เข้าร่วมกลุ่ม 🚪</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">รหัสกลุ่ม 6 หลัก</label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="w-full text-center text-3xl tracking-[0.3em] uppercase bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-700 font-bold focus:border-green-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setAppStep('landing')}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                  >
                    ← กลับ
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    disabled={isLoading || groupId.length < 6}
                    className="flex-[2] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? '⏳ กำลังหา...' : 'เข้าร่วม →'}
                  </button>
                </div>
              </div>
            )}

            {/* LOBBY */}
            {appStep === 'lobby' && (
              <div className="space-y-5">
                
                {/* Group Code */}
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(groupId);
                    setNotification('คัดลอกรหัสแล้ว!');
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-4 text-center cursor-pointer hover:from-red-600 hover:to-red-700 transition-all active:scale-[0.98]"
                >
                  <p className="text-red-100 text-xs mb-1">📢 แตะเพื่อคัดลอกรหัส</p>
                  <p className="text-3xl font-bold tracking-[0.2em] font-mono">{groupId}</p>
                </div>

                {/* Group Info */}
                <div className="text-center py-2">
                  <h2 className="text-xl font-bold text-gray-800">{groupName}</h2>
                  <p className="text-green-600 font-bold">💰 {budgetMin.toLocaleString()} - {budgetMax.toLocaleString()} บาท</p>
                </div>

                {/* My Info */}
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                  <label className="block text-sm font-bold text-gray-600">👤 ชื่อของคุณ</label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="ใส่ชื่อเล่นของคุณ"
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-medium focus:border-red-400 focus:outline-none"
                  />
                  
                  {/* Wishlist Toggle */}
                  {!showWishlistForm ? (
                    <button
                      onClick={() => setShowWishlistForm(true)}
                      className="text-sm text-green-600 font-bold hover:text-green-700 flex items-center gap-1"
                    >
                      ✉️ เขียนจดหมายถึง Santa →
                    </button>
                  ) : (
                    <div className="bg-white border-2 border-green-200 p-4 rounded-xl space-y-3 relative">
                      <button
                        onClick={() => setShowWishlistForm(false)}
                        className="absolute top-2 right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 flex items-center justify-center text-sm transition-colors"
                      >
                        ✕
                      </button>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🎁 Wishlist - อยากได้อะไร?</label>
                        <input
                          type="text"
                          value={wishlist}
                          onChange={(e) => { setWishlist(e.target.value); setWishlistSaved(false); }}
                          onBlur={() => { if (wishlist) setWishlistSaved(true); }}
                          placeholder="เช่น หนังสือ, ขนม, สกินแคร์"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🎨 งานอดิเรก</label>
                        <input
                          type="text"
                          value={hobby}
                          onChange={(e) => setHobby(e.target.value)}
                          placeholder="เช่น อ่านหนังสือ, ดูหนัง, เล่นเกม"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">💌 ข้อความถึง Santa</label>
                        <textarea
                          value={messageToSanta}
                          onChange={(e) => setMessageToSanta(e.target.value)}
                          placeholder="บอกอะไร Santa เพิ่มเติมได้นะ..."
                          rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none resize-none"
                        />
                      </div>
                      
                      {/* Auto-save indicator */}
                      {wishlistSaved && (
                        <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium bg-green-50 py-2 rounded-lg">
                          <span>✓</span> พร้อมส่งถึง Santa แล้ว!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Members */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-600">👥 สมาชิก ({lobbyParticipants.length} คน)</label>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="addMemberInput"
                      placeholder="พิมพ์ชื่อเพื่อน แล้วกด Enter"
                      className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleAddOtherMember(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('addMemberInput');
                        if (input.value.trim()) {
                          handleAddOtherMember(input.value);
                          input.value = '';
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-600 font-bold px-4 rounded-xl transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Members List - Always show delete button */}
                  <div className="flex flex-wrap gap-2">
                    {lobbyParticipants.map((p) => (
                      <span
                        key={p.id}
                        className="bg-gray-100 text-gray-700 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
                      >
                        {p.name}
                        {p.wishlist && <span className="text-green-500">🎁</span>}
                        <button
                          onClick={() => handleDeleteMember(p.id, p.name)}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {lobbyParticipants.length === 0 && (
                      <p className="text-gray-400 text-sm italic w-full text-center py-3">ยังไม่มีสมาชิก</p>
                    )}
                  </div>
                </div>

                {/* Join Button */}
                <button
                  onClick={handleJoinAsParticipant}
                  disabled={isLoading || !myName.trim()}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? '⏳ กำลังเข้า...' : '🎅 พร้อมจับฉลาก!'}
                </button>

                <button
                  onClick={() => setAppStep('landing')}
                  className="w-full text-gray-400 hover:text-gray-600 text-sm py-2"
                >
                  ← กลับหน้าแรก
                </button>
              </div>
            )}

            {/* DRAW */}
            {appStep === 'draw' && (
              <div className="space-y-5">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{groupName}</h2>
                    <p className="text-sm text-gray-500">สวัสดี <span className="text-red-500 font-bold">{myName}</span>!</p>
                  </div>
                  <div className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg text-sm">
                    💰 {budgetMin}-{budgetMax}฿
                  </div>
                </div>

                {/* Participants Grid - Santa Icons */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-bold text-gray-600 text-sm mb-3 text-center">👥 เพื่อนๆ ในกลุ่ม</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {participants.map((p) => (
                      <SantaIcon 
                        key={p.id} 
                        name={p.name} 
                        hasDrawn={p.has_drawn} 
                        isMe={p.id === myId}
                      />
                    ))}
                  </div>
                </div>

                {/* Already Drawn or Show Result Card */}
                {showResultCard && drawnResult ? (
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6 text-center animate-float">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-red-600 font-bold mb-2">คุณจับได้!</p>
                    <p className="text-3xl font-bold text-gray-800 mb-3">{drawnResult.name}</p>
                    {drawnResult.wishlist && (
                      <div className="bg-white rounded-xl p-3 text-sm text-gray-600 mb-3">
                        🎁 "{drawnResult.wishlist}"
                      </div>
                    )}
                    <button
                      onClick={() => setAppStep('result')}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-all"
                    >
                      ดูรายละเอียด →
                    </button>
                  </div>
                ) : hasAlreadyDrawn && myDrawResult ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                    <p className="text-green-600 font-bold mb-2">🎉 คุณจับได้แล้ว!</p>
                    <p className="text-3xl font-bold text-gray-800 mb-3">{myDrawResult.name}</p>
                    {myDrawResult.wishlist && (
                      <div className="bg-white rounded-xl p-3 text-sm text-gray-600 inline-block">
                        🎁 "{myDrawResult.wishlist}"
                      </div>
                    )}
                    <button
                      onClick={() => setAppStep('result')}
                      className="block w-full mt-4 text-green-600 font-bold hover:underline"
                    >
                      ดูรายละเอียด →
                    </button>
                  </div>
                ) : (
                  // Draw Button
                  <div className="py-8 text-center">
                    {participants.length < 2 ? (
                      <div className="text-gray-400">
                        <div className="text-4xl mb-2">🕐</div>
                        <p>รอเพื่อนเพิ่ม...</p>
                        <p className="text-xs">({participants.length}/2 คนขึ้นไป)</p>
                      </div>
                    ) : isDrawing ? (
                      <div className="space-y-4">
                        <div className="text-6xl animate-bounce">🎲</div>
                        <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-2xl font-bold py-4 px-8 rounded-2xl inline-block animate-pulse">
                          {drawnResult?.name || '...'}
                        </div>
                        <p className="text-gray-400 text-sm">กำลังสุ่ม...</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleDraw}
                        className="w-40 h-40 rounded-full font-bold text-xl text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 mx-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      >
                        <span className="text-4xl">🎁</span>
                        <span>จับเลย!</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Edit Profile */}
                {!isDrawing && (
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-gray-600 text-sm">✏️ แก้ไขข้อมูลของฉัน</h3>
                    <input
                      type="text"
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="🎁 Wishlist"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      placeholder="🎨 งานอดิเรก"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none"
                    />
                    <textarea
                      value={messageToSanta}
                      onChange={(e) => setMessageToSanta(e.target.value)}
                      placeholder="💌 ข้อความถึง Santa"
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:border-green-400 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleUpdateProfile}
                      disabled={saveStatus === 'saving'}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        saveStatus === 'saved'
                          ? 'bg-green-500 text-white'
                          : saveStatus === 'saving'
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                    >
                      {saveStatus === 'saving' && <span className="animate-spin">⏳</span>}
                      {saveStatus === 'saving' ? 'กำลังบันทึก...' : saveStatus === 'saved' ? '✅ บันทึกแล้ว!' : '💾 บันทึก'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RESULT */}
            {appStep === 'result' && myDrawResult && (
              <div className="text-center py-4 space-y-6">
                <div className="text-4xl">🎉</div>
                
                <div>
                  <p className="text-gray-500 mb-2">{myName} เป็น Secret Santa ให้...</p>
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-6 inline-block">
                    <p className="text-4xl font-bold">{myDrawResult.name}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    💰 งบ: {budgetMin}-{budgetMax} บาท
                  </div>
                  
                  {myDrawResult.wishlist && (
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-1">🎁 WISHLIST</p>
                      <p className="text-gray-700">{myDrawResult.wishlist}</p>
                    </div>
                  )}
                  
                  {myDrawResult.hobby && (
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-1">🎨 งานอดิเรก</p>
                      <p className="text-gray-700">{myDrawResult.hobby}</p>
                    </div>
                  )}
                  
                  {myDrawResult.message_to_santa && (
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-1">💌 ข้อความถึง Santa</p>
                      <p className="text-gray-700 italic">"{myDrawResult.message_to_santa}"</p>
                    </div>
                  )}
                </div>

                <p className="text-gray-400 text-sm">🤫 เก็บเป็นความลับนะ!</p>

                <button
                  onClick={() => setAppStep('draw')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>
            )}

          </div>

          {/* Footer */}
          <p className="text-center text-red-200 text-xs mt-6">
            Made with ❤️ for Christmas 🎄
          </p>
        </div>
      </div>
    </>
  );
}
