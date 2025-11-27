import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// Supabase Configuration
const SUPABASE_URL = 'https://eiklxtnjuepjauulrark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2x4dG5qdWVwamF1dWxyYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc5MDksImV4cCI6MjA3OTgyMzkwOX0.b4dO8KWbSAaJphuQD-ZTVQpiYxN5KUP_DyQ6PUlzVF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  const initialParticipants = ['Kikkan', 'Pi', 'Leng', 'Perth', 'Ice', 'Mane', 'Pine', 'Koung'];
  
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [completedDraws, setCompletedDraws] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [drawnResult, setDrawnResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restriction rules (hidden from UI)
  const restrictions = {
    'Leng': ['Koung'],
    'Koung': ['Leng']
  };

  // Calculate remaining participants based on completed draws
  const remainingDrawers = initialParticipants.filter(
    p => !completedDraws.some(d => d.drawer === p)
  );
  const remainingReceivers = initialParticipants.filter(
    p => !completedDraws.some(d => d.receiver === p)
  );

  // Get or create active session
  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to find active session
      let { data: sessions, error: fetchError } = await supabase
        .from('santa_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let currentSessionId;

      if (sessions && sessions.length > 0) {
        currentSessionId = sessions[0].id;
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('santa_sessions')
          .insert({})
          .select()
          .single();

        if (createError) throw createError;
        currentSessionId = newSession.id;
      }

      setSessionId(currentSessionId);

      // Fetch existing draws for this session
      const { data: draws, error: drawsError } = await supabase
        .from('santa_draws')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (drawsError) throw drawsError;
      setCompletedDraws(draws || []);

    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อได้: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('santa-draws-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'santa_draws',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setCompletedDraws(prev => {
            // Avoid duplicates
            if (prev.some(d => d.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'santa_draws',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Refetch on delete (reset)
          initializeSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, initializeSession]);

  const getValidReceivers = (drawer) => {
    let valid = remainingReceivers.filter(r => r !== drawer);
    if (restrictions[drawer]) {
      valid = valid.filter(r => !restrictions[drawer].includes(r));
    }
    return valid;
  };

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setStep(2);
  };

  const handleDraw = () => {
    setIsDrawing(true);
    const validReceivers = getValidReceivers(selectedPerson);
    
    if (validReceivers.length === 0) {
      setError('ไม่มีคนให้จับแล้ว กรุณารีเซ็ต');
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
        setStep(3);
      }
    }, 100);
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      
      const { error: insertError } = await supabase
        .from('santa_draws')
        .insert({
          session_id: sessionId,
          drawer: selectedPerson,
          receiver: drawnResult
        });

      if (insertError) throw insertError;

      setSelectedPerson(null);
      setDrawnResult(null);
      setStep(1);
    } catch (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('รีเซ็ตการจับฉลากทั้งหมด?')) return;
    
    try {
      setIsLoading(true);

      // Deactivate current session
      await supabase
        .from('santa_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('santa_sessions')
        .insert({})
        .select()
        .single();

      if (createError) throw createError;

      setSessionId(newSession.id);
      setCompletedDraws([]);
      setSelectedPerson(null);
      setDrawnResult(null);
      setStep(1);
    } catch (err) {
      setError('รีเซ็ตไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const snowflakes = Array.from({ length: 25 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    fontSize: `${Math.random() * 20 + 10}px`,
    opacity: Math.random() * 0.5 + 0.3
  }));

  const isComplete = remainingDrawers.length === 0;

  if (isLoading && !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-800 via-red-700 to-green-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">🎅</div>
          <p className="text-xl">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>🎄 Secret Santa</title>
        <meta name="description" content="จับฉลากแลกของขวัญ" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-red-800 via-red-700 to-green-800 relative overflow-hidden">
        {/* Snowflakes */}
        {snowflakes.map((style, i) => (
          <div key={i} className="absolute text-white pointer-events-none" style={style}>❄</div>
        ))}
        
        {/* Top decoration */}
        <div className="absolute top-0 left-0 w-full flex justify-center gap-4 py-2">
          {['🔔', '⭐', '🎄', '⭐', '🔔', '⭐', '🎄', '⭐', '🔔'].map((emoji, i) => (
            <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
              {emoji}
            </span>
          ))}
        </div>

        {/* Real-time indicator */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Live Sync
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎅</div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              🎄 Secret Santa 🎄
            </h1>
            <p className="text-yellow-200 text-lg">จับฉลากแลกของขวัญ</p>
          </div>

          {/* Progress */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/20 backdrop-blur rounded-full px-6 py-3 flex items-center gap-4">
              <span className="text-white">
                🎁 จับแล้ว {completedDraws.length} / {initialParticipants.length} คน
              </span>
              <div className="w-32 h-3 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${(completedDraws.length / initialParticipants.length) * 100}%` }}
                />
              </div>
            </div>
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

          {/* Main content */}
          <div className="max-w-2xl mx-auto">
            {isComplete ? (
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-green-700 mb-4">จับฉลากครบแล้ว!</h2>
                <p className="text-gray-600 mb-6">ทุกคนได้ Secret Santa เรียบร้อย</p>
                <div className="text-4xl mb-6">🎄🎁🎅🎁🎄</div>
                <button
                  onClick={handleReset}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
                >
                  🔄 เริ่มรอบใหม่
                </button>
              </div>
            ) : (
              <>
                {/* Step 1: Select person */}
                {step === 1 && (
                  <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-6">
                      <span className="inline-block bg-red-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                        ขั้นตอนที่ 1
                      </span>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">🎅 ใครจะจับฉลาก?</h2>
                      <p className="text-gray-500">เลือกชื่อของคุณ</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {remainingDrawers.map((person) => (
                        <button
                          key={person}
                          onClick={() => handleSelectPerson(person)}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-2xl transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <span className="text-xl">🎁</span>
                          <span className="text-lg">{person}</span>
                        </button>
                      ))}
                    </div>

                    {completedDraws.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-gray-400 text-sm text-center mb-3">จับไปแล้ว:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {completedDraws.map((d, i) => (
                            <span key={i} className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">
                              ✓ {d.drawer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Draw */}
                {step === 2 && (
                  <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
                    <span className="inline-block bg-yellow-500 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                      ขั้นตอนที่ 2
                    </span>
                    <div className="text-5xl mb-4">🎁</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">สวัสดี {selectedPerson}!</h2>
                    <p className="text-gray-500 mb-8">พร้อมจะรู้ว่าคุณจะเป็น Santa ให้ใคร?</p>
                    
                    {isDrawing ? (
                      <div className="mb-6">
                        <div className="text-6xl animate-bounce mb-4">🎰</div>
                        <div className="bg-gradient-to-r from-red-500 to-green-500 text-white text-3xl font-bold py-4 px-8 rounded-2xl inline-block animate-pulse">
                          {drawnResult || '???'}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDraw}
                        className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:via-red-700 hover:to-red-600 text-white font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-110 shadow-xl animate-pulse"
                      >
                        🎄 จับฉลากเลย! 🎄
                      </button>
                    )}
                    
                    <div className="mt-6">
                      <button
                        onClick={() => { setStep(1); setSelectedPerson(null); }}
                        className="text-gray-500 hover:text-gray-700 underline"
                      >
                        ← กลับไปเลือกใหม่
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Reveal */}
                {step === 3 && (
                  <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
                    <span className="inline-block bg-green-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                      ขั้นตอนที่ 3
                    </span>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-xl text-gray-600 mb-2">{selectedPerson} คุณจะเป็น Secret Santa ให้กับ...</h2>
                    
                    <div className="my-8">
                      <div className="inline-block bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-1 rounded-2xl">
                        <div className="bg-white rounded-xl px-12 py-6">
                          <div className="text-4xl mb-2">🎁</div>
                          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600">
                            {drawnResult}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-500 mb-6 text-sm">🤫 เก็บเป็นความลับนะ!</p>
                    
                    <button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-12 rounded-full text-lg transition-all transform hover:scale-105 shadow-xl disabled:opacity-50"
                    >
                      {isLoading ? '⏳ กำลังบันทึก...' : '✓ รับทราบแล้ว'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Reset button */}
            {!isComplete && step === 1 && (
              <div className="text-center mt-6">
                <button
                  onClick={handleReset}
                  className="text-white/70 hover:text-white underline text-sm"
                >
                  🔄 รีเซ็ต terrace (เริ่มใหม่ทั้งหมด)
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 w-full flex justify-center items-end pointer-events-none">
            <div className="text-4xl">🎄</div>
            <div className="text-6xl">🎅</div>
            <div className="text-4xl">🦌</div>
            <div className="text-5xl">🎄</div>
            <div className="text-3xl">⛄</div>
            <div className="text-4xl">🎄</div>
            <div className="text-6xl">🤶</div>
            <div className="text-4xl">🎄</div>
          </div>
        </div>
      </div>
    </>
  );
}
