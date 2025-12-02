import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// Supabase Configuration
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  // App states
  const [appStep, setAppStep] = useState('landing');
  
  // Group states
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [budgetMin, setBudgetMin] = useState(300);
  const [budgetMax, setBudgetMax] = useState(500);
  const [eventDate, setEventDate] = useState('');
  
  // Participant states
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState(null);
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  
  // Game states
  const [participants, setParticipants] = useState([]);
  const [drawnResult, setDrawnResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [myDrawResult, setMyDrawResult] = useState(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', null
  
  // Lobby states
  const [lobbyParticipants, setLobbyParticipants] = useState([]);

  // Generate random group ID
  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Fetch lobby participants
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
      console.error('Fetch lobby error:', err);
    }
  }, [groupId]);

  // Real-time subscription for lobby
  useEffect(() => {
    if (!groupId || appStep !== 'lobby') return;
    
    fetchLobbyParticipants();
    
    const channel = supabase
      .channel('lobby-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchLobbyParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, appStep, fetchLobbyParticipants]);

  // Add other member
  const handleAddOtherMember = async (name) => {
    if (!name.trim()) return;
    
    try {
      const existing = lobbyParticipants.find(
        p => p.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existing) {
        setError('ชื่อนี้มีในกลุ่มแล้ว');
        return;
      }
      
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          group_id: groupId,
          name: name.trim(),
          has_drawn: false
        });

      if (insertError) throw insertError;
      setNotification(`เพิ่ม ${name} แล้ว!`);
    } catch (err) {
      setError('เพิ่มไม่สำเร็จ: ' + err.message);
    }
  };

  // Create new group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('กรุณาใส่ชื่อกลุ่ม');
      return;
    }
    
    try {
      setIsLoading(true);
      const newGroupId = generateGroupId();
      
      const { data, error: createError } = await supabase
        .from('groups')
        .insert({
          id: newGroupId,
          name: groupName,
          budget_min: budgetMin,
          budget_max: budgetMax,
          event_date: eventDate || null
        })
        .select()
        .single();

      if (createError) throw createError;
      
      setGroupId(newGroupId);
      setAppStep('lobby');
      setNotification(`สร้างกลุ่มสำเร็จ!`);
    } catch (err) {
      setError('สร้างกลุ่มไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Join existing group
  const handleJoinGroup = async () => {
    if (!groupId.trim()) {
      setError('กรุณาใส่รหัสกลุ่ม');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId.toUpperCase())
        .single();

      if (fetchError) throw new Error('ไม่พบกลุ่มนี้');
      
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

  // Add participant (self)
  const handleJoinAsParticipant = async () => {
    if (!myName.trim()) {
      setError('กรุณาใส่ชื่อของคุณ');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId)
        .eq('name', myName.trim());

      if (existing && existing.length > 0) {
        setMyId(existing[0].id);
        setWishlist(existing[0].wishlist || '');
        setHobby(existing[0].hobby || '');
        
        const { data: drawData } = await supabase
          .from('draws')
          .select('*, receiver:receiver_id(name, wishlist, hobby)')
          .eq('drawer_id', existing[0].id)
          .single();
          
        if (drawData) {
          setMyDrawResult(drawData.receiver);
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('participants')
          .insert({
            group_id: groupId,
            name: myName.trim(),
            wishlist: wishlist.trim() || null,
            hobby: hobby.trim() || null,
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

  // Update wishlist/hobby with better feedback
  const handleUpdateProfile = async () => {
    if (!myId) return;
    
    try {
      setSaveStatus('saving');
      
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          wishlist: wishlist.trim() || null,
          hobby: hobby.trim() || null
        })
        .eq('id', myId);

      if (updateError) throw updateError;
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setError('อัปเดตไม่สำเร็จ: ' + err.message);
      setSaveStatus(null);
    }
  };

  // Fetch participants
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

  // Real-time subscription for draw
  useEffect(() => {
    if (!groupId || appStep !== 'draw') return;
    
    fetchParticipants();
    
    const channel = supabase
      .channel('participants-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, appStep, fetchParticipants]);

  // Handle draw
  const handleDraw = async () => {
    setIsDrawing(true);
    
    const { data: draws } = await supabase
      .from('draws')
      .select('receiver_id')
      .eq('group_id', groupId);
    
    const takenIds = draws?.map(d => d.receiver_id) || [];
    const validReceivers = participants.filter(
      p => p.id !== myId && !takenIds.includes(p.id)
    );
    
    if (validReceivers.length === 0) {
      setError('ไม่มีคนให้จับแล้ว!');
      setIsDrawing(false);
      return;
    }

    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * validReceivers.length);
      setDrawnResult(validReceivers[randomIndex]);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const finalResult = validReceivers[Math.floor(Math.random() * validReceivers.length)];
        setDrawnResult(finalResult);
        setIsDrawing(false);
        saveDrawResult(finalResult);
      }
    }, 100);
  };

  // Save draw result
  const saveDrawResult = async (receiver) => {
    try {
      await supabase
        .from('draws')
        .insert({
          group_id: groupId,
          drawer_id: myId,
          receiver_id: receiver.id
        });

      await supabase
        .from('participants')
        .update({ has_drawn: true })
        .eq('id', myId);

      setMyDrawResult(receiver);
      setAppStep('result');
    } catch (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Derived states
  const pendingDraw = participants.filter(p => !p.has_drawn);
  const completedDraw = participants.filter(p => p.has_drawn);
  const pendingWishlist = participants.filter(p => !p.wishlist);
  const myParticipant = participants.find(p => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult;

  return (
    <>
      <Head>
        <title>🎄 Secret Santa</title>
        <meta name="description" content="จับฉลากแลกของขวัญ" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Subtle snow/stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 py-8 relative z-10 max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎁</div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Secret Santa
            </h1>
            <p className="text-purple-300">จับฉลากแลกของขวัญ</p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 animate-shake">
              <div className="bg-red-500/90 text-white px-4 py-3 rounded-2xl flex justify-between items-center">
                <span>❌ {error}</span>
                <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 rounded-full p-1">✕</button>
              </div>
            </div>
          )}

          {/* Notification */}
          {notification && (
            <div className="mb-4">
              <div className="bg-green-500/90 text-white px-4 py-3 rounded-2xl flex justify-between items-center">
                <span>✅ {notification}</span>
                <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded-full p-1">✕</button>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="space-y-4">
            
            {/* Landing */}
            {appStep === 'landing' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                <div className="text-center mb-8">
                  <p className="text-purple-200">เริ่มต้นจับฉลากกันเลย!</p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setAppStep('create')}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25"
                  >
                    ✨ สร้างกลุ่มใหม่
                  </button>
                  
                  <button
                    onClick={() => setAppStep('join')}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all border border-white/30 hover:border-white/50"
                  >
                    🚪 เข้าร่วมกลุ่ม
                  </button>
                </div>
              </div>
            )}

            {/* Create Group */}
            {appStep === 'create' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-6 text-center">✨ สร้างกลุ่มใหม่</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">ชื่อกลุ่ม</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="เช่น ออฟฟิศ, เพื่อนมหาลัย"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">💰 งบประมาณ (บาท)</label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white focus:outline-none focus:border-pink-400 transition-colors"
                      />
                      <span className="text-white/50">ถึง</span>
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white focus:outline-none focus:border-pink-400 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">📅 วันแลกของขวัญ (ไม่บังคับ)</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white focus:outline-none focus:border-pink-400 transition-colors"
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateGroup}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isLoading ? '⏳ กำลังสร้าง...' : '🎉 สร้างกลุ่ม'}
                  </button>
                  
                  <button
                    onClick={() => setAppStep('landing')}
                    className="w-full text-white/60 hover:text-white py-2 transition-colors"
                  >
                    ← กลับ
                  </button>
                </div>
              </div>
            )}

            {/* Join Group */}
            {appStep === 'join' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-6 text-center">🚪 เข้าร่วมกลุ่ม</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">รหัสกลุ่ม 6 หลัก</label>
                    <input
                      type="text"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                      className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/30 text-white text-center text-2xl tracking-[0.3em] uppercase placeholder-white/30 focus:outline-none focus:border-pink-400 transition-colors font-mono"
                    />
                  </div>
                  
                  <button
                    onClick={handleJoinGroup}
                    disabled={isLoading || groupId.length < 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isLoading ? '⏳ กำลังค้นหา...' : '🔍 เข้าร่วม'}
                  </button>
                  
                  <button
                    onClick={() => setAppStep('landing')}
                    className="w-full text-white/60 hover:text-white py-2 transition-colors"
                  >
                    ← กลับ
                  </button>
                </div>
              </div>
            )}

            {/* Lobby */}
            {appStep === 'lobby' && (
              <div className="space-y-4">
                {/* Group Code Card */}
                <div className="bg-gradient-to-r from-pink-500/80 to-rose-500/80 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                  <p className="text-pink-100 text-sm text-center mb-2">📢 แชร์รหัสนี้ให้เพื่อน</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-bold text-white tracking-[0.2em] font-mono">{groupId}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(groupId);
                        setNotification('คัดลอกรหัสแล้ว!');
                      }}
                      className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all hover:scale-105"
                      title="คัดลอก"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Group Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20 text-center">
                  <h2 className="text-xl font-bold text-white">{groupName}</h2>
                  <p className="text-emerald-400 font-medium mt-1">💰 งบ {budgetMin.toLocaleString()} - {budgetMax.toLocaleString()} บาท</p>
                </div>

                {/* Your Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20">
                  <h3 className="text-white font-semibold mb-4">👤 ข้อมูลของคุณ</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={myName}
                      onChange={(e) => setMyName(e.target.value)}
                      placeholder="ชื่อของคุณ *"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                    />
                    <input
                      type="text"
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="🎁 อยากได้อะไร? (Wishlist)"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                    />
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      placeholder="🎨 งานอดิเรก (ไม่บังคับ)"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>

                {/* Add Members */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20">
                  <h3 className="text-white font-semibold mb-3">👥 เพิ่มสมาชิก</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="newMemberInput"
                      placeholder="ชื่อสมาชิก"
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = document.getElementById('newMemberInput');
                          if (input.value.trim()) {
                            handleAddOtherMember(input.value.trim());
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('newMemberInput');
                        if (input.value.trim()) {
                          handleAddOtherMember(input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 rounded-xl transition-all"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-white/40 text-xs mt-2">💡 เพิ่มชื่อเพื่อน พวกเขาจะมากรอก Wishlist เองทีหลังได้</p>
                </div>

                {/* Members List */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-semibold">🎄 สมาชิก ({lobbyParticipants.length} คน)</h3>
                    <button onClick={fetchLobbyParticipants} className="text-white/50 hover:text-white text-sm">🔄</button>
                  </div>
                  
                  {lobbyParticipants.length === 0 ? (
                    <p className="text-white/40 text-center py-4">ยังไม่มีสมาชิก</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {lobbyParticipants.map((p) => (
                        <span key={p.id} className="bg-white/10 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5">
                          {p.name}
                          {p.wishlist && <span className="text-xs">🎁</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Join Button */}
                <button
                  onClick={handleJoinAsParticipant}
                  disabled={isLoading || !myName.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-emerald-500/25"
                >
                  {isLoading ? '⏳ กำลังเข้าร่วม...' : '🎄 เข้าร่วม & เริ่มจับฉลาก'}
                </button>
                
                <button
                  onClick={() => setAppStep('landing')}
                  className="w-full text-white/60 hover:text-white py-2 transition-colors"
                >
                  ← กลับ
                </button>
              </div>
            )}

            {/* Draw Screen */}
            {appStep === 'draw' && (
              <div className="space-y-4">
                {/* Group Info Bar */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-4 py-3 border border-white/20 flex justify-between items-center">
                  <div>
                    <span className="text-white font-medium">{groupName}</span>
                    <span className="text-white/50 ml-2 text-sm">#{groupId}</span>
                  </div>
                  <span className="text-emerald-400 font-medium text-sm">💰 {budgetMin}-{budgetMax}฿</span>
                </div>

                {/* Already Drawn Result */}
                {hasAlreadyDrawn && myDrawResult && (
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-lg rounded-3xl p-6 border border-emerald-500/30">
                    <div className="text-center">
                      <p className="text-emerald-300 text-sm mb-2">🎁 คุณเป็น Secret Santa ให้</p>
                      <p className="text-3xl font-bold text-white mb-3">{myDrawResult.name}</p>
                      {myDrawResult.wishlist && (
                        <div className="bg-white/10 rounded-xl px-4 py-2 inline-block">
                          <span className="text-white/80">Wishlist: {myDrawResult.wishlist}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Draw Section - Only show if not drawn */}
                {!hasAlreadyDrawn && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-white mb-1">🎯 จับฉลาก</h2>
                      <p className="text-white/60 text-sm">สวัสดี {myName}!</p>
                    </div>

                    {participants.length < 2 ? (
                      <div className="text-center py-6">
                        <p className="text-white/60">รอผู้เข้าร่วมเพิ่ม...</p>
                        <p className="text-white/40 text-sm mt-1">({participants.length}/2 คนขึ้นไป)</p>
                      </div>
                    ) : isDrawing ? (
                      <div className="text-center py-6">
                        <div className="text-5xl mb-4 animate-bounce">🎰</div>
                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-2xl font-bold py-4 px-8 rounded-2xl inline-block animate-pulse">
                          {drawnResult?.name || '???'}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDraw}
                        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-5 px-6 rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-pink-500/25 text-xl"
                      >
                        🎁 จับฉลากเลย!
                      </button>
                    )}
                  </div>
                )}

                {/* Participants Status */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20">
                  <h3 className="text-white font-semibold mb-4">📊 สถานะการจับฉลาก</h3>
                  
                  {/* Pending Draw */}
                  {pendingDraw.length > 0 && (
                    <div className="mb-4">
                      <p className="text-amber-400 text-sm mb-2">⏳ รอจับ ({pendingDraw.length} คน)</p>
                      <div className="flex flex-wrap gap-2">
                        {pendingDraw.map((p) => (
                          <span 
                            key={p.id} 
                            className={`px-3 py-1.5 rounded-full text-sm ${
                              p.id === myId 
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' 
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {p.name}
                            {!p.wishlist && <span className="ml-1 text-xs opacity-50">(ยังไม่ใส่ wishlist)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Completed Draw */}
                  {completedDraw.length > 0 && (
                    <div>
                      <p className="text-emerald-400 text-sm mb-2">✅ จับแล้ว ({completedDraw.length} คน)</p>
                      <div className="flex flex-wrap gap-2">
                        {completedDraw.map((p) => (
                          <span key={p.id} className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-sm">
                            {p.name} ✓
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Profile */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20">
                  <h3 className="text-white font-semibold mb-4">✏️ แก้ไขข้อมูลของคุณ</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="🎁 Wishlist ของคุณ"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                    />
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      placeholder="🎨 งานอดิเรก"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                    />
                    <button
                      onClick={handleUpdateProfile}
                      disabled={saveStatus === 'saving'}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                        saveStatus === 'saved'
                          ? 'bg-emerald-500 text-white'
                          : saveStatus === 'saving'
                          ? 'bg-white/20 text-white/50'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      {saveStatus === 'saving' ? '⏳ กำลังบันทึก...' : saveStatus === 'saved' ? '✅ บันทึกแล้ว!' : '💾 บันทึก'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result Screen */}
            {appStep === 'result' && myDrawResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-purple-300 mb-2">{myName} เป็น Secret Santa ให้...</p>
                
                <div className="my-6">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-1">
                    <div className="bg-slate-900 rounded-xl px-8 py-6">
                      <div className="text-4xl mb-2">🎁</div>
                      <div className="text-3xl font-bold text-white">
                        {myDrawResult.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
                  <p className="text-emerald-400 font-medium">💰 งบ: {budgetMin}-{budgetMax} บาท</p>
                  {myDrawResult.wishlist && (
                    <p className="text-white/80">🎁 Wishlist: {myDrawResult.wishlist}</p>
                  )}
                  {myDrawResult.hobby && (
                    <p className="text-white/60">🎨 งานอดิเรก: {myDrawResult.hobby}</p>
                  )}
                </div>
                
                <p className="text-white/50 mb-6 text-sm">🤫 เก็บเป็นความลับนะ!</p>
                
                <button
                  onClick={() => setAppStep('draw')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02]"
                >
                  ✓ กลับหน้าหลัก
                </button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-white/30 text-sm">
            Made with 🎄 for Secret Santa
          </div>
        </div>
      </div>
    </>
  );
}
