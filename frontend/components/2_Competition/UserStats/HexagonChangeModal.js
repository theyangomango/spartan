import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Dimensions, Pressable, ActivityIndicator, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import HexagonalStats from './HexagonalStats';

const { height: H } = Dimensions.get('window');
const scale = H / 844;
const ss = (n) => Math.round(n * scale);

function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function lerp(a,b,t){ return a + (b - a) * t; }

function interpStats(from, to, t){
  const A = from || {}; const B = to || {};
  const keys = ['shoulders','chest','arms','legs','back','abs'];
  const out = {};
  keys.forEach(k => { out[k] = Math.round(lerp(Number(A[k]||0), Number(B[k]||0), t)); });
  out.overall = Math.round((out.shoulders + out.chest + out.arms + out.legs + out.back + out.abs)/6);
  return out;
}

export default function HexagonChangeModal({ isVisible, fromStats, toStats, onClose }){
  const anim = useRef(new Animated.Value(0)).current; // stat interpolation 0->1
  const chartScale = useRef(new Animated.Value(0.94)).current; // pop-in
  const pillAnims = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current; // stagger pills
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(ss(16))).current;
  const btnScale = useRef(new Animated.Value(0.94)).current;
  const [started, setStarted] = useState(false);

  // Drive animation on open or when toStats becomes available
  useEffect(() => {
    if (isVisible && toStats && !started) {
      setStarted(true);
      anim.setValue(0);
      chartScale.setValue(0.94);
      pillAnims.forEach((v) => v.setValue(0));

      try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardTranslate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(chartScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.stagger(60, pillAnims.map((v) =>
          Animated.timing(v, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )),
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(btnScale, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true })
        ])
      ]).start();
    }
  }, [isVisible, toStats, anim, chartScale, pillAnims, cardOpacity, cardTranslate, btnScale, started]);

  const t = useRef(0);
  const [renderTick, setRenderTick] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => { t.current = clamp01(value); setRenderTick(v => v+1); });
    return () => anim.removeListener(id);
  }, [anim]);

  const statsNow = useMemo(() => interpStats(fromStats, toStats, t.current), [fromStats, toStats, renderTick]);

  const diffs = useMemo(() => {
    const k = ['shoulders','chest','arms','legs','back','abs'];
    const out = {};
    k.forEach(key => { out[key] = Math.round(Number((toStats?.[key]||0)) - Number((fromStats?.[key]||0))); });
    return out;
  }, [fromStats, toStats]);

  const ready = !!toStats;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]} pointerEvents="box-none">
          <Text style={styles.title}>Progress Update</Text>
          <View style={{ height: ss(14) }} />
          {ready ? (
            <Animated.View style={{ transform: [{ scale: chartScale }] }}>
              <HexagonalStats
                statsHexagon={statsNow}
                showLabels={true}
                size={Math.min(Dimensions.get('window').width - ss(16)*2 - ss(18)*2, ss(236))}
                labelFontPx={ss(12)}
                valueFontPx={ss(12)}
                labelOffsetPx={ss(22)}
              />
            </Animated.View>
          ) : (
            <View style={{ height: ss(180), alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#2D9EFF" />
              <Text style={styles.waitText}>Calculating…</Text>
            </View>
          )}
          <View style={{ height: ss(6) }} />
          <View style={styles.separator} />
          <View style={{ height: ss(10) }} />
          {ready && (
            <View style={styles.diffsRow}>
              {['shoulders','chest','arms','legs','back','abs'].map((k, idx) => {
                const v = pillAnims[idx];
                const val = Number(diffs[k] || 0);
                const colorStyle = val > 0 ? styles.up : val < 0 ? styles.down : styles.neutral;
                return (
                  <Animated.View
                    key={k}
                    style={[styles.diffPill, { opacity: v, transform: [{ scale: v.interpolate({ inputRange:[0,1], outputRange:[0.94,1] }) }] }]}
                  >
                    <Text style={styles.diffLabel}>{k[0].toUpperCase()+k.slice(1)}</Text>
                    <Text style={[styles.diffVal, colorStyle]}>{val > 0 ? `+${val}` : val}</Text>
                  </Animated.View>
                );
              })}
            </View>
          )}
          <View style={{ height: ss(16) }} />
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable onPress={onClose} style={styles.button}><Text style={styles.btnText}>Close</Text></Pressable>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(15,23,42,0.45)', alignItems:'center', justifyContent:'center', paddingHorizontal:ss(16) },
  card: { width:'100%', backgroundColor:'#252733', borderRadius:ss(24), paddingVertical:ss(16), paddingHorizontal:ss(18), shadowColor:'#000', shadowOpacity:0.08, shadowRadius:ss(14), shadowOffset:{ width:0, height:ss(6) } },
  title: { fontFamily:'Outfit_700Bold', fontSize:ss(18), color:'#EAEAEA' },
  waitText: { marginTop:ss(8), fontFamily:'Outfit_500Medium', fontSize:ss(12), color:'#AEB5C0' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: -ss(18) },
  diffsRow: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginTop:ss(8) },
  diffPill: { width:'48%', backgroundColor:'#1E232C', borderRadius:ss(14), paddingVertical:ss(10), paddingHorizontal:ss(12), marginBottom:ss(10), borderWidth:StyleSheet.hairlineWidth, borderColor:'rgba(255,255,255,0.10)' },
  diffLabel: { fontFamily:'Outfit_600SemiBold', fontSize:ss(13), color:'#EAEAEA' },
  diffVal: { marginTop: ss(4), fontFamily:'Outfit_700Bold', fontSize:ss(15) },
  up: { color:'#2D9EFF' },
  down: { color:'#EF4444' },
  neutral: { color:'#AEB5C0' },
  button: { alignSelf:'center', backgroundColor:'#2D9EFF', paddingHorizontal:ss(22), paddingVertical:ss(10), borderRadius:ss(999) },
  btnText: { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:ss(14) },
});
