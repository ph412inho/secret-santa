const handleDraw = async () => {
  if (!myId || !groupId) return;

  // กันดื้อ ๆ จาก state ปัจจุบันก่อน
  const me = participants.find((p) => p.id === myId);
  if (myDrawResult || me?.has_drawn) {
    setError('คุณจับฉลากไปแล้วนะ!');
    return;
  }

  setIsDrawing(true);
  setShowResultCard(false);
  setError(null);

  try {
    // 1) เช็คอีกรอบจากฐานข้อมูลว่าเราเคยจับหรือยัง
    const { data: existingDraw, error: existingError } = await supabase
      .from('draws')
      .select('receiver:receiver_id(*)')
      .eq('group_id', groupId)
      .eq('drawer_id', myId)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingDraw) {
      // ถ้าใน DB บอกว่าเคยจับแล้ว → ใช้ผลเดิม ห้ามจับใหม่
      setMyDrawResult(existingDraw.receiver);
      setShowResultCard(true);
      setIsDrawing(false);
      setNotification('คุณจับฉลากไปแล้วนะ ✅');
      return;
    }

    // 2) โหลดข้อมูลสด ๆ สำหรับคำนวณคนที่ว่างอยู่จริง ๆ
    const [{ data: latestParticipants, error: partError }, { data: drawsData, error: drawsError }] =
      await Promise.all([
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
      setError('ของขวัญหมดแล้ว! (ทุกคนมีคนจับให้ครบแล้ว)');
      setIsDrawing(false);
      return;
    }

    // เลือกผลสุดท้าย
    const finalResult =
      validReceivers[Math.floor(Math.random() * validReceivers.length)];

    // 3) แอนิเมชัน "หมุนชื่อ" ให้เหมือนเดิม
    let count = 0;
    const interval = setInterval(() => {
      setDrawnResult(
        validReceivers[Math.floor(Math.random() * validReceivers.length)]
      );
      count++;

      if (count > 25) {
        clearInterval(interval);
        setDrawnResult(finalResult);

        // 4) บันทึกลง DB แบบจริงจัง (await)
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

            if (insertError) throw insertError;

            const { error: updateError } = await supabase
              .from('participants')
              .update({ has_drawn: true })
              .eq('id', myId);

            if (updateError) throw updateError;

            // อัปเดต state local ให้เห็น "จับแล้ว" ทันที
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
