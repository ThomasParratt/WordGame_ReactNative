import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import answers from '../assets/answers.json';
import words from '../assets/words.json';

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const COLORS = {
  green: '#16a34a',
  orange: '#fbbf24',
  gray: '#4b5563',
  empty: '#d1d5db',
  filled: '#4b5563',
  key: '#d1d5db',
};

const RANK = { gray: 1, orange: 2, green: 3 };

function getRandomWordArray() {
  const randomIndex = Math.floor(Math.random() * answers.length);
  return answers[randomIndex].toUpperCase().split('');
}

function wordExists(charArray) {
  return words.includes(charArray.join('').toLowerCase());
}

function evaluateGuess(guess, answer) {
  const result = Array(5).fill(null);
  const answerCounts = {};

  answer.forEach((l, i) => {
    if (guess[i] !== l) answerCounts[l] = (answerCounts[l] || 0) + 1;
  });

  guess.forEach((letter, i) => {
    if (letter === answer[i]) result[i] = 'green';
  });

  guess.forEach((letter, i) => {
    if (result[i] === 'green') return;
    if (answerCounts[letter] > 0) {
      result[i] = 'orange';
      answerCounts[letter]--;
    } else {
      result[i] = 'gray';
    }
  });

  return result;
}

/* ---------------------------------- Tile ---------------------------------- */

function Tile({ letter, result, anim, col, size }) {
  const flip = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const bounceY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!anim) return;

    if (anim === 'flip') {
      Animated.sequence([
        Animated.delay(col * 150),
        Animated.timing(flip, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(flip, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (anim === 'shake') {
      const step = (to) =>
        Animated.timing(shakeX, { toValue: to, duration: 60, useNativeDriver: true });
      Animated.sequence([step(-8), step(8), step(-6), step(6), step(0)]).start();
    } else if (anim === 'bounce') {
      Animated.sequence([
        Animated.delay(col * 100),
        Animated.timing(bounceY, { toValue: -24, duration: 200, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [anim]);

  const rotateX = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  let backgroundColor = '#fff';
  let borderColor = COLORS.empty;
  let borderWidth = 2;
  let textColor = '#000';

  if (result) {
    backgroundColor = COLORS[result];
    borderWidth = 0;
    textColor = '#fff';
  } else if (letter) {
    borderColor = COLORS.filled;
  }

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor,
          borderWidth,
          transform: [
            { perspective: 1000 },
            { rotateX },
            { translateX: shakeX },
            { translateY: bounceY },
          ],
        },
      ]}
    >
      <Text style={[styles.tileText, { color: textColor, fontSize: size * 0.55 }]}>
        {letter}
      </Text>
    </Animated.View>
  );
}

/* ------------------------------ Main component ----------------------------- */

export default function Clock({ onHome }) {
  const { width } = useWindowDimensions();
  const tileSize = Math.min((width - 32) / 5 - 4, 64);

  const [answer] = useState(getRandomWordArray);
  const [typed, setTyped] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [tileResults, setTileResults] = useState([]);
  const [keyStatus, setKeyStatus] = useState({});
  const [win, setWin] = useState(false);
  const [busy, setBusy] = useState(false); // true while a row is being revealed
  const [notWord, setNotWord] = useState(false);
  const [message, setMessage] = useState('');
  const [rowAnim, setRowAnim] = useState({ row: null, type: null });
  const [seconds, setSeconds] = useState(0);

  const scrollRef = useRef(null);
  const timers = useRef([]);

  // setTimeout that gets cleaned up if the component unmounts
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Stopwatch: stops once the word is solved
  useEffect(() => {
    if (win) return;
    const interval = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [win]);

  const charsInRow = typed.length - attempts * 5;

  const submitGuess = () => {
    const start = attempts * 5;
    const guess = typed.slice(start, start + 5).split('');

    if (!wordExists(guess)) {
      setNotWord(true);
      setMessage('Word not in list');
      setRowAnim({ row: attempts, type: 'shake' });
      later(() => setRowAnim({ row: null, type: null }), 400);
      return;
    }

    const result = evaluateGuess(guess, answer);
    const isWin = guess.join('') === answer.join('');
    const row = attempts;

    setBusy(true);

    // Flip the row, then bounce if it's a win
    setRowAnim({ row, type: 'flip' });
    later(() => {
      if (isWin) {
        setRowAnim({ row, type: 'bounce' });
        later(() => setRowAnim({ row: null, type: null }), 1000);
      } else {
        setRowAnim({ row: null, type: null });
      }
    }, 1200);

    if (isWin) {
      setWin(true);
      setMessage(`Completed in ${seconds} seconds`);
    }

    // Reveal tile colours at the midpoint of each tile's flip
    result.forEach((r, i) => {
      later(() => {
        setTileResults((prev) => {
          const updated = [...prev];
          updated[start + i] = r;
          return updated;
        });
      }, i * 150 + 300);
    });

    // After the flip: update keyboard colours and move on to the next row
    later(() => {
      setKeyStatus((prev) => {
        const next = { ...prev };
        guess.forEach((letter, i) => {
          const current = next[letter];
          if (!current || RANK[result[i]] > RANK[current]) {
            next[letter] = result[i];
          }
        });
        return next;
      });
      if (!isWin) setAttempts((prev) => prev + 1);
      setBusy(false);
    }, 1200);
  };

  const handleKey = (key) => {
    setNotWord(false);
    if (win || busy) return;

    if (key === 'ENTER') {
      if (charsInRow === 5) submitGuess();
    } else if (key === 'BACK') {
      if (charsInRow > 0) setTyped((prev) => prev.slice(0, -1));
    } else if (charsInRow < 5) {
      setTyped((prev) => prev + key);
    }
  };

  const rowCount = attempts + 1;

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityLabel="Return to home"
        accessibilityRole="button"
        onPress={onHome}
        style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.homeButtonText}>{"<"}</Text>
      </Pressable>

      {/* Timer / status banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{win || notWord ? message : seconds}</Text>
      </View>

      {/* Board (grows one row per attempt, so it scrolls) */}
      <ScrollView
        ref={scrollRef}
        style={styles.boardScroll}
        contentContainerStyle={styles.board}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {Array.from({ length: rowCount }).map((_, row) => (
          <View key={row} style={styles.boardRow}>
            {Array.from({ length: 5 }).map((__, col) => {
              const index = row * 5 + col;
              return (
                <Tile
                  key={index}
                  letter={typed[index]}
                  result={tileResults[index]}
                  anim={rowAnim.row === row ? rowAnim.type : null}
                  col={col}
                  size={tileSize}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Keyboard */}
      <View style={styles.keyboard}>
        {KEY_ROWS.map((rowKeys, r) => (
          <View key={r} style={styles.keyRow}>
            {rowKeys.map((key) => {
              const status = keyStatus[key];
              const isWide = key === 'ENTER' || key === 'BACK';
              return (
                <Pressable
                  key={key}
                  onPress={() => handleKey(key)}
                  style={({ pressed }) => [
                    styles.key,
                    isWide && styles.keyWide,
                    { backgroundColor: status ? COLORS[status] : COLORS.key },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isWide && styles.keyTextSmall,
                      { color: status ? '#fff' : '#000' },
                    ]}
                  >
                    {key === 'BACK' ? '⌫' : key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/* --------------------------------- Styles ---------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 80,
  },
  homeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 24
  },
  banner: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 56,
    marginBottom: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  boardScroll: {
    flex: 1,
    width: '100%',
  },
  board: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 12,
  },
  boardRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontWeight: '700',
  },
  keyboard: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 6,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: {
    flex: 1.6,
  },
  keyText: {
    fontSize: 18,
    fontWeight: '700',
  },
  keyTextSmall: {
    fontSize: 12,
  },
});