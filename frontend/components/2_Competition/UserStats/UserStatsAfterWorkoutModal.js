import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Dimensions, Pressable, ActivityIndicator, Easing, Platform, UIManager } from 'react-native';
import FastImage from 'react-native-fast-image';
import HexagonalStats from './HexagonalStats';
import * as Haptics from 'expo-haptics';

const { height: H, width: W } = Dimensions.get('window');
const scale = H / 844; // iPhone 13 baseline
const ss = (n) => Math.round(n * scale);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch {}
}

const GROUPS = ['shoulders','chest','arms','legs','back','abs'];
const pretty = (k) => k[0].toUpperCase()+k.slice(1);

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function lerp(a,b,t){ return a + (b - a) * t; }

function interpStats(from, to, t){
  const A = from || {}; const B = to || {};
  const out = {};
  GROUPS.forEach(k => { out[k] = Math.round(lerp(Number(A[k]||0), Number(B[k]||0), t)); });
  out.overall = Math.round((out.shoulders + out.chest + out.arms + out.legs + out.back + out.abs)/6);
  return out;
}

export default function UserStatsAfterWorkoutModal({ isVisible, fromStats, toStats, onClose, user }){
  const anim = useRef(new Animated.Value(0)).current; // 0->1 interpolation
  const chartScale = useRef(new Animated.Value(0.94)).current; // chart pop
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(ss(16))).current;
  const btnScale = useRef(new Animated.Value(0.94)).current;
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (isVisible && toStats && !started) {
      setStarted(true);
      try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      anim.setValue(0);
      chartScale.setValue(0.94); btnScale.setValue(0.94);
      cardOpacity.setValue(0); cardTranslate.setValue(ss(16));
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardTranslate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(chartScale, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(160),
          Animated.timing(btnScale, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
        ])
      ]).start();
    }
  }, [isVisible, toStats, started, anim, chartScale, cardOpacity, cardTranslate, btnScale]);

  const tRef = useRef(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => { tRef.current = clamp01(value); setTick(x=>x+1); });
    return () => anim.removeListener(id);
  }, [anim]);

  const statsNow = useMemo(() => interpStats(fromStats, toStats, tRef.current), [fromStats, toStats, tick]);
  const diffs = useMemo(() => {
    const out = {}; GROUPS.forEach(k => { out[k] = Math.round(Number((toStats?.[k]||0)) - Number((fromStats?.[k]||0))); });
    return out;
  }, [fromStats, toStats]);

  const changedFirst = useMemo(() => {
    const arr = GROUPS.map(k => ({ key:k, diff: Number(diffs[k]||0), from:Number(fromStats?.[k]||0), to:Number(toStats?.[k]||0) }));
    arr.sort((a,b)=> (Math.abs(b.diff) - Math.abs(a.diff)) || a.key.localeCompare(b.key));
    return arr;
  }, [diffs, fromStats, toStats]);

  const ready = !!toStats;
  const chartWidth = Math.min(W - ss(16)*2 - ss(18)*2, ss(236));

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform:[{ translateY: cardTranslate }] }]}>
          {/* Header (mirrors Competition UserStats header) */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {user?.image ? (
                <FastImage source={{ uri: user.image, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }} style={styles.pfp} />
              ) : (
                <View style={styles.pfp} />
              )}
              <View style={{ flex:1 }}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.handle}>{user?.handle || 'You'}</Text>
                <Text style={styles.subHandle}>Updated just now</Text>
              </View>
            </View>
            <View style={styles.ovrGlowWrap}>
              <View pointerEvents="none" style={styles.ovrGlow} />
              <View style={styles.scorePill}>
                <Text style={styles.scorePillLabel}>OVR</Text>
                <View style={{ height: ss(18), minWidth: ss(20), justifyContent:'center' }}>
                  <Animated.Text style={[styles.scorePillValue, { opacity: anim.interpolate({ inputRange:[0,0.6,1], outputRange:[1,0,0] }), transform:[{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[0,-8] }) }] }]}>
                    {Number(fromStats?.overall || 0)}
                  </Animated.Text>
                  <Animated.Text style={[styles.scorePillValue, { position:'absolute', left:0, right:0, textAlign:'right', opacity: anim.interpolate({ inputRange:[0,0.4,1], outputRange:[0,0,1] }), transform:[{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[8,0] }) }] }]}>
                    {Number(toStats?.overall || 0)}
                  </Animated.Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.title}>Progress Update</Text>
          <View style={{ height: ss(12) }} />
          {ready ? (
            <Animated.View style={{ transform:[{ scale: chartScale }] }}>
              <HexagonalStats
                statsHexagon={statsNow}
                showLabels={true}
                size={chartWidth}
                labelFontPx={ss(12)}
                valueFontPx={ss(12)}
                labelOffsetPx={ss(22)}
              />
            </Animated.View>
          ) : (
            <View style={{ height: ss(180), alignItems:'center', justifyContent:'center' }}>
              <ActivityIndicator size="small" color="#2D9EFF" />
            </View>
          )}

          <View style={styles.separator} />

          {/* Delta grid */}
          <View style={styles.grid}>
            {changedFirst.map(({ key, diff, from, to }, idx) => {
              const colorStyle = diff>0?styles.up:diff<0?styles.down:styles.neutral;
              // number out/in animation using shared anim (0 old → 1 new)
              const outOpacity = anim.interpolate({ inputRange:[0,0.6,1], outputRange:[1,0,0] });
              const outY = anim.interpolate({ inputRange:[0,1], outputRange:[0,-8] });
              const inOpacity = anim.interpolate({ inputRange:[0,0.4,1], outputRange:[0,0,1] });
              const inY = anim.interpolate({ inputRange:[0,1], outputRange:[8,0] });
              const emphasize = Math.min(1, Math.abs(diff)/6);
              const scalePulse = anim.interpolate({ inputRange:[0,0.5,1], outputRange:[1,1+0.02*emphasize,1] });
              return (
                <Animated.View key={key} style={[styles.tile, { transform:[{ scale: scalePulse }] }] }>
                  <Text style={styles.tileLabel}>{pretty(key)}</Text>
                  <View style={{ height: ss(2) }} />
                  <View style={{ height: ss(24), justifyContent:'center' }}>
                    <Animated.Text style={[styles.valOld, { opacity: outOpacity, transform:[{ translateY: outY }] }]}>{from}</Animated.Text>
                    <Animated.Text style={[styles.valNew, colorStyle, { position:'absolute', left:0, right:0, textAlign:'left', opacity: inOpacity, transform:[{ translateY: inY }] }]}>{to}</Animated.Text>
                  </View>
                  {diff !== 0 && (
                    <Text style={[styles.diffBadge, colorStyle]}>{diff>0?`+${diff}`:diff}</Text>
                  )}
                </Animated.View>
              );
            })}
          </View>

          <Animated.View style={{ transform:[{ scale: btnScale }] }}>
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
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:ss(6) },
  headerLeft: { flexDirection:'row', alignItems:'center', flex:1, marginRight:ss(12) },
  pfp: { width:ss(38), height:ss(38), borderRadius:ss(19), backgroundColor:'#e8eef7', marginRight:ss(10) },
  handle: { fontSize:ss(16), fontFamily:'Outfit_600SemiBold', color:'#EAEAEA' },
  subHandle: { marginTop:ss(2), fontSize:ss(11), fontFamily:'Outfit_400Regular', color:'#AEB5C0' },
  ovrGlowWrap: { position:'relative', alignItems:'center', justifyContent:'center' },
  ovrGlow: {
    position:'absolute', left:0, right:0, top:0, bottom:0,
    borderRadius:ss(999),
    backgroundColor:'transparent',
    shadowColor:'#FFFFFF',
    shadowOpacity:0.42,
    shadowRadius:ss(12),
    shadowOffset:{ width:0, height:0 }
  },
  scorePill: { 
    flexDirection:'row', 
    alignItems:'baseline', 
    paddingHorizontal:ss(10), 
    paddingVertical:ss(6), 
    borderRadius:ss(999), 
    borderWidth:1, 
    borderColor:'rgba(255,255,255,0.12)', 
    backgroundColor:'rgba(255,255,255,0.06)',
    // Soft white glow around the pill
    shadowColor:'#FFFFFF',
    shadowOpacity:0.28,
    shadowRadius:ss(10),
    shadowOffset:{ width:0, height:0 }
  },
  scorePillLabel: { fontSize:ss(10), fontFamily:'Outfit_600SemiBold', color:'#AEB5C0', marginRight:ss(6), letterSpacing:0.6 },
  scorePillValue: { fontSize:ss(15), fontFamily:'Outfit_700Bold', color:'#2D9EFF', letterSpacing:0.2 },
  title: { fontFamily:'Outfit_700Bold', fontSize:ss(18), color:'#EAEAEA' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor:'rgba(255,255,255,0.08)', marginTop:ss(12), marginBottom:ss(8), marginHorizontal:-ss(18) },
  grid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginTop:ss(2), marginBottom:ss(10) },
  tile: { width:'48%', backgroundColor:'#1E232C', borderRadius:ss(14), paddingVertical:ss(10), paddingHorizontal:ss(12), marginBottom:ss(10), borderWidth:StyleSheet.hairlineWidth, borderColor:'rgba(255,255,255,0.10)' },
  tileLabel: { fontFamily:'Outfit_600SemiBold', fontSize:ss(13), color:'#EAEAEA' },
  valOld: { fontFamily:'Outfit_700Bold', fontSize:ss(16), color:'#94A3B8' },
  valNew: { fontFamily:'Outfit_700Bold', fontSize:ss(16) },
  diffBadge: { marginTop:ss(4), fontFamily:'Outfit_700Bold', fontSize:ss(13) },
  up: { color:'#2D9EFF' },
  down: { color:'#EF4444' },
  neutral: { color:'#AEB5C0' },
  button: { alignSelf:'center', backgroundColor:'#2D9EFF', paddingHorizontal:ss(22), paddingVertical:ss(10), borderRadius:ss(999) },
  btnText: { color:'#fff', fontFamily:'Outfit_700Bold', fontSize:ss(14) },
});
