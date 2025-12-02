import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// Supabase Configuration
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// House Component with Chimney
const House = ({ name, hasDrawn, isSelected, onClick, index }) => {
  const roofColors = ['#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#c0392b', '#2c3e50'];
  const roofColor = roofColors[index % roofColors.length];
  
  return (
    <button
      onClick={onClick}
      disabled={hasDrawn}
      className={`relative transition-all duration-300 transform ${
        hasDrawn 
          ? 'opacity-50 cursor-not-allowed scale-95' 
          : 'hover:scale-110 hover:-translate-y-2 cursor-pointer'
      } ${isSelected ? 'scale-110 -translate-y-2' : ''}`}
    >
      {/* Smoke from chimney */}
      {!hasDrawn && (
        <div className="absolute -top-8 right-6 flex flex-col items-center">
          <div className="w-3 h-3 bg-gray-300 rounded-full animate-ping opacity-60"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mt-1 opacity-40"></div>
        </div>
      )}
      
      {/* Chimney */}
      <div className="absolute -top-4 right-4 w-6 h-8 bg-orange-800 rounded-t-sm"></div>
      
      {/* Roof */}
      <div 
        className="w-0 h-0 relative z-10"
        style={{
          borderLeft: '60px solid transparent',
          borderRight: '60px solid transparent',
          borderBottom: `50px solid ${roofColor}`,
        }}
      >
        {/* Snow on roof */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-white rounded-full opacity-90"></div>
      </div>
      
      {/* House body */}
      <div className="w-[120px] h-24 bg-amber-100 border-4 border-amber-200 relative">
        {/* Window */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-yellow-300 border-4 border-amber-600 rounded-sm">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
            <div className="bg-yellow-200"></div>
            <div className="bg-yellow-100"></div>
            <div className="bg-yellow-100"></div>
            <div className="bg-yellow-200"></div>
          </div>
          {/* Light glow */}
          {!hasDrawn && (
            <div className="absolute inset-0 bg-yellow-300 opacity-50 animate-pulse rounded-sm"></div>
          )}
        </div>
        
        {/* Door */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-12 bg-amber-700 rounded-t-lg border-2 border-amber-800">
          <div className="absolute top-4 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
          {/* Wreath */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-lg">🎄</div>
        </div>
      </div>
      
      {/* Snow on ground */}
      <div className="w-[130px] h-4 bg-white rounded-full -mt-1 mx-auto"></div>
      
      {/* Name tag */}
      <div className={`mt-2 text-center font-bold ${hasDrawn ? 'text-gray-400' : 'text-white'}`}>
        {name}
        {hasDrawn && <span className="ml-1">✓</span>}
      </div>
    </button>
  );
};

export default function Home() {
  // App states
  const [appStep, setAppStep] = useState('landing'); // landing, join, create, lobby, draw, result
  
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
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [drawnResult, setDrawnResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [myDrawResult, setMyDrawResult] = useState(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Generate random group ID
  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
      setNotification(`สร้างกลุ่มสำเร็จ! รหัสกลุ่ม: ${newGroupId}`);
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
      
      // Check if name already exists in group
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId)
        .eq('name', myName.trim());

      if (existing && existing.length > 0) {
        // Already joined, just set the ID
        setMyId(existing[0].id);
        setWishlist(existing[0].wishlist || '');
        setHobby(existing[0].hobby || '');
        
        // Check if already drawn
        const { data: drawData } = await supabase
          .from('draws')
          .select('*, receiver:receiver_id(name, wishlist, hobby)')
          .eq('drawer_id', existing[0].id)
          .single();
          
        if (drawData) {
          setMyDrawResult(drawData.receiver);
        }
      } else {
        // Create new participant
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

  // Update wishlist/hobby
  const handleUpdateProfile = async () => {
    if (!myId) return;
    
    try {
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          wishlist: wishlist.trim() || null,
          hobby: hobby.trim() || null
        })
        .eq('id', myId);

      if (updateError) throw updateError;
      setNotification('อัปเดตสำเร็จ!');
    } catch (err) {
      setError('อัปเดตไม่สำเร็จ: ' + err.message);
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

  // Real-time subscription
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
    
    // Get valid receivers (not self, not already received)
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

    // Animation
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
      // Save to draws table
      await supabase
        .from('draws')
        .insert({
          group_id: groupId,
          drawer_id: myId,
          receiver_id: receiver.id
        });

      // Update participant has_drawn
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

  // Snowflakes
  const snowflakes = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    fontSize: `${Math.random() * 20 + 10}px`,
    opacity: Math.random() * 0.5 + 0.3,
    animationDelay: `${Math.random() * 3}s`
  }));

  // Check notifications
  const pendingWishlist = participants.filter(p => !p.wishlist && p.id !== myId);
  const pendingDraw = participants.filter(p => !p.has_drawn);

  return (
    <>
      <Head>
        <title>🎄 Secret Santa</title>
        <meta name="description" content="จับฉลากแลกของขวัญ" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-indigo-800 relative overflow-hidden">
        {/* Stars */}
        {snowflakes.map((style, i) => (
          <div key={i} className="absolute text-white pointer-events-none animate-pulse" style={style}>
            {i % 3 === 0 ? '⭐' : '❄'}
          </div>
        ))}
        
        {/* Moon */}
        <div className="absolute top-10 right-10 text-6xl">🌙</div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎅</div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              🎄 Secret Santa Village 🎄
            </h1>
            <p className="text-blue-200 text-lg">หมู่บ้านซานต้า</p>
          </div>

          {/* Error display */}
          {error && (
            <div className="max-w-md mx-auto mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">
                {error}
                <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
              </div>
            </div>
          )}

          {/* Notification */}
          {notification && (
            <div className="max-w-md mx-auto mb-6">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-center">
                {notification}
                <button onClick={() => setNotification(null)} className="ml-2 font-bold">✕</button>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="max-w-2xl mx-auto">
            
            {/* Landing */}
            {appStep === 'landing' && (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
                <div className="text-5xl mb-6">🏠</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">ยินดีต้อนรับสู่หมู่บ้านซานต้า!</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setAppStep('create')}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    🏗️ สร้างกลุ่มใหม่
                  </button>
                  
                  <button
                    onClick={() => setAppStep('join')}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    🚪 เข้าร่วมกลุ่ม
                  </button>
                </div>
              </div>
            )}

            {/* Create Group */}
            {appStep === 'create' && (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">🏗️ สร้างกลุ่มใหม่</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">ชื่อกลุ่ม *</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="เช่น ออฟฟิศ, เพื่อนมหาลัย"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">💰 งบประมาณ (บาท) *</label>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(Number(e.target.value))}
                        placeholder="ขั้นต่ำ"
                        className="w-1/2 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
                      />
                      <span className="self-center text-gray-500">-</span>
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(Number(e.target.value))}
                        placeholder="สูงสุด"
                        className="w-1/2 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">📅 วันแลกของขวัญ</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateGroup}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? '⏳ กำลังสร้าง...' : '✨ สร้างกลุ่ม'}
                  </button>
                  
                  <button
                    onClick={() => setAppStep('landing')}
                    className="w-full text-gray-500 hover:text-gray-700 underline"
                  >
                    ← กลับ
                  </button>
                </div>
              </div>
            )}

            {/* Join Group */}
            {appStep === 'join' && (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">🚪 เข้าร่วมกลุ่ม</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">รหัสกลุ่ม</label>
                    <input
                      type="text"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                      placeholder="เช่น ABC123"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none text-center text-2xl tracking-widest uppercase"
                    />
                  </div>
                  
                  <button
                    onClick={handleJoinGroup}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? '⏳ กำลังค้นหา...' : '🔍 เข้าร่วม'}
                  </button>
                  
                  <button
                    onClick={() => setAppStep('landing')}
                    className="w-full text-gray-500 hover:text-gray-700 underline"
                  >
                    ← กลับ
                  </button>
                </div>
              </div>
            )}

            {/* Lobby - Enter name */}
            {appStep === 'lobby' && (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold mb-4">
                    รหัสกลุ่ม: {groupId}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{groupName}</h2>
                  <p className="text-green-600 font-bold mt-2">💰 งบ {budgetMin} - {budgetMax} บาท</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">ชื่อของคุณ *</label>
                    <input
                      type="text"
                      value={myName}
                      onChange={(e) => setMyName(e.target.value)}
                      placeholder="ใส่ชื่อเล่นของคุณ"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">🎁 Wishlist (ไม่บังคับ)</label>
                    <textarea
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="อยากได้อะไร? เช่น หนังสือ, ขนม, ของใช้..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">🎨 งานอดิเรก (ไม่บังคับ)</label>
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      placeholder="เช่น อ่านหนังสือ, เล่นเกม, ทำอาหาร"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleJoinAsParticipant}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? '⏳ กำลังเข้าร่วม...' : '🏠 เข้าหมู่บ้าน'}
                  </button>
                  
                  <button
                    onClick={() => setAppStep('landing')}
                    className="w-full text-gray-500 hover:text-gray-700 underline"
                  >
                    ← กลับ
                  </button>
                </div>
              </div>
            )}

            {/* Draw - Village View */}
            {appStep === 'draw' && (
              <div>
                {/* Group info bar */}
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mb-6 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <span className="text-white font-bold">{groupName}</span>
                    <span className="text-blue-200 ml-2">#{groupId}</span>
                  </div>
                  <div className="text-yellow-300 font-bold">💰 {budgetMin}-{budgetMax} บาท</div>
                </div>

                {/* Notifications */}
                {pendingWishlist.length > 0 && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
                    ⚠️ {pendingWishlist.length} คนยังไม่ใส่ Wishlist: {pendingWishlist.map(p => p.name).join(', ')}
                  </div>
                )}
                
                {pendingDraw.length > 0 && participants.length > 1 && (
                  <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-2 rounded-lg mb-4 text-sm">
                    🎯 รอจับฉลาก: {pendingDraw.map(p => p.name).join(', ')}
                  </div>
                )}

                {/* Already drawn */}
                {myDrawResult && (
                  <div className="bg-white/95 backdrop-blur rounded-3xl p-6 shadow-2xl text-center mb-6">
                    <div className="text-4xl mb-2">🎁</div>
                    <p className="text-gray-600 mb-2">คุณเป็น Secret Santa ให้</p>
                    <p className="text-2xl font-bold text-green-600">{myDrawResult.name}</p>
                    {myDrawResult.wishlist && (
                      <p className="text-gray-500 mt-2">💝 Wishlist: {myDrawResult.wishlist}</p>
                    )}
                    {myDrawResult.hobby && (
                      <p className="text-gray-400">🎨 งานอดิเรก: {myDrawResult.hobby}</p>
                    )}
                  </div>
                )}

                {/* Village */}
                {!myDrawResult && (
                  <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800">🏘️ เลือกบ้านของคุณเพื่อจับฉลาก</h2>
                      <p className="text-gray-500 text-sm">สวัสดี {myName}! กดที่บ้านของคุณ</p>
                    </div>

                    {participants.length < 2 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🏠</div>
                        <p className="text-gray-500">รอผู้เข้าร่วมเพิ่ม... ({participants.length}/2 คนขึ้นไป)</p>
                        <p className="text-gray-400 text-sm mt-2">แชร์รหัส <span className="font-bold">{groupId}</span> ให้เพื่อน</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-6">
                        {participants.map((p, i) => (
                          <House
                            key={p.id}
                            name={p.name}
                            hasDrawn={p.has_drawn}
                            isSelected={selectedPerson?.id === p.id}
                            index={i}
                            onClick={() => {
                              if (p.id === myId && !p.has_drawn) {
                                setSelectedPerson(p);
                              } else if (p.id !== myId) {
                                setNotification('กดได้เฉพาะบ้านของตัวเองนะ!');
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Draw button */}
                    {selectedPerson && !isDrawing && (
                      <div className="text-center mt-8">
                        <button
                          onClick={handleDraw}
                          className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:via-red-700 hover:to-red-600 text-white font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-110 shadow-xl animate-pulse"
                        >
                          🎄 จับฉลากเลย! 🎄
                        </button>
                      </div>
                    )}

                    {/* Drawing animation */}
                    {isDrawing && (
                      <div className="text-center mt-8">
                        <div className="text-6xl animate-bounce mb-4">🎰</div>
                        <div className="bg-gradient-to-r from-red-500 to-green-500 text-white text-3xl font-bold py-4 px-8 rounded-2xl inline-block animate-pulse">
                          {drawnResult?.name || '???'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Update profile */}
                <div className="bg-white/95 backdrop-blur rounded-3xl p-6 shadow-2xl mt-6">
                  <h3 className="font-bold text-gray-800 mb-4">✏️ แก้ไขข้อมูลของคุณ</h3>
                  <div className="space-y-3">
                    <textarea
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                      placeholder="🎁 Wishlist ของคุณ"
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      placeholder="🎨 งานอดิเรก"
                      className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={handleUpdateProfile}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm"
                    >
                      💾 บันทึก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {appStep === 'result' && myDrawResult && (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl text-gray-600 mb-2">{myName} คุณจะเป็น Secret Santa ให้กับ...</h2>
                
                <div className="my-8">
                  <div className="inline-block bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-1 rounded-2xl">
                    <div className="bg-white rounded-xl px-12 py-6">
                      <div className="text-4xl mb-2">🎁</div>
                      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600">
                        {myDrawResult.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-green-600 font-bold mb-2">💰 งบ: {budgetMin}-{budgetMax} บาท</p>
                  {myDrawResult.wishlist && (
                    <p className="text-gray-600">💝 Wishlist: {myDrawResult.wishlist}</p>
                  )}
                  {myDrawResult.hobby && (
                    <p className="text-gray-500">🎨 งานอดิเรก: {myDrawResult.hobby}</p>
                  )}
                </div>
                
                <p className="text-gray-500 mb-6 text-sm">🤫 เก็บเป็นความลับนะ!</p>
                
                <button
                  onClick={() => setAppStep('draw')}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-12 rounded-full text-lg transition-all transform hover:scale-105 shadow-xl"
                >
                  ✓ กลับหมู่บ้าน
                </button>
              </div>
            )}

          </div>

          {/* Footer village */}
          <div className="fixed bottom-0 left-0 w-full pointer-events-none">
            <div className="flex justify-center items-end gap-4 pb-2">
              <div className="text-3xl">🌲</div>
              <div className="text-4xl">🏠</div>
              <div className="text-3xl">🌲</div>
              <div className="text-5xl">⛪</div>
              <div className="text-3xl">🌲</div>
              <div className="text-4xl">🏠</div>
              <div className="text-3xl">🌲</div>
            </div>
            {/* Snow ground */}
            <div className="h-4 bg-white/80"></div>
          </div>
        </div>
      </div>
    </>
  );
}
