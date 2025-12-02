import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  // App State
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
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [showWishlistForm, setShowWishlistForm] = useState(false);

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

  // Create Group (FIXED BUG)
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

  // Add Other Member (with duplicate check)
  const handleAddOtherMember = async (name) => {
    if (!name.trim()) return;
    
    const trimmedName = name.trim();
    
    // Check duplicate with existing participants
    const isDuplicate = lobbyParticipants.some(
      p => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    // Check duplicate with my own name
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
    
    // Check if name already exists
    const isDuplicate = lobbyParticipants.some(
      p => p.name.toLowerCase() === myName.trim().toLowerCase()
    );
    
    try {
      setIsLoading(true);
      
      if (isDuplicate) {
        // Already exists - just log in as that person
        const existing = lobbyParticipants.find(
          p => p.name.toLowerCase() === myName.trim().toLowerCase()
        );
        setMyId(existing.id);
        setWishlist(existing.wishlist || '');
        setHobby(existing.hobby || '');
        setMessageToSanta(existing.message_to_santa || '');
        
        // Check if already drawn
        const { data: drawData } = await supabase
          .from('draws')
          .select('*, receiver:receiver_id(name, wishlist, hobby, message_to_santa)')
          .eq('drawer_id', existing.id)
          .single();
        if (drawData) setMyDrawResult(drawData.receiver);
      } else {
        // Create new participant
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
      setTimeout(() => setSaveStatus(null), 2000);
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

  // Handle Draw
  const handleDraw = async () => {
    setIsDrawing(true);
    
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

    // Animation
    let count = 0;
    const interval = setInterval(() => {
      setDrawnResult(validReceivers[Math.floor(Math.random() * validReceivers.length)]);
      count++;
      if (count > 20) {
        clearInterval(interval);
        const finalResult = validReceivers[Math.floor(Math.random() * validReceivers.length)];
        setDrawnResult(finalResult);
        setIsDrawing(false);
        saveDrawResult(finalResult);
      }
    }, 80);
  };

  // Save Draw Result
  const saveDrawResult = async (receiver) => {
    try {
      await supabase.from('draws').insert({ group_id: groupId, drawer_id: myId, receiver_id: receiver.id });
      await supabase.from('participants').update({ has_drawn: true }).eq('id', myId);
      setMyDrawResult(receiver);
      setAppStep('result');
    } catch (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Derived State
  const pendingDraw = participants.filter(p => !p.has_drawn);
  const completedDraw = participants.filter(p => p.has_drawn);
  const myParticipant = participants.find(p => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult;

  // Budget Step Component
  const BudgetStepper = ({ value, onChange, label }) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 100))}
        className="w-10 h-10 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:border-red-300 hover:text-red-500 transition-all active:scale-95"
      >
        −
      </button>
      <div className="flex-1 text-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="w-full text-center bg-gray-50 border-2 border-gray-200 rounded-xl py-2 font-bold text-gray-700 focus:border-red-400 focus:outline-none"
        />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 100)}
        className="w-10 h-10 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:border-green-300 hover:text-green-500 transition-all active:scale-95"
      >
        +
      </button>
    </div>
  );

  return (
    <>
      <Head>
        <title>Secret Santa 🎅</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-500 to-red-700 font-['Nunito'] selection:bg-green-300">
        
        {/* Snow particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.3s ease-in-out; }
        `}</style>

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
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            
            {/* LANDING */}
            {appStep === 'landing' && (
              <div className="space-y-4 py-4">
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

                <div className="bg-green-50 p-4 rounded-2xl space-y-4">
                  <label className="block text-sm font-bold text-green-700">💰 งบประมาณ (บาท)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <BudgetStepper value={budgetMin} onChange={setBudgetMin} label="ขั้นต่ำ" />
                    <BudgetStepper value={budgetMax} onChange={setBudgetMax} label="สูงสุด" />
                  </div>
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
                
                {/* Group Code - Tap to Copy */}
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
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg"
                      >
                        ✕
                      </button>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">🎁 Wishlist - อยากได้อะไร?</label>
                        <input
                          type="text"
                          value={wishlist}
                          onChange={(e) => setWishlist(e.target.value)}
                          placeholder="เช่น หนังสือ, ขนม, สกินแคร์"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">🎨 งานอดิเรก</label>
                        <input
                          type="text"
                          value={hobby}
                          onChange={(e) => setHobby(e.target.value)}
                          placeholder="เช่น อ่านหนังสือ, ดูหนัง, เล่นเกม"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">💌 ข้อความถึง Santa</label>
                        <textarea
                          value={messageToSanta}
                          onChange={(e) => setMessageToSanta(e.target.value)}
                          placeholder="บอกอะไร Santa เพิ่มเติมได้นะ..."
                          rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none resize-none"
                        />
                      </div>
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

                  {/* Members List with Delete */}
                  <div className="flex flex-wrap gap-2">
                    {lobbyParticipants.map((p) => (
                      <span
                        key={p.id}
                        className="bg-gray-100 text-gray-700 pl-3 pr-1 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 group"
                      >
                        {p.name}
                        {p.wishlist && <span className="text-green-500">🎁</span>}
                        <button
                          onClick={() => handleDeleteMember(p.id, p.name)}
                          className="ml-1 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs"
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

                {/* Already Drawn */}
                {hasAlreadyDrawn && myDrawResult ? (
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
                    ) : (
                      <button
                        onClick={handleDraw}
                        disabled={isDrawing}
                        className={`w-40 h-40 rounded-full font-bold text-xl text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 mx-auto ${
                          isDrawing ? 'bg-gray-300' : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        }`}
                      >
                        {isDrawing ? (
                          <>
                            <span className="text-4xl animate-bounce">🎲</span>
                            <span className="text-sm">{drawnResult?.name || '...'}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-4xl">🎁</span>
                            <span>จับเลย!</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-gray-600 text-sm">📊 สถานะ</h3>
                  
                  {pendingDraw.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="w-2 h-2 bg-amber-400 rounded-full mt-1.5"></span>
                      <div>
                        <span className="text-gray-500">รอจับ: </span>
                        <span className="text-gray-700 font-medium">{pendingDraw.map(p => p.name).join(', ')}</span>
                      </div>
                    </div>
                  )}
                  
                  {completedDraw.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-green-600 font-medium">จับแล้ว: {completedDraw.length} คน ✓</span>
                    </div>
                  )}
                </div>

                {/* Edit Profile */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-gray-600 text-sm">✏️ แก้ไขข้อมูล</h3>
                  <input
                    type="text"
                    value={wishlist}
                    onChange={(e) => setWishlist(e.target.value)}
                    placeholder="🎁 Wishlist"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={hobby}
                    onChange={(e) => setHobby(e.target.value)}
                    placeholder="🎨 งานอดิเรก"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none"
                  />
                  <textarea
                    value={messageToSanta}
                    onChange={(e) => setMessageToSanta(e.target.value)}
                    placeholder="💌 ข้อความถึง Santa"
                    rows={2}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm focus:border-green-400 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saveStatus === 'saving'}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      saveStatus === 'saved'
                        ? 'bg-green-500 text-white'
                        : saveStatus === 'saving'
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    }`}
                  >
                    {saveStatus === 'saving' ? '⏳ กำลังบันทึก...' : saveStatus === 'saved' ? '✅ บันทึกแล้ว!' : '💾 บันทึก'}
                  </button>
                </div>
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
