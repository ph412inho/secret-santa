// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- CONFIG ---
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CSS ---
const styles = `
  .flip-x { transform: scaleX(-1); }
  .no-float { transform: none !important; animation: none !important; }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }
  .animate-landing-float { animation: float-slow 4s ease-in-out infinite; }
`;

// --- COMPONENTS ---

const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(-10);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 110) {
          clearInterval(timer);
          setIsFinished(true);
          setTimeout(onComplete, 500);
          return 110;
        }
        return prev + 1.5;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFinished ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      <div className="relative mb-8 w-full h-20 overflow-hidden max-w-sm">
        <div
          className="absolute top-0 transition-all duration-75 ease-linear will-change-transform"
          style={{ left: `${progress}%` }}
        >
          <div className="text-5xl whitespace-nowrap filter drop-shadow-lg flip-x">
            🎅🛷🦌🦌
          </div>
        </div>
      </div>
      <p className="text-white/80 mt-12 text-sm font-medium animate-pulse">
        กำลังเดินทางไปบ้านซานต้า...
      </p>
    </div>
  );
};

// Santa Icon with Status
const SantaIcon = ({
  name,
  hasDrawn,
  isMe,
  isSelected,
  onClick,
  selectable = false,
}) => (
  <div
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative
      ${selectable ? 'cursor-pointer border-2' : ''}
      ${
        isSelected
          ? 'bg-red-50 border-red-500 scale-105 shadow-md'
          : 'border-transparent hover:bg-gray-50'
      }
      ${isMe && !selectable ? 'bg-red-50 ring-2 ring-red-200 scale-105' : ''}
      ${hasDrawn && selectable ? 'opacity-50 grayscale-[0.5]' : ''} 
    `}
  >
    <div className="relative">
      <div className="text-4xl transition-all">🎅</div>
      {hasDrawn && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-green-100">
          <span className="text-xs text-green-500 font-bold">✓</span>
        </div>
      )}
    </div>

    <span
      className={`text-xs font-bold truncate max-w-[70px] ${
        isSelected
          ? 'text-red-600'
          : hasDrawn
          ? 'text-green-700'
          : 'text-gray-500'
      }`}
    >
      {name}
    </span>

    {hasDrawn && (
      <span className="text-[9px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full font-bold shadow-sm mt-0.5">
        จับแล้ว
      </span>
    )}
  </div>
);

// Recovery Modal
const RecoveryModal = ({ isOpen, onClose, onRecover }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from('groups')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
          🔍 ค้นหากลุ่ม
        </h3>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 mb-1">
              พิมพ์ชื่อกลุ่ม
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-red-400 focus:outline-none"
              placeholder="เช่น แก๊งออฟฟิศ..."
            />
            {isSearching && (
              <div className="absolute right-3 top-9 text-xs text-gray-400">
                ⏳
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                {searchResults.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => onRecover(group)}
                    className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <p className="font-bold text-gray-700 text-sm">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-400">Code: {group.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {searchResults.length === 0 &&
            searchTerm.length > 2 &&
            !isSearching && (
              <p className="text-center text-gray-400 text-sm italic">
                ไม่พบกลุ่มชื่อนี้
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

// Edit Profile Modal
const EditProfileModal = ({ isOpen, onClose, initialData, onSave }) => {
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWishlist(initialData.wishlist || '');
      setHobby(initialData.hobby || '');
      setMessage(initialData.message || '');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
          ✏️ แก้ไขข้อมูลส่วนตัว
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              🎁 Wishlist
            </label>
            <input
              type="text"
              value={wishlist}
              onChange={(e) => setWishlist(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              🎨 งานอดิเรก
            </label>
            <input
              type="text"
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              💌 ฝากบอก Santa
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-red-400 focus:outline-none"
            />
          </div>
          <button
            onClick={async () => {
              setIsSaving(true);
              await onSave({
                wishlist,
                hobby,
                message_to_santa: message,
              });
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

// Budget stepper
const BudgetStepper = ({ value, onChange, min, max }) => {
  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const clamped = Math.max(min, Math.min(max, num));
    onChange(clamped);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white border-2 border-gray-100 rounded-2xl px-2 py-2 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 100))}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>

        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="w-16 text-center font-bold text-gray-700 text-lg bg-transparent border-none focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 100))}
          disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-xl text-green-500 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function Home() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [appStep, setAppStep] = useState('landing');

  // Data States
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [budgetMin, setBudgetMin] = useState(300);
  const [budgetMax, setBudgetMax] = useState(700);
  const [eventDate, setEventDate] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState('');
  const [wishlist, setWishlist] = useState('');
  const [hobby, setHobby] = useState('');
  const [messageToSanta, setMessageToSanta] = useState('');

  const [participants, setParticipants] = useState([]);
  const [drawnResult, setDrawnResult] = useState(null);
  const [myDrawResult, setMyDrawResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);

  // Selection State
  const [selectedIdentity, setSelectedIdentity] = useState(null);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // --- UTILS & EFFECTS ---
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const generateGroupId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  };

  const fetchParticipants = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    setParticipants(data || []);
  }, [groupId]);

  const checkGameStatus = useCallback(async () => {
    if (!groupId) return;
    const { count } = await supabase
      .from('draws')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    setGameStarted((count || 0) > 0);
  }, [groupId]);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (data) {
      setEventDate(data.event_date || '');
      setBudgetMin(data.budget_min);
      setBudgetMax(data.budget_max);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId || (appStep !== 'lobby' && appStep !== 'draw')) return;
    fetchParticipants();
    fetchGroupDetails();
    checkGameStatus();

    const channel = supabase
      .channel('group-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `group_id=eq.${groupId}`,
        },
        fetchParticipants
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draws',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchParticipants();
          checkGameStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    groupId,
    appStep,
    fetchParticipants,
    fetchGroupDetails,
    checkGameStatus,
  ]);

  // --- ACTIONS ---

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('ตั้งชื่อกลุ่มก่อนนะ!');
      return;
    }
    try {
      setIsLoading(true);
      const newGroupId = generateGroupId();
      const { error: createError } = await supabase
        .from('groups')
        .insert({
          id: newGroupId,
          name: groupName.trim(),
          budget_min: budgetMin,
          budget_max: budgetMax,
          event_date: eventDate || null,
        })
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

  const handleJoinGroup = async () => {
    if (!groupId.trim() || groupId.length < 6) {
      setError('รหัส 6 หลักนะ');
      return;
    }
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId.toUpperCase())
        .single();
      if (fetchError) throw new Error('ไม่เจอกลุ่มนี้');
      setGroupId(data.id);
      setGroupName(data.name);
      setBudgetMin(data.budget_min);
      setBudgetMax(data.budget_max);
      setEventDate(data.event_date || '');
      setAppStep('lobby');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewMember = async () => {
    if (!newMemberName.trim()) return;
    const trimmedName = newMemberName.trim();
    if (
      participants.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError(`"${trimmedName}" มีในกลุ่มแล้ว!`);
      return;
    }
    const { error } = await supabase.from('participants').insert({
      group_id: groupId,
      name: trimmedName,
      has_drawn: false,
    });
    if (error) {
      setError('เพิ่มไม่ได้: ' + error.message);
    } else {
      setNewMemberName('');
    }
  };

  const handleUpdateGroupDate = async (newDate) => {
    if (!groupId) return;
    setEventDate(newDate || '');
    try {
      await supabase
        .from('groups')
        .update({ event_date: newDate || null })
        .eq('id', groupId);
    } catch (err) {
      setError('อัปเดตวันที่ไม่สำเร็จ');
    }
  };

  const handleConfirmIdentity = async () => {
    if (!selectedIdentity || !groupId) return;
    setIsLoading(true);
    setError(null);

    try {
      const currentUserId = selectedIdentity.id;

      setMyId(currentUserId);
      setMyName(selectedIdentity.name);
      setWishlist(selectedIdentity.wishlist || '');
      setHobby(selectedIdentity.hobby || '');
      setMessageToSanta(selectedIdentity.message_to_santa || '');

      const { data: drawData, error: drawError } = await supabase
        .from('draws')
        .select('receiver:receiver_id(*)')
        .eq('group_id', groupId)
        .eq('drawer_id', currentUserId)
        .maybeSingle();

      if (drawError && drawError.code !== 'PGRST116') {
        console.error(drawError);
        throw drawError;
      }

      if (drawData && drawData.receiver) {
        setMyDrawResult(drawData.receiver);
        setShowResultCard(true);
      } else {
        setMyDrawResult(null);
        setShowResultCard(false);
      }

      setAppStep('draw');
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (newData) => {
    if (!myId) return;
    setWishlist(newData.wishlist);
    setHobby(newData.hobby);
    setMessageToSanta(newData.message_to_santa);
    await supabase.from('participants').update(newData).eq('id', myId);
    setNotification('บันทึกข้อมูลแล้ว! ✅');
  };

  const handleDraw = async () => {
    if (!myId || !groupId) return;

    const me = participants.find((p) => p.id === myId);
    if (isDrawing) return;
    if (myDrawResult || me?.has_drawn) {
      setError('คุณจับฉลากไปแล้วนะ!');
      return;
    }

    setIsDrawing(true);
    setShowResultCard(false);
    setError(null);

    try {
      const { data: existingDraw, error: existingError } = await supabase
        .from('draws')
        .select('receiver:receiver_id(*)')
        .eq('group_id', groupId)
        .eq('drawer_id', myId)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existingDraw && existingDraw.receiver) {
        setMyDrawResult(existingDraw.receiver);
        setShowResultCard(true);
        setIsDrawing(false);
        setNotification('คุณจับฉลากไปแล้วนะ ✅');
        return;
      }

      const [
        { data: latestParticipants, error: partError },
        { data: drawsData, error: drawsError },
      ] = await Promise.all([
        supabase.from('participants').select('*').eq('group_id', groupId),
        supabase.from('draws').select('receiver_id').eq('group_id', groupId),
      ]);

      if (partError) throw partError;
      if (drawsError) throw drawsError;

      const safeParticipants = latestParticipants || [];
      setParticipants(safeParticipants);

      const takenIds = (drawsData || []).map((d) => d.receiver_id);
      const validReceivers = safeParticipants.filter(
        (p) => p.id !== myId && !takenIds.includes(p.id)
      );

      if (validReceivers.length === 0) {
        setError('ของขวัญหมดแล้ว! ทุกคนมีคนจับให้แล้ว');
        setIsDrawing(false);
        return;
      }

      const finalResult =
        validReceivers[Math.floor(Math.random() * validReceivers.length)];

      let count = 0;
      const interval = setInterval(() => {
        setDrawnResult(
          validReceivers[Math.floor(Math.random() * validReceivers.length)]
        );
        count++;

        if (count > 25) {
          clearInterval(interval);
          setDrawnResult(finalResult);

          (async () => {
            try {
              const { error: insertError } = await supabase
                .from('draws')
                .insert({
                  group_id: groupId,
                  drawer_id: myId,
                  receiver_id: finalResult.id,
                })
                .single();

              if (insertError) {
                if (insertError.code === '23505') {
                  const { data: existingAgain } = await supabase
                    .from('draws')
                    .select('receiver:receiver_id(*)')
                    .eq('group_id', groupId)
                    .eq('drawer_id', myId)
                    .maybeSingle();
                  if (existingAgain && existingAgain.receiver) {
                    setMyDrawResult(existingAgain.receiver);
                    setShowResultCard(true);
                    return;
                  }
                }
                throw insertError;
              }

              const { error: updateError } = await supabase
                .from('participants')
                .update({ has_drawn: true })
                .eq('id', myId);

              if (updateError) throw updateError;

              setParticipants((prev) =>
                prev.map((p) =>
                  p.id === myId ? { ...p, has_drawn: true } : p
                )
              );

              setMyDrawResult(finalResult);
              setShowResultCard(true);
            } catch (err) {
              console.error(err);
              setError('บันทึกผลไม่สำเร็จ ลองใหม่อีกครั้ง');
            } finally {
              setIsDrawing(false);
            }
          })();
        }
      }, 80);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการจับฉลาก');
      setIsDrawing(false);
    }
  };

  const myParticipant = participants.find((p) => p.id === myId);
  const hasAlreadyDrawn = myParticipant?.has_drawn || myDrawResult !== null;
  const drawnCount = participants.filter((p) => p.has_drawn).length;
  const totalCount = participants.length;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

  if (isInitialLoading) {
    return <LoadingScreen onComplete={() => setIsInitialLoading(false)} />;
  }

  return (
    <>
      <Head>
        <title>Secret Santa 🎅</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-500 to-red-700 font-['Nunito'] relative selection:bg-green-200 pb-20">
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-40 animate-pulse"
              style={{
                width: Math.random() * 6 + 2,
                height: Math.random() * 6 + 2,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <RecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          onRecover={(g) => {
            setGroupId(g.id);
            setGroupName(g.name);
            setBudgetMin(g.budget_min);
            setBudgetMax(g.budget_max);
            setEventDate(g.event_date);
            setShowRecoveryModal(false);
            setAppStep('lobby');
            setNotification('ยินดีต้อนรับกลับ! 🎉');
          }}
        />

        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          initialData={{ wishlist, hobby, message: messageToSanta }}
          onSave={handleUpdateProfile}
        />

        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          <div className="text-center mb-6">
            <div className="inline-block bg-white p-3 rounded-full shadow-lg border-4 border-green-500 mb-2">
              <span className="text-4xl">🎅</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-md">
              Secret Santa
            </h1>
          </div>

          {(error || notification) && (
            <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 animate-bounce">
              <div
                className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-sm w-full ${
                  error
                    ? 'bg-white border-l-4 border-red-500'
                    : 'bg-white border-l-4 border-green-500'
                }`}
              >
                <span className="text-xl">{error ? '😅' : '🎁'}</span>
                <span className="text-gray-700 font-medium text-sm flex-1">
                  {error || notification}
                </span>
              </div>
            </div>
          )}

          <div
            className={`bg-white rounded-3xl p-6 shadow-2xl relative ${
              appStep === 'landing' ? 'animate-landing-float' : 'no-float'
            }`}
          >
            {appStep === 'landing' && (
              <div className="space-y-4 py-4 text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  ยินดีต้อนรับ! 🎄
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  มาจับฉลากแลกของขวัญกันเถอะ
                </p>
                <button
                  onClick={() => setAppStep('create')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  🏠 สร้างกลุ่มใหม่
                </button>
                <button
                  onClick={() => setAppStep('join')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-colors"
                >
                  🔑 มีรหัสกลุ่มแล้ว
                </button>
                <button
                  onClick={() => setShowRecoveryModal(true)}
                  className="text-gray-400 text-sm underline pt-2"
                >
                  ลืมรหัสกลุ่ม?
                </button>
              </div>
            )}

            {appStep === 'create' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-800 text-center">
                  สร้างกลุ่มใหม่ 🎉
                </h2>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">
                    ชื่อกลุ่ม
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="เช่น แก๊งออฟฟิศ"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-bold focus:border-green-400 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">
                    📅 วันที่แลกของ (ไม่ระบุก็ได้)
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:border-green-400 focus:outline-none"
                  />
                </div>
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                  <label className="block text-sm font-bold text-green-700 text-center mb-3">
                    💰 งบประมาณ (บาท)
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <BudgetStepper
                      value={budgetMin}
                      onChange={setBudgetMin}
                      min={0}
                      max={budgetMax - 100}
                    />
                    <span className="text-gray-300 font-bold">→</span>
                    <BudgetStepper
                      value={budgetMax}
                      onChange={setBudgetMax}
                      min={budgetMin + 100}
                      max={100000}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setAppStep('landing')}
                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
                  >
                    กลับ
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={isLoading}
                    className="flex-[2] bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg"
                  >
                    {isLoading ? '⏳ ...' : 'สร้างเลย! ✨'}
                  </button>
                </div>
              </div>
            )}

            {appStep === 'join' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-800 text-center">
                  เข้าร่วมกลุ่ม 🚪
                </h2>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">
                    รหัส 6 หลัก
                  </label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) =>
                      setGroupId(e.target.value.toUpperCase())
                    }
                    maxLength={6}
                    placeholder="XXXXXX"
                    className="w-full text-center text-3xl tracking-widest uppercase bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-700 font-bold focus:border-green-400 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAppStep('landing')}
                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
                  >
                    กลับ
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    disabled={isLoading || groupId.length < 6}
                    className="flex-[2] bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? '⏳ ...' : 'เข้าร่วม →'}
                  </button>
                </div>
              </div>
            )}

            {appStep === 'lobby' && (
              <div className="space-y-6">
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(groupId);
                    setNotification('คัดลอกรหัสแล้ว!');
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-4 text-center cursor-pointer shadow-lg active:scale-95 transition-transform"
                >
                  <p className="text-red-100 text-xs mb-1">
                    📢 แตะเพื่อคัดลอกรหัส
                  </p>
                  <p className="text-4xl font-bold tracking-[0.2em] font-mono">
                    {groupId}
                  </p>
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    {groupName}
                  </h2>
                  <div className="flex items-center justify-center gap-3 mt-1 text-sm font-bold">
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      💰 {budgetMin}-{budgetMax}฿
                    </span>
                    <div className="relative group">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) =>
                          handleUpdateGroupDate(e.target.value)
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span
                        className={`px-2 py-1 rounded-lg flex items-center gap-1 ${
                          eventDate
                            ? 'text-red-600 bg-red-50'
                            : 'text-gray-400 bg-gray-100 border border-dashed border-gray-300'
                        }`}
                      >
                        📅 {eventDate ? formatDate(eventDate) : 'นัดวัน?'}
                        <span className="text-[10px] opacity-50">✎</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <h3 className="text-center text-gray-600 font-bold mb-4">
                    👇 คุณคือคนไหน? (จิ้มเลย)
                  </h3>

                  <div className="flex flex-wrap justify-center gap-4">
                    {participants.map((p) => (
                      <SantaIcon
                        key={p.id}
                        name={p.name}
                        hasDrawn={p.has_drawn}
                        selectable={true}
                        isSelected={selectedIdentity?.id === p.id}
                        isMe={false}
                        onClick={() => setSelectedIdentity(p)}
                      />
                    ))}
                    {participants.length === 0 && (
                      <p className="text-gray-300 text-sm italic py-4">
                        ยังไม่มีสมาชิก
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-2 border-t border-gray-200">
                    <button
                      disabled={!selectedIdentity || isLoading}
                      onClick={handleConfirmIdentity}
                      className={`w-full font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none ${
                        selectedIdentity
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isLoading
                        ? '⏳ กำลังเข้า...'
                        : selectedIdentity
                        ? `ยืนยัน: ฉันคือ "${selectedIdentity.name}" →`
                        : 'กรุณาเลือกชื่อของคุณด้านบน'}
                    </button>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-400 mb-2 text-center uppercase">
                      หรือถ้ายังไม่มีชื่อ
                    </p>
                    <div className="flex gap-2 relative">
                      {gameStarted && (
                        <div className="absolute inset-0 bg-gray-50/80 z-10 flex items-center justify-center text-xs font-bold text-red-500">
                          🎮 เริ่มเกมแล้ว ห้ามเพิ่มคน
                        </div>
                      )}
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="พิมพ์ชื่อเล่น..."
                        disabled={gameStarted}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewMember();
                        }}
                      />
                      <button
                        disabled={gameStarted || !newMemberName.trim()}
                        onClick={handleAddNewMember}
                        className="bg-green-500 text-white font-bold px-4 rounded-xl hover:bg-green-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + เพิ่ม
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setAppStep('landing')}
                  className="w-full text-center text-gray-400 text-sm hover:text-gray-600 py-2"
                >
                  ← ออกจากกลุ่ม
                </button>
              </div>
            )}

            {appStep === 'draw' && (
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {groupName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      หวัดดี{' '}
                      <span className="text-red-500 font-bold">{myName}</span>!
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                      งบ {budgetMin}-{budgetMax}
                    </span>
                    {eventDate && (
                      <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-md font-bold">
                        📅 {formatDate(eventDate)}
                      </span>
                    )}
                  </div>
                </div>

                {hasAlreadyDrawn ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-6 text-center animate-fade-in-up shadow-sm mb-6">
                    <p className="text-green-600 font-bold mb-1">
                      ✅ คุณจับฉลากแล้ว
                    </p>

                    {myDrawResult ? (
                      <>
                        <p className="text-3xl font-extrabold text-gray-800 mb-4">
                          {myDrawResult.name}
                        </p>
                        <button
                          onClick={() => setAppStep('result')}
                          className="bg-green-500 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-green-600"
                        >
                          ดูข้อมูลเพื่อน
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleConfirmIdentity}
                        className="text-red-500 underline text-sm"
                      >
                        โหลดข้อมูลไม่สำเร็จ ลองกดตรงนี้
                      </button>
                    )}

                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="block w-full text-center text-gray-400 text-xs hover:text-gray-600 mt-4 underline"
                    >
                      ✏️ แก้ไข Wishlist ของฉัน
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-center mb-6">
                    {participants.length < 2 ? (
                      <p className="text-gray-400 italic">
                        รอเพื่อนแป๊บนึงนะ... (ต้องมี 2 คนขึ้นไป)
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={handleDraw}
                          disabled={isDrawing}
                          className={`w-40 h-40 rounded-full mx-auto shadow-2xl flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95 ${
                            isDrawing
                              ? 'bg-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-br from-red-500 to-red-600 hover:scale-105'
                          }`}
                        >
                          {isDrawing ? (
                            <span className="text-4xl animate-spin">🎲</span>
                          ) : (
                            <span className="text-5xl animate-bounce">🎁</span>
                          )}
                          <span
                            className={`font-bold ${
                              isDrawing ? 'text-gray-400' : 'text-white'
                            }`}
                          >
                            {isDrawing ? drawnResult?.name : 'จับเลย!'}
                          </span>
                        </button>
                        <button
                          onClick={() => setShowEditProfileModal(true)}
                          className="w-full text-center text-gray-400 text-sm hover:text-gray-600 mt-4 underline"
                        >
                          ✏️ แก้ไขข้อมูลส่วนตัว
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">
                      สถานะสมาชิก
                    </h3>
                    <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-500 font-bold">
                      จับแล้ว {drawnCount}/{totalCount}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-4">
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

                <button
                  onClick={() => setAppStep('lobby')}
                  className="w-full text-center text-gray-300 text-xs mt-6 hover:text-gray-500"
                >
                  ← เปลี่ยนชื่อ / กลับหน้าเลือก
                </button>
              </div>
            )}

            {appStep === 'result' && myDrawResult && (
              <div className="text-center py-6 space-y-6">
                <div className="relative inline-block">
                  <div
                    className="absolute -top-4 -left-4 text-3xl animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  >
                    🎄
                  </div>
                  <div
                    className="absolute -top-4 -right-4 text-3xl animate-bounce"
                    style={{ animationDelay: '0.7s' }}
                  >
                    ⭐
                  </div>
                  <div className="bg-red-500 text-white p-8 rounded-[2rem] shadow-xl rotate-1">
                    <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-2">
                      Secret Mission
                    </p>
                    <h2 className="text-4xl font-extrabold">
                      {myDrawResult.name}
                    </h2>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center text-sm font-bold border-b border-gray-200 pb-2">
                    <span className="text-gray-500">💰 งบของขวัญ</span>
                    <span className="text-green-600">
                      {budgetMin}-{budgetMax}฿
                    </span>
                  </div>
                  {eventDate && (
                    <div className="flex justify-between items-center text-sm font-bold border-b border-gray-200 pb-2">
                      <span className="text-gray-500">📅 วันนัดหมาย</span>
                      <span className="text-red-500">
                        {formatDate(eventDate)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                      🎁 สิ่งที่อยากได้
                    </p>
                    <p className="text-gray-800 font-medium">
                      {myDrawResult.wishlist || '-'}
                    </p>
                  </div>
                  {myDrawResult.hobby && (
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                        🎨 งานอดิเรก
                      </p>
                      <p className="text-gray-800 font-medium">
                        {myDrawResult.hobby}
                      </p>
                    </div>
                  )}
                  {myDrawResult.message_to_santa && (
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 italic text-gray-600 text-sm">
                      " {myDrawResult.message_to_santa} "
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <p className="text-gray-300 text-xs mb-4">
                    🤫 จุ๊ๆ อย่าบอกใครนะ
                  </p>
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    className="w-full bg-white border border-gray-200 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm"
                  >
                    ✏️ แก้ไข Wishlist ของฉัน
                  </button>
                  <button
                    onClick={() => setAppStep('draw')}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                  >
                    ← กลับหน้าหลัก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/50 pointer-events-auto">
            <p className="text-red-800/80 text-xs font-bold">
              Made with ❤️ for Christmas 🎄
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
