import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// Supabase Configuration (Logic เดิม 100%)
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  // --- STATE MANAGEMENT (คงเดิมตาม Logic เดิม) ---
  const [appStep, setAppStep] = useState('landing');
  
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [budgetMin, setBudgetMin] = useState(300);
  const [budgetMax, setBudgetMax] = useState(500);
  const [eventDate, setEventDate] = useState('');
  
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState(null);
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  
  const [participants, setParticipants] = useState([]);
  const [drawnResult, setDrawnResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [myDrawResult, setMyDrawResult] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [lobbyParticipants, setLobbyParticipants] = useState([]);

  // UI Helper States (New for UX improvement)
  const [showWishlistInput, setShowWishlistInput] = useState(false); // ซ่อน wishlist ก่อนเพื่อลด cognitive load

  // --- LOGIC FUNCTIONS (คงเดิม ไม่แตะต้อง DB) ---
  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

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

  useEffect(() => {
    if (!groupId || appStep !== 'lobby') return;
    fetchLobbyParticipants();
    const channel = supabase
      .channel('lobby-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, 
      () => fetchLobbyParticipants())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, appStep, fetchLobbyParticipants]);

  const handleAddOtherMember = async (name) => {
    if (!name.trim()) return;
    try {
      const existing = lobbyParticipants.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        setError('ชื่อนี้มีเพื่อนใช้ไปแล้วน้า 😅');
        return;
      }
      const { error: insertError } = await supabase.from('participants').insert({ group_id: groupId, name: name.trim(), has_drawn: false });
      if (insertError) throw insertError;
      setNotification(`เพิ่ม ${name} เข้าแก๊งแล้ว! 🎅`);
    } catch (err) {
      setError('อุ๊ย เพิ่มไม่ได้: ' + err.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setError('ตั้งชื่อแก๊งหน่อยสิครับ'); return; }
    try {
      setIsLoading(true);
      const newGroupId = generateGroupId();
      const { error: createError } = await supabase.from('groups').insert({ id: newGroupId, name: groupName, budget_min: budgetMin, budget_max: budgetMax, event_date: eventDate || null }).single();
      if (createError) throw createError;
      setGroupId(newGroupId);
      setAppStep('lobby');
      setNotification(`สร้างบ้านซานต้าสำเร็จ! 🏠`);
    } catch (err) { setError('สร้างไม่สำเร็จ: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleJoinGroup = async () => {
    if (!groupId.trim()) { setError('ขอรหัสผ่านเข้าบ้านหน่อยครับ'); return; }
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase.from('groups').select('*').eq('id', groupId.toUpperCase()).single();
      if (fetchError) throw new Error('ไม่เจอบ้านเลขที่นี้เลย 🥶');
      setGroupId(data.id);
      setGroupName(data.name);
      setBudgetMin(data.budget_min);
      setBudgetMax(data.budget_max);
      setEventDate(data.event_date);
      setAppStep('lobby');
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleJoinAsParticipant = async () => {
    if (!myName.trim()) { setError('บอกชื่อให้ซานต้ารู้หน่อยครับ'); return; }
    try {
      setIsLoading(true);
      const { data: existing } = await supabase.from('participants').select('*').eq('group_id', groupId).eq('name', myName.trim());
      if (existing && existing.length > 0) {
        setMyId(existing[0].id);
        setWishlist(existing[0].wishlist || '');
        setHobby(existing[0].hobby || '');
        const { data: drawData } = await supabase.from('draws').select('*, receiver:receiver_id(name, wishlist, hobby)').eq('drawer_id', existing[0].id).single();
        if (drawData) setMyDrawResult(drawData.receiver);
      } else {
        const { data, error: insertError } = await supabase.from('participants').insert({ group_id: groupId, name: myName.trim(), wishlist: wishlist.trim() || null, hobby: hobby.trim() || null, has_drawn: false }).select().single();
        if (insertError) throw insertError;
        setMyId(data.id);
      }
      setAppStep('draw');
    } catch (err) { setError('เข้าบ้านไม่สำเร็จ: ' + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateProfile = async () => {
    if (!myId) return;
    try {
      setSaveStatus('saving');
      const { error: updateError } = await supabase.from('participants').update({ wishlist: wishlist.trim() || null, hobby: hobby.trim() || null }).eq('id', myId);
      if (updateError) throw updateError;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) { setError('ส่งจดหมายไม่ผ่าน: ' + err.message); setSaveStatus(null); }
  };

  const fetchParticipants = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data, error: fetchError } = await supabase.from('participants').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setParticipants(data || []);
    } catch (err) { console.error('Fetch error:', err); }
  }, [groupId]);

  useEffect(() => {
    if (!groupId || appStep !== 'draw') return;
    fetchParticipants();
    const channel = supabase.channel('participants-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, () => fetchParticipants()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, appStep, fetchParticipants]);

  const handleDraw = async () => {
    setIsDrawing(true);
    const { data: draws } = await supabase.from('draws').select('receiver_id').eq('group_id', groupId);
    const takenIds = draws?.map(d => d.receiver_id) || [];
    const validReceivers = participants.filter(p => p.id !== myId && !takenIds.includes(p.id));
    if (validReceivers.length === 0) { setError('ของขวัญหมดเกลี้ยงแล้ว! (ไม่มีคนให้จับ)'); setIsDrawing(false); return; }
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

  const saveDrawResult = async (receiver) => {
    try {
      await supabase.from('draws').insert({ group_id: groupId, drawer_id: myId, receiver_id: receiver.id });
      await supabase.from('participants').update({ has_drawn: true }).eq('id', myId);
      setMyDrawResult(receiver);
      setAppStep('result');
    } catch (err) { setError('ระบบขัดข้อง: ' + err.message); }
  };

  // Helper Variables
  const myParticipant = participants.find(p => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult;

  // --- RENDER UI (New Cartoon Theme) ---
  return (
    <>
      <Head>
        <title>Secret Santa 🎅</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Background: Cozy Red Christmas Theme */}
      <div className="min-h-screen bg-[#D42426] relative font-['Nunito',_sans-serif] selection:bg-green-200">
        
        {/* Snow Effect (CSS only simplified) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
           <div className="absolute top-0 left-1/4 w-3 h-3 bg-white rounded-full animate-bounce delay-75"></div>
           <div className="absolute top-10 left-3/4 w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
           <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/50 rounded-full animate-pulse"></div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          
          {/* Header Area */}
          <div className="text-center mb-6 pt-4">
            <div className="inline-block bg-white p-4 rounded-full shadow-lg mb-4 border-4 border-green-500 transform hover:scale-110 transition-transform cursor-default">
              <span className="text-5xl">🎅</span>
            </div>
            <h1 className="text-3xl font-['Fredoka'] font-bold text-white drop-shadow-md">
              Secret Santa
            </h1>
            <p className="text-white/80 text-sm font-medium mt-1 bg-black/10 inline-block px-3 py-1 rounded-full">
              ภารกิจลับฉบับซานต้า
            </p>
          </div>

          {/* Toast Notification */}
          {(error || notification) && (
            <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce ${error ? 'bg-red-100 text-red-600 border-2 border-red-500' : 'bg-green-100 text-green-700 border-2 border-green-500'}`}>
              <span className="text-xl">{error ? '⛄️' : '🎁'}</span>
              <span className="font-bold">{error || notification}</span>
              <button onClick={() => {setError(null); setNotification(null)}} className="ml-2 opacity-50 hover:opacity-100">✕</button>
            </div>
          )}

          {/* --- MAIN CARD --- */}
          <div className="bg-[#FFF9F5] rounded-[2.5rem] p-6 shadow-2xl border-b-8 border-[#00000010] relative overflow-hidden">
            
            {/* Decorative Top */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

            {/* STEP: LANDING */}
            {appStep === 'landing' && (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-xl font-bold text-gray-700">ยินดีต้อนรับสู่ขั้วโลกเหนือ!</h2>
                  <p className="text-gray-500 text-sm">พร้อมจะแลกของขวัญกันหรือยัง?</p>
                </div>
                
                <button onClick={() => setAppStep('create')} className="w-full group relative bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] transition-all">
                  <span className="text-2xl mr-2">🏠</span> สร้างบ้านหลังใหม่
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full transform rotate-12 group-hover:rotate-0 transition-transform">New!</div>
                </button>

                <button onClick={() => setAppStep('join')} className="w-full bg-white border-2 border-gray-200 hover:border-green-400 text-gray-600 font-bold py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <span className="text-2xl mr-2">🔑</span> มีรหัสเข้าบ้านแล้ว
                </button>
              </div>
            )}

            {/* STEP: CREATE */}
            {appStep === 'create' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">สร้างบ้านปาร์ตี้ 🎉</h2>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-500 ml-2">ชื่อแก๊งของคุณ</label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="เช่น แก๊งออฟฟิศ, เพื่อน ม.6"
                    className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-green-400 focus:ring-0 rounded-2xl px-5 py-3 font-bold text-gray-700 placeholder-gray-400 transition-all"
                    autoFocus
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl space-y-3">
                  <label className="block text-sm font-bold text-blue-500 ml-1">💰 งบของขวัญ (บาท)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))} className="w-full text-center bg-white rounded-xl py-2 font-bold text-gray-700 shadow-sm border-none ring-1 ring-blue-100" />
                    <span className="text-gray-400 font-bold">-</span>
                    <input type="number" value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} className="w-full text-center bg-white rounded-xl py-2 font-bold text-gray-700 shadow-sm border-none ring-1 ring-blue-100" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAppStep('landing')} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl transition-colors">กลับ</button>
                  <button onClick={handleCreateGroup} disabled={isLoading} className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] transition-all">
                    {isLoading ? '🔨 กำลังสร้าง...' : 'สร้างเลย! ✨'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: JOIN */}
            {appStep === 'join' && (
              <div className="space-y-6 text-center">
                 <h2 className="text-xl font-bold text-gray-800">ขอรหัสผ่านหน่อยครับ 🚪</h2>
                 
                 <div className="relative">
                   <input 
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="XXXXXX"
                    className="w-full text-center text-4xl font-['Fredoka'] tracking-widest uppercase bg-gray-100 border-2 border-dashed border-gray-300 focus:border-green-500 rounded-2xl py-6 text-gray-700 focus:outline-none transition-colors"
                   />
                   <p className="text-xs text-gray-400 mt-2">รหัส 6 หลักที่เพื่อนส่งให้</p>
                 </div>

                 <div className="flex gap-3">
                  <button onClick={() => setAppStep('landing')} className="flex-1 bg-gray-200 text-gray-600 font-bold py-3 rounded-xl">กลับ</button>
                  <button onClick={handleJoinGroup} disabled={isLoading || groupId.length < 6} className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:shadow-none">
                    {isLoading ? '🔍 กำลังหา...' : 'เคาะประตู ✊'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: LOBBY (MAJOR REFACTOR FOR COGNITIVE LOAD) */}
            {appStep === 'lobby' && (
              <div className="space-y-6">
                
                {/* 1. Group Identity */}
                <div className="text-center">
                  <h2 className="text-2xl font-['Fredoka'] font-bold text-gray-800">{groupName}</h2>
                  <div 
                    onClick={() => {navigator.clipboard.writeText(groupId); setNotification('ก็อปปี้รหัสแล้ว!')}}
                    className="mt-2 inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-1.5 rounded-full font-mono font-bold cursor-pointer hover:bg-yellow-200 transition-colors"
                  >
                    {groupId} <span className="text-xs opacity-50">📋 แตะเพื่อคัดลอก</span>
                  </div>
                </div>

                {/* 2. My Identity (Focus here first) */}
                <div className="bg-white border-2 border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-100 text-red-500 p-1.5 rounded-lg text-lg">👤</span>
                    <label className="font-bold text-gray-700">คุณชื่ออะไร?</label>
                  </div>
                  <input 
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="ใส่ชื่อเล่นได้เลย..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all"
                  />
                  
                  {/* Progressive Disclosure: Wishlist */}
                  {!showWishlistInput ? (
                    <button onClick={() => setShowWishlistInput(true)} className="text-sm text-green-600 font-bold hover:underline flex items-center gap-1">
                      + เขียนจดหมายถึงซานต้า (Wishlist)
                    </button>
                  ) : (
                    <div className="space-y-2 animate-fadeIn bg-green-50 p-3 rounded-xl">
                      <input 
                        type="text" 
                        value={wishlist} 
                        onChange={e => setWishlist(e.target.value)} 
                        placeholder="🎁 อยากได้อะไรบอกใบ้หน่อย"
                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm text-gray-600 placeholder-green-300/70"
                      />
                      <input 
                        type="text" 
                        value={hobby} 
                        onChange={e => setHobby(e.target.value)} 
                        placeholder="🎨 งานอดิเรกที่ชอบ"
                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm text-gray-600 placeholder-green-300/70"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Friends List (Easy Add) */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-2">
                     <span className="text-sm font-bold text-gray-500">เพื่อนที่มาแล้ว ({lobbyParticipants.length})</span>
                     <span className="text-xs text-gray-400">ถ้าเพื่อนไม่สะดวก พิมพ์เพิ่มให้ได้นะ 👇</span>
                   </div>
                   
                   {/* Add Member Input with Enter key hint */}
                   <div className="relative group">
                      <input 
                        type="text"
                        id="quickAdd"
                        placeholder="พิมพ์ชื่อเพื่อน แล้วกด Enter ↵"
                        className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl pl-4 pr-10 py-3 text-sm focus:border-green-400 focus:ring-0 outline-none transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddOtherMember(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById('quickAdd');
                          handleAddOtherMember(input.value);
                          input.value = '';
                        }}
                        className="absolute right-2 top-2 bottom-2 bg-gray-100 hover:bg-green-100 text-gray-400 hover:text-green-600 px-3 rounded-lg transition-colors font-bold"
                      >
                        +
                      </button>
                   </div>

                   {/* Tags Cloud style for members */}
                   <div className="flex flex-wrap gap-2">
                     {lobbyParticipants.map(p => (
                       <span key={p.id} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                         {p.name}
                         {p.wishlist && <span className="text-xs text-green-500">🎁</span>}
                       </span>
                     ))}
                     {lobbyParticipants.length === 0 && <p className="text-gray-300 text-sm italic w-full text-center py-2">ยังไม่มีใครมาเลย...</p>}
                   </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button onClick={handleJoinAsParticipant} disabled={isLoading || !myName.trim()} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none">
                    {isLoading ? '⏳ กำลังบันทึก...' : '🎅 พร้อมแล้ว! เข้าไปจับฉลาก'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: DRAW */}
            {appStep === 'draw' && (
              <div className="space-y-6">
                {/* Info Header */}
                <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{groupName}</h2>
                    <p className="text-sm text-gray-500">สวัสดี, <span className="text-red-500 font-bold">{myName}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">งบประมาณ</div>
                    <div className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{budgetMin}-{budgetMax}฿</div>
                  </div>
                </div>

                {hasAlreadyDrawn && myDrawResult ? (
                  // ALREADY DRAWN CARD
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-3xl p-6 text-center space-y-4">
                    <p className="text-green-700 font-bold">🎉 คุณจับได้เพื่อนคนนี้แล้ว</p>
                    <div className="text-3xl font-bold text-gray-800">{myDrawResult.name}</div>
                    {myDrawResult.wishlist ? (
                      <div className="bg-white p-3 rounded-xl text-sm text-gray-600 shadow-sm inline-block">
                         🎁 "{myDrawResult.wishlist}"
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs">(เพื่อนไม่ได้ระบุ Wishlist)</p>
                    )}
                    <button onClick={() => setAppStep('result')} className="text-sm text-green-600 font-bold underline mt-2 block w-full">ดูรายละเอียดเต็มๆ</button>
                  </div>
                ) : (
                  // ACTION AREA
                  <div className="py-8 text-center">
                    {participants.length < 2 ? (
                      <div className="text-gray-400 space-y-2">
                        <div className="text-4xl opacity-50">😴</div>
                        <p>รอเพื่อนๆ แป๊บนึงนะ...</p>
                        <p className="text-xs">ต้องมีอย่างน้อย 2 คนถึงจะจับได้</p>
                      </div>
                    ) : (
                      <button 
                        onClick={handleDraw} 
                        disabled={isDrawing}
                        className={`w-48 h-48 rounded-full font-bold text-2xl text-white shadow-[0_10px_20px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 ${isDrawing ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        {isDrawing ? (
                          <>
                            <span className="animate-spin text-3xl">🎲</span>
                            <span className="text-base">{drawnResult?.name || '...'}</span>
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

                {/* Status Section */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-bold text-gray-600 mb-3 text-sm">สถานะเพื่อนๆ</h3>
                  <div className="flex flex-col gap-2">
                    {pendingDraw.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                        ยังไม่จับ: <span className="font-bold">{pendingDraw.map(p => p.name).join(', ')}</span>
                      </div>
                    )}
                     {completedDraw.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        จับแล้ว: <span className="font-bold">{completedDraw.length} คน</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Edit Profile Logic (Simplified) */}
                <div className="text-center">
                  <button onClick={() => { setAppStep('lobby'); setSaveStatus(null); }} className="text-gray-400 text-sm underline hover:text-gray-600">แก้ไขข้อมูลส่วนตัว</button>
                </div>
              </div>
            )}

            {/* STEP: RESULT (FINAL REVEAL) */}
            {appStep === 'result' && myDrawResult && (
              <div className="text-center py-6 space-y-6">
                
                <div className="relative inline-block">
                  <div className="absolute -top-6 -left-6 text-4xl animate-bounce delay-100">🎄</div>
                  <div className="absolute -top-6 -right-6 text-4xl animate-bounce delay-700">⭐</div>
                  
                  <div className="bg-red-600 text-white p-8 rounded-[2rem] shadow-xl rotate-1 transform">
                     <p className="text-red-100 text-sm mb-2 font-bold uppercase tracking-wider">Mission Target</p>
                     <h2 className="text-4xl font-['Fredoka'] font-bold mb-1">{myDrawResult.name}</h2>
                  </div>
                </div>

                <div className="space-y-4 px-4">
                   <div className="bg-yellow-50 border-2 border-yellow-100 rounded-2xl p-4 text-left">
                     <p className="text-yellow-700 font-bold text-xs uppercase mb-1">สิ่งที่อยากได้ (Wishlist)</p>
                     <p className="text-gray-700 font-bold text-lg">{myDrawResult.wishlist || 'ไม่ได้ระบุไว้... เซอร์ไพรส์เลย!'}</p>
                   </div>

                   {myDrawResult.hobby && (
                     <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-left">
                       <p className="text-blue-700 font-bold text-xs uppercase mb-1">งานอดิเรก</p>
                       <p className="text-gray-700">{myDrawResult.hobby}</p>
                     </div>
                   )}
                </div>

                <div className="pt-4">
                  <p className="text-gray-400 text-xs mb-4">🤫 จุ๊ๆ อย่าบอกใครนะ</p>
                  <button onClick={() => setAppStep('draw')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors">
                     กลับหน้าหลัก
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <p className="text-center text-red-800/40 text-xs mt-6 font-bold">
            Made with ❤️ for Christmas
          </p>

        </div>
      </div>
    </>
  );
}
