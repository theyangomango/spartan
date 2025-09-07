import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Dimensions, Pressable, ActivityIndicator } from 'react-native';
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
  const anim = useRef(new Animated.Value(0)).current;
  const [started, setStarted] = useState(false);

  // Drive animation on open or when toStats becomes available
  useEffect(() => {
    if (isVisible && toStats && !started) {
      setStarted(true);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
    }
  }, [isVisible, toStats, anim, started]);

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
        <View style={styles.card} pointerEvents="box-none">
          <Text style={styles.title}>Progress Update</Text>
          <Text style={styles.subtitle}>Hexagon after this workout</Text>
          <View style={{ height: ss(14) }} />
          {ready ? (
            <HexagonalStats statsHexagon={statsNow} />
          ) : (
            <View style={{ height: ss(180), alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#2D9EFF" />
              <Text style={styles.waitText}>Calculating…</Text>
            </View>
          )}
          <View style={{ height: ss(10) }} />
          {ready && (
            <View style={styles.diffsRow}>
              {['shoulders','chest','arms','legs','back','abs'].map(k => (
                <View key={k} style={styles.diffPill}>
                  <Text style={styles.diffLabel}>{k[0].toUpperCase()+k.slice(1)}</Text>
                  <Text style={[styles.diffVal, (diffs[k]||0)>=0?styles.up:styles.down]}>{(diffs[k]||0)>=0?`+${diffs[k]}`:diffs[k]}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: ss(16) }} />
          <Pressable onPress={onClose} style={styles.button}><Text style={styles.btnText}>Close</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(15,23,42,0.45)', alignItems:'center', justifyContent:'center', paddingHorizontal:ss(16) },
  card: { width:'100%', backgroundColor:'#fff', borderRadius:ss(24), paddingVertical:ss(16), paddingHorizontal:ss(18) },
  title: { fontFamily:'Outfit_700Bold', fontSize:ss(18), color:'#0F172A' },
  subtitle: { marginTop:ss(2), fontFamily:'Outfit_400Regular', fontSize:ss(12), color:'#64748B' },
  waitText: { marginTop:ss(8), fontFamily:'Outfit_500Medium', fontSize:ss(12), color:'#64748B' },
  diffsRow: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginTop:ss(8) },
  diffPill: { width:'48%', backgroundColor:'#F8FAFC', borderRadius:ss(10), paddingVertical:ss(8), paddingHorizontal:ss(10), marginBottom:ss(8), borderWidth:StyleSheet.hairlineWidth, borderColor:'rgba(100,116,139,0.15)' },
  diffLabel: { fontFamily:'Outfit_500Medium', fontSize:ss(12), color:'#475569' },
  diffVal: { marginTop: ss(2), fontFamily:'Outfit_700Bold', fontSize:ss(14) },
  up: { color:'#10B981' },
  down: { color:'#EF4444' },
  button: { alignSelf:'center', backgroundColor:'#2D9EFF', paddingHorizontal:ss(22), paddingVertical:ss(10), borderRadius:ss(999) },
  btnText: { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:ss(14) },
});

