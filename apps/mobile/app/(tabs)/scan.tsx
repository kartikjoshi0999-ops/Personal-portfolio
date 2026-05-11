import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, TextInput, Alert, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://solvesphere.ai';

interface SolutionStep {
  step: number;
  expression: string;
  rule: string;
  explanation: string;
}

interface Solution {
  subject: string;
  steps: SolutionStep[];
  finalAnswer: string;
  solveTimeMs?: number;
}

type Mode = 'camera' | 'type' | 'result';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('camera');
  const [latexInput, setLatexInput] = useState('');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedStep, setRevealedStep] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  const captureAndSolve = useCallback(async () => {
    if (!cameraRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
      if (!photo?.base64) throw new Error('No image captured');

      setCapturedUri(photo.uri);
      await solveProblem(photo.base64);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to capture');
    } finally {
      setLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
      setCapturedUri(result.assets[0].uri);
      await solveProblem(result.assets[0].base64);
    }
  }, []);

  const solveProblem = async (imageBase64?: string) => {
    setLoading(true);
    setSolution(null);
    setRevealedStep(0);

    try {
      const res = await fetch(`${API_URL}/api/math/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          latex: latexInput || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Solve failed');
      }

      const data = await res.json();
      setSolution(data);
      setMode('result');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reveal steps one by one
      for (let i = 1; i <= data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setRevealedStep(i);
      }
    } catch (err: any) {
      Alert.alert('Failed to solve', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color="#94a3b8" />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>Grant camera access to scan math problems</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'result' && solution) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <TouchableOpacity onPress={() => { setMode('camera'); setSolution(null); setCapturedUri(null); }}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.resultTitle}>Solution</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{solution.subject}</Text>
            </View>
          </View>

          {capturedUri && (
            <Image source={{ uri: capturedUri }} style={styles.capturedImg} resizeMode="contain" />
          )}

          {/* Steps */}
          <Text style={styles.sectionLabel}>Step-by-Step Solution</Text>
          {solution.steps.slice(0, revealedStep).map((step) => (
            <View key={step.step} style={styles.stepCard}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepExpr}>{step.expression}</Text>
                <Text style={styles.stepRule}>Rule: {step.rule}</Text>
                <Text style={styles.stepExpl}>{step.explanation}</Text>
              </View>
            </View>
          ))}

          {loading && <ActivityIndicator color="#2563eb" style={{ marginVertical: 12 }} />}

          {/* Final Answer */}
          {revealedStep >= solution.steps.length && !loading && (
            <View style={styles.answerCard}>
              <Text style={styles.answerLabel}>Final Answer</Text>
              <Text style={styles.answerText}>{solution.finalAnswer}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Mode Toggle */}
      <View style={styles.modeBar}>
        {(['camera', 'type'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          >
            <Ionicons name={m === 'camera' ? 'camera' : 'keypad'} size={16} color={mode === m ? '#fff' : '#64748b'} />
            <Text style={[styles.modeBtnText, mode === m && { color: '#fff' }]}>
              {m === 'camera' ? 'Camera' : 'Type'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'camera' ? (
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            {/* Crop overlay */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.cropBox}>
                <View style={[styles.corner, { top: 0, left: 0 }]} />
                <View style={[styles.corner, { top: 0, right: 0, transform: [{ rotate: '90deg' }] }]} />
                <View style={[styles.corner, { bottom: 0, left: 0, transform: [{ rotate: '-90deg' }] }]} />
                <View style={[styles.corner, { bottom: 0, right: 0, transform: [{ rotate: '180deg' }] }]} />
              </View>
              <Text style={styles.overlayHint}>Align math problem inside the box</Text>
            </View>
          </CameraView>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={pickFromGallery} style={styles.secondaryBtn}>
              <Ionicons name="images-outline" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={captureAndSolve}
              disabled={loading}
              style={[styles.captureBtn, loading && { opacity: 0.6 }]}
            >
              {loading
                ? <ActivityIndicator color="#2563eb" />
                : <View style={styles.captureBtnInner} />
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn}>
              <Ionicons name="flash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={styles.typeLabel}>Enter LaTeX or math expression</Text>
          <TextInput
            value={latexInput}
            onChangeText={setLatexInput}
            placeholder="e.g. x^2 + 5x + 6 = 0"
            style={styles.latexInput}
            multiline
            numberOfLines={4}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {/* Quick examples */}
          <Text style={styles.examplesLabel}>Quick examples:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['x^2-4=0', '\\int_0^1 x dx', 'd/dx[sin(x)]', 'e^{i\\pi}+1=0'].map((ex) => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => setLatexInput(ex)}
                  style={styles.exampleChip}
                >
                  <Text style={styles.exampleChipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={() => solveProblem()}
            disabled={!latexInput || loading}
            style={[styles.solveBtn, (!latexInput || loading) && { opacity: 0.5 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.solveBtnText}>🧠 Solve Step-by-Step</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  modeBar: { flexDirection: 'row', margin: 12, backgroundColor: '#1e293b', borderRadius: 12, padding: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  modeBtnActive: { backgroundColor: '#2563eb' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 16 },
  cropBox: { width: SCREEN_W * 0.85, height: 180, borderRadius: 8 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 2 },
  overlayHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 32, backgroundColor: 'rgba(0,0,0,0.5)' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb' },
  secondaryBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  latexInput: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'monospace', borderWidth: 1, borderColor: '#334155', minHeight: 100, textAlignVertical: 'top' },
  examplesLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  exampleChip: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  exampleChipText: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' },
  solveBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  solveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Result styles
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  resultTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  badge: { backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#1d4ed8', fontSize: 11, fontWeight: '600' },
  capturedImg: { width: '100%', height: 160, borderRadius: 12, marginBottom: 16, backgroundColor: '#f1f5f9' },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  stepCard: { flexDirection: 'row', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepExpr: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'monospace', marginBottom: 4 },
  stepRule: { fontSize: 11, fontWeight: '600', color: '#2563eb', marginBottom: 2 },
  stepExpl: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  answerCard: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#bfdbfe', marginTop: 8 },
  answerLabel: { fontSize: 11, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  answerText: { fontSize: 22, fontWeight: '700', color: '#1e3a8a', textAlign: 'center', fontFamily: 'monospace' },
  permTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
