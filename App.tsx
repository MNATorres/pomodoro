import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DEFAULT_MODE, MODES, PomodoroMode } from './src/constants/modes';
import { useTimer } from './src/hooks/useTimer';

function formatTime(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function App() {
  const [mode, setMode] = useState<PomodoroMode>(DEFAULT_MODE);
  const { phase, secondsLeft, running, completedSessions, start, pause, reset } =
    useTimer(mode);

  const isWork = phase === 'work';
  const accent = useMemo(() => (isWork ? '#e2584d' : '#3aa675'), [isWork]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: accent }]}>
      <StatusBar style="light" />

      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const selected = m.id === mode.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m)}
              style={[styles.modeChip, selected && styles.modeChipSelected]}
            >
              <Text
                style={[
                  styles.modeChipText,
                  selected && styles.modeChipTextSelected,
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.timerBlock}>
        <Text style={styles.phaseLabel}>
          {isWork ? 'Trabajo' : 'Descanso'}
        </Text>
        <Text style={styles.time}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.sessions}>
          Sesiones completadas: {completedSessions}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={running ? pause : start}
          style={[styles.button, styles.primaryButton]}
        >
          <Text style={[styles.buttonText, { color: accent }]}>
            {running ? 'Pausar' : 'Iniciar'}
          </Text>
        </Pressable>
        <Pressable onPress={reset} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.buttonText}>Reiniciar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  modeChipSelected: {
    backgroundColor: '#fff',
  },
  modeChipText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modeChipTextSelected: {
    color: '#222',
  },
  timerBlock: {
    alignItems: 'center',
  },
  phaseLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  time: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  sessions: {
    color: '#fff',
    fontSize: 15,
    opacity: 0.85,
  },
  controls: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
