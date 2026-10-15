import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GuessInSix from './components/GuessInSix';
import Clock from './components/Clock';

export default function App() {
  const [game, setGame] = useState('');

  return (
    <View style={[styles.container, !game && styles.menuContainer]}>
      {!game && (
        <View style={styles.card}>
          <Text style={styles.label}>Choose game mode:</Text>

          <Pressable style={styles.button} onPress={() => setGame('guess')}>
            <Text style={styles.buttonText}>Guess in 6</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={() => setGame('timed')}>
            <Text style={styles.buttonText}>Against the clock</Text>
          </Pressable>
        </View>
      )}

      {game === 'guess' && <GuessInSix onHome={() => setGame('')} />}
      {game === 'timed' && <Clock onHome={() => setGame('')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menuContainer: { paddingTop: 60, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
    alignItems: 'center',
  },
  label: { color: '#374151', fontWeight: '500', fontSize: 16 },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});