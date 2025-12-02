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
      {/* Checkmark: แสดงเสมอถ้าจับแล้ว */}
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
              <div className="absolute z-10 w-full mt-1 bg-whi
