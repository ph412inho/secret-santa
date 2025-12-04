// pages/index.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// --- CONFIG ---
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_PARTICIPANTS = 40;
const PIN_LENGTH = 4;
const MAX_PIN_ATTEMPTS = 3;
const LOCK_DURATION_SECONDS = 30;

// --- CSS ---
const styles = `
  .flip-x { transform: scaleX(-1); }
  .no-float { transform: none !important; animation: none !important; }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }
  .animate-landing-float { animation: float-slow 4s ease-in-out infinite; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.3s ease-in-out; }
`;

// --- UTILITY FUNCTIONS ---

const generateGroupId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

const parseNames = (input, existingParticipants = []) => {
  const names = input
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  
  const existingNames = new Set(
    existingParticipants.map((p) => p.name.toLowerCase())
  );
  
  const uniqueNames = [];
  const duplicates = [];
  const alreadyInGroup = [];
  const seen = new Set();
  
  for (const name of names) {
    const lowerName = name.toLowerCase();
    
    // Check if already in group
    if (existingNames.has(lowerName)) {
      alreadyInGroup.push(name);
    }
    // Check if duplicate in current input
    else if (seen.has(lowerName)) {
      duplicates.push(name);
    } else {
      seen.add(lowerName);
      uniqueNames.push(name);
    }
  }
  
  return { uniqueNames, duplicates, alreadyInGroup };
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
};

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

// Notification Toast
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 animate-bounce">
      <div
        className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-sm w-full ${
          type === 'error'
            ? 'bg-white border-l-4 border-red-500'
            : 'bg-white border-l-4 border-green-500'
        }`}
      >
        <span className="text-xl">{type === 'error' ? '😅' : '🎁'}</span>
        <span className="text-gray-700 font-medium text-sm flex-1">
          {message}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Santa Icon with Status
const SantaIcon = ({
  name,
  hasDrawn,
  hasPIN,
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
      {/* Show claim status (PIN) on left, draw status on right */}
      {hasPIN && (
        <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-blue-100">
          <span className="text-[10px]">🔐</span>
        </div>
      )}
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

// PIN Modal
const PINModal = ({ isOpen, mode, participantName, onSubmit, onClose, lockUntil }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [remainingLock, setRemainingLock] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!lockUntil) {
      setRemainingLock(0);
      return;
    }
    
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setRemainingLock(remaining);
    };
    
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');
    
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = () => {
    const fullPin = pin.join('');
    if (fullPin.length !== PIN_LENGTH) {
      setError('กรุณาใส่ PIN 4 หลัก');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      return;
    }
    onSubmit(fullPin);
  };

  const triggerError = (message) => {
    setError(message);
    setIsShaking(true);
    setPin(['', '', '', '']);
    setTimeout(() => setIsShaking(false), 300);
    document.getElementById('pin-0')?.focus();
  };

  // Expose triggerError via ref-like pattern
  useEffect(() => {
    if (isOpen) {
      window.pinModalTriggerError = triggerError;
    }
    return () => {
      window.pinModalTriggerError = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = remainingLock > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative ${isShaking ? 'animate-shake' : ''}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"
        >
          ✕
        </button>
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">
            {mode === 'set' ? '🔐' : '🔑'}
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            {mode === 'set' ? 'ตั้ง PIN ของคุณ' : 'ใส่ PIN ของคุณ'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            สวัสดี <span className="font-bold text-red-500">{participantName}</span>
          </p>
          {mode === 'set' && (
            <p className="text-xs text-gray-400 mt-2">
              PIN นี้ใช้ยืนยันตัวตนทุกครั้งที่เข้ามา
            </p>
          )}
        </div>

        {isLocked ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-red-500 font-bold">ใส่ PIN ผิดหลายครั้ง</p>
            <p className="text-gray-500 text-sm mt-2">
              รอ <span className="font-bold text-red-500">{remainingLock}</span> วินาที
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-3 mb-4">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              {mode === 'set' ? 'ยืนยัน PIN' : 'เข้าสู่ระบบ'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Confirm Draw Modal
const ConfirmDrawModal = ({ isOpen, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="text-5xl mb-4">🎁</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">พร้อมจับฉลากแล้ว?</h3>
        <p className="text-gray-500 text-sm mb-6">
          เมื่อจับแล้ว <span className="text-red-500 font-bold">เปลี่ยนไม่ได้</span> นะ!
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
          >
            ยังก่อน
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg"
          >
            จับเลย! 🎉
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

// Bulk Add Component
const BulkAddSection = ({ groupId, currentCount, participants, onSuccess, onError, gameStarted }) => {
  const [input, setInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { uniqueNames, duplicates, alreadyInGroup } = useMemo(
    () => parseNames(input, participants),
    [input, participants]
  );
  
  const remainingSlots = MAX_PARTICIPANTS - currentCount;
  const namesToAdd = uniqueNames.slice(0, remainingSlots);
  const excessNames = uniqueNames.slice(remainingSlots);

  const handleAdd = async () => {
    if (namesToAdd.length === 0 || isAdding) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.from('participants').insert(
        namesToAdd.map((name) => ({
          group_id: groupId,
          name,
          has_drawn: false,
          pin: null,
        }))
      );

      if (error) throw error;

      setInput('');
      onSuccess(`เพิ่มสมาชิก ${namesToAdd.length} คนสำเร็จ! 🎉`);
    } catch (err) {
      onError('เพิ่มไม่สำเร็จ: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  if (gameStarted) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
        <p className="text-yellow-700 font-bold text-sm">
          🎮 เริ่มเกมแล้ว ไม่สามารถเพิ่มสมาชิกได้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2">
          👥 เพิ่มสมาชิก
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์รายชื่อคั่นด้วย , เช่น: แม่, พ่อ, ป๊อป, โบว์"
          rows={3}
          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-400 focus:outline-none resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          💡 ตัวอย่าง: แม่, พ่อ, น้องโอม, ป้าแอ๋ว
        </p>
      </div>

      {/* Preview */}
      {(uniqueNames.length > 0 || alreadyInGroup.length > 0) && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          {namesToAdd.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-500 mb-2">
                ✅ รายชื่อที่จะเพิ่ม ({namesToAdd.length} คน)
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {namesToAdd.map((name, i) => (
                  <span
                    key={i}
                    className="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </>
          )}
          
          {/* Names that exceed limit */}
          {excessNames.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {excessNames.map((name, i) => (
                <span
                  key={`excess-${i}`}
                  className="bg-red-50 border border-red-200 text-red-400 px-3 py-1 rounded-full text-sm font-medium line-through"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          
          {/* Already in group */}
          {alreadyInGroup.length > 0 && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ มีในกลุ่มแล้ว: {alreadyInGroup.join(', ')}
            </p>
          )}
          
          {/* Duplicates in input */}
          {duplicates.length > 0 && (
            <p className="text-xs text-orange-500 mt-2">
              ⚠️ ตัดชื่อซ้ำออกแล้ว {duplicates.length} รายชื่อ: {duplicates.join(', ')}
            </p>
          )}
          
          {excessNames.length > 0 && (
            <p className="text-xs text-red-500 mt-2">
              ⚠️ เกินโควต้า {excessNames.length} คน (กลุ่มรับได้อีก {remainingSlots} คน)
            </p>
          )}
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={handleAdd}
        disabled={namesToAdd.length === 0 || isAdding}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding
          ? '⏳ กำลังเพิ่ม...'
          : namesToAdd.length === 0
          ? 'พิมพ์ชื่อก่อนนะ'
          : `เพิ่มสมาชิก ${namesToAdd.length} คน`}
      </button>

      {namesToAdd.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          ถ้าสะกดผิดหรือชื่อซ้ำกับคนในกลุ่ม ยังแก้ไขได้ทีหลัง
        </p>
      )}
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

  // Selection State
  const [selectedIdentity, setSelectedIdentity] = useState(null);

  // PIN State
  const [showPINModal, setShowPINModal] = useState(false);
  const [pinMode, setPinMode] = useState('set'); // 'set' or 'verify'
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showConfirmDrawModal, setShowConfirmDrawModal] = useState(false);

  // --- UTILS & EFFECTS ---

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const showError = useCallback((message) => {
    setToast({ message, type: 'error' });
  }, []);

  const resetAllState = useCallback(() => {
    setGroupId('');
    setGroupName('');
    setBudgetMin(300);
    setBudgetMax(700);
    setEventDate('');
    setGameStarted(false);
    setMyId(null);
    setMyName('');
    setWishlist('');
    setHobby('');
    setMessageToSanta('');
    setParticipants([]);
    setDrawnResult(null);
    setMyDrawResult(null);
    setSelectedIdentity(null);
    setPinAttempts(0);
    setLockUntil(null);
  }, []);

  const fetchParticipants = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    if (!error) setParticipants(data || []);
  }, [groupId]);

  const checkGameStatus = useCallback(async () => {
    if (!groupId) return;
    const { count, error } = await supabase
      .from('draws')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    if (!error) setGameStarted((count || 0) > 0);
  }, [groupId]);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .limit(1);
    if (!error && data && data.length > 0) {
      const g = data[0];
      setEventDate(g.event_date || '');
      setBudgetMin(g.budget_min);
      setBudgetMax(g.budget_max);
    }
  }, [groupId]);

  const fetchMyDrawReceiver = useCallback(
    async (groupIdParam, drawerId) => {
      const { data, error } = await supabase
        .from('draws')
        .select('receiver_id')
        .eq('group_id', groupIdParam)
        .eq('drawer_id', drawerId)
        .limit(1);

      if (error || !data || data.length === 0) return null;

      const receiverId = data[0].receiver_id;
      if (!receiverId) return null;

      const { data: receiverData, error: receiverError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', receiverId)
        .limit(1);

      if (receiverError || !receiverData || receiverData.length === 0) return null;

      return receiverData[0];
    },
    []
  );

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
  }, [groupId, appStep, fetchParticipants, fetchGroupDetails, checkGameStatus]);

  // --- ACTIONS ---

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showError('ตั้งชื่อกลุ่มก่อนนะ!');
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
        });

      if (createError) throw createError;
      setGroupId(newGroupId);
      setAppStep('lobby');
      showNotification('สร้างกลุ่มสำเร็จ! 🎉');
    } catch (err) {
      showError('สร้างไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupId.trim() || groupId.length < 6) {
      showError('รหัส 6 หลักนะ');
      return;
    }
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId.toUpperCase())
        .limit(1);
      if (fetchError || !data || data.length === 0)
        throw new Error('ไม่เจอกลุ่มนี้');
      const g = data[0];
      setGroupId(g.id);
      setGroupName(g.name);
      setBudgetMin(g.budget_min);
      setBudgetMax(g.budget_max);
      setEventDate(g.event_date || '');
      setAppStep('lobby');
    } catch (err) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdentity = (participant) => {
    setSelectedIdentity(participant);
    
    // Check if PIN exists
    if (participant.pin) {
      setPinMode('verify');
    } else {
      setPinMode('set');
    }
    setShowPINModal(true);
  };

  const handlePINSubmit = async (pin) => {
    if (!selectedIdentity) return;

    if (pinMode === 'set') {
      // Save new PIN
      const { error } = await supabase
        .from('participants')
        .update({ pin })
        .eq('id', selectedIdentity.id);

      if (error) {
        showError('บันทึก PIN ไม่สำเร็จ');
        return;
      }

      setShowPINModal(false);
      await proceedToDrawScreen(selectedIdentity);
      showNotification('ตั้ง PIN สำเร็จ! 🔐');
    } else {
      // Verify PIN
      if (pin === selectedIdentity.pin) {
        setShowPINModal(false);
        setPinAttempts(0);
        await proceedToDrawScreen(selectedIdentity);
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          setLockUntil(Date.now() + LOCK_DURATION_SECONDS * 1000);
          setTimeout(() => {
            setLockUntil(null);
            setPinAttempts(0);
          }, LOCK_DURATION_SECONDS * 1000);
        }
        
        if (window.pinModalTriggerError) {
          window.pinModalTriggerError(
            newAttempts >= MAX_PIN_ATTEMPTS
              ? 'ใส่ผิดหลายครั้ง กรุณารอสักครู่'
              : `PIN ไม่ถูกต้อง (${newAttempts}/${MAX_PIN_ATTEMPTS})`
          );
        }
      }
    }
  };

  const proceedToDrawScreen = async (participant) => {
    setIsLoading(true);
    try {
      setMyId(participant.id);
      setMyName(participant.name);
      setWishlist(participant.wishlist || '');
      setHobby(participant.hobby || '');
      setMessageToSanta(participant.message_to_santa || '');

      await fetchParticipants();

      const receiver = await fetchMyDrawReceiver(groupId, participant.id);
      if (receiver) {
        setMyDrawResult(receiver);
      } else {
        setMyDrawResult(null);
      }

      setAppStep('draw');
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
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
      showError('อัปเดตวันที่ไม่สำเร็จ');
    }
  };

  const handleUpdateProfile = async (newData) => {
    if (!myId) return;
    setWishlist(newData.wishlist);
    setHobby(newData.hobby);
    setMessageToSanta(newData.message_to_santa);
    await supabase.from('participants').update(newData).eq('id', myId);
    showNotification('บันทึกข้อมูลแล้ว! ✅');
  };

  const handleDrawClick = () => {
    setShowConfirmDrawModal(true);
  };

  const handleConfirmDraw = async () => {
    setShowConfirmDrawModal(false);
    await performDraw();
  };

  const performDraw = async () => {
    if (!myId || !groupId) return;

    const me = participants.find((p) => p.id === myId);
    if (isDrawing) return;

    if (myDrawResult || me?.has_drawn) {
      showError('คุณจับฉลากไปแล้วนะ!');
      return;
    }

    setIsDrawing(true);
    
    try {
      const receiverFromDB = await fetchMyDrawReceiver(groupId, myId);
      if (receiverFromDB) {
        setMyDrawResult(receiverFromDB);
        setIsDrawing(false);
        showNotification('คุณจับฉลากไปแล้วนะ ✅');
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
        showError('ของขวัญหมดแล้ว! ทุกคนมีคนจับให้แล้ว');
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
                });

              if (insertError) {
                if (insertError.code === '23505') {
                  const already = await fetchMyDrawReceiver(groupId, myId);
                  if (already) {
                    setMyDrawResult(already);
                    await fetchParticipants();
                    await checkGameStatus();
                    return;
                  }
                }
                showError('บันทึกผลไม่สำเร็จ: ' + insertError.message);
                return;
              }

              const { error: updateError } = await supabase
                .from('participants')
                .update({ has_drawn: true })
                .eq('id', myId);

              if (updateError) {
                showError('อัปเดตสถานะไม่สำเร็จ: ' + updateError.message);
              }

              setParticipants((prev) =>
                prev.map((p) =>
                  p.id === myId ? { ...p, has_drawn: true } : p
                )
              );

              const receiverFromDBFinal = await fetchMyDrawReceiver(
                groupId,
                myId
              );

              setMyDrawResult(receiverFromDBFinal || finalResult);
              await fetchParticipants();
              await checkGameStatus();
            } finally {
              setIsDrawing(false);
            }
          })();
        }
      }, 80);
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการจับฉลาก');
      setIsDrawing(false);
    }
  };

  const myParticipant = participants.find((p) => p.id === myId);
  const hasAlreadyDrawn = !!myDrawResult || myParticipant?.has_drawn;
  const drawnCount = participants.filter((p) => p.has_drawn).length;
  const totalCount = participants.length;

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
        {/* Snow particles */}
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

        {/* Modals */}
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
            showNotification('ยินดีต้อนรับกลับ! 🎉');
          }}
        />

        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          initialData={{ wishlist, hobby, message: messageToSanta }}
          onSave={handleUpdateProfile}
        />

        <PINModal
          isOpen={showPINModal}
          mode={pinMode}
          participantName={selectedIdentity?.name || ''}
          onSubmit={handlePINSubmit}
          onClose={() => {
            setShowPINModal(false);
            setSelectedIdentity(null);
          }}
          lockUntil={lockUntil}
        />

        <ConfirmDrawModal
          isOpen={showConfirmDrawModal}
          onConfirm={handleConfirmDraw}
          onClose={() => setShowConfirmDrawModal(false)}
        />

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-block bg-white p-3 rounded-full shadow-lg border-4 border-green-500 mb-2">
              <span className="text-4xl">🎅</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-md">
              Secret Santa
            </h1>
          </div>

          {/* Main Card */}
          <div
            className={`bg-white rounded-3xl p-6 shadow-2xl relative ${
              appStep === 'landing' ? 'animate-landing-float' : 'no-float'
            }`}
          >
            {/* Landing */}
            {appStep === 'landing' && (
              <div className="space-y-4 py-4 text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  ยินดีต้อนรับ! 🎄
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  มาจับฉลากแลกของขวัญกันเถอะ
                </p>
                <button
                  onClick={() => {
                    resetAllState();
                    setAppStep('create');
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  🏠 สร้างกลุ่มใหม่
                </button>
                <button
                  onClick={() => {
                    resetAllState();
                    setAppStep('join');
                  }}
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

            {/* Create Group */}
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
                    onClick={() => {
                      resetAllState();
                      setAppStep('landing');
                    }}
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

            {/* Join Group */}
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
                    onClick={() => {
                      resetAllState();
                      setAppStep('landing');
                    }}
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

            {/* Lobby */}
            {appStep === 'lobby' && (
              <div className="space-y-6">
                {/* Group Code Card */}
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(groupId);
                    showNotification('คัดลอกรหัสแล้ว!');
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

                {/* Group Info */}
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
                  {/* Member count */}
                  <p className="text-xs text-gray-400 mt-2">
                    สมาชิกในกลุ่ม: <span className="font-bold">{totalCount}/{MAX_PARTICIPANTS}</span> คน
                  </p>
                </div>

                {/* Identity Selection */}
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
                        hasPIN={!!p.pin}
                        selectable={true}
                        isSelected={selectedIdentity?.id === p.id}
                        isMe={false}
                        onClick={() => handleSelectIdentity(p)}
                      />
                    ))}
                    {participants.length === 0 && (
                      <p className="text-gray-300 text-sm italic py-4">
                        ยังไม่มีสมาชิก เพิ่มด้านล่างเลย!
                      </p>
                    )}
                  </div>
                </div>

                {/* Bulk Add Section */}
                <div className="border-t border-gray-100 pt-6">
                  <BulkAddSection
                    groupId={groupId}
                    currentCount={totalCount}
                    participants={participants}
                    onSuccess={(msg) => {
                      showNotification(msg);
                      fetchParticipants();
                    }}
                    onError={showError}
                    gameStarted={gameStarted}
                  />
                </div>

                <button
                  onClick={() => {
                    resetAllState();
                    setAppStep('landing');
                  }}
                  className="w-full text-center text-gray-400 text-sm hover:text-gray-600 py-2"
                >
                  ← ออกจากกลุ่ม
                </button>
              </div>
            )}

            {/* Draw Screen */}
            {appStep === 'draw' && (
              <div className="space-y-6">
                {/* Header with group code */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-4">
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
                    <span
                      onClick={() => {
                        navigator.clipboard.writeText(groupId);
                        showNotification('คัดลอกรหัสแล้ว!');
                      }}
                      className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md cursor-pointer hover:bg-gray-200"
                    >
                      🔗 {groupId}
                    </span>
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
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-6 text-center shadow-sm mb-6">
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
                        onClick={() => proceedToDrawScreen(selectedIdentity)}
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
                          onClick={handleDrawClick}
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

                {/* Member Status */}
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
                        hasPIN={!!p.pin}
                        isMe={p.id === myId}
                      />
                    ))}
                  </div>
                </div>

                {/* Back button - only show if NOT drawn yet */}
                {!hasAlreadyDrawn && (
                  <button
                    onClick={() => {
                      setMyId(null);
                      setMyName('');
                      setSelectedIdentity(null);
                      setAppStep('lobby');
                    }}
                    className="w-full text-center text-gray-300 text-xs mt-6 hover:text-gray-500"
                  >
                    ← เปลี่ยนชื่อ / กลับหน้าเลือก
                  </button>
                )}
              </div>
            )}

            {/* Result Screen */}
            {appStep === 'result' && myDrawResult && (
              <div className="text-center py-6 space-y-6">
                {/* Group code badge */}
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(groupId);
                    showNotification('คัดลอกรหัสแล้ว!');
                  }}
                  className="inline-block bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200"
                >
                  🔗 {groupId}
                </div>

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

        {/* Footer */}
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
