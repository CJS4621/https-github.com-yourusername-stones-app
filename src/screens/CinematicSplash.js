import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, StatusBar, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

/**
 * Cinematic Splash Screen
 * Plays the 7.9-second Stones intro video on cold launch.
 * Tap anywhere to skip. Auto-advances when video ends.
 *
 * "Tap to skip" hint fades in at 2.5s and fades out at 6.5s — gives users
 * agency without intruding on the impact moment or the final verse reveal.
 *
 * Props:
 *   onFinish — called when splash should be dismissed (video finished OR user tapped)
 */
export default function CinematicSplash({ onFinish }) {
  const videoRef = useRef(null);
  const [hasFinished, setHasFinished] = useState(false);

  // Hint opacity animates: 0 → fade in at 2.5s → fade out at 6.5s → 0
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Schedule fade-in at 2500ms
    const fadeInTimer = setTimeout(() => {
      Animated.timing(hintOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2500);

    // Schedule fade-out at 6500ms
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 6500);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, [hintOpacity]);

  function handleSkip() {
    if (hasFinished) return;          // ignore taps after auto-finish
    setHasFinished(true);
    try { videoRef.current?.stopAsync(); } catch (_) {}
    onFinish?.();
  }

  function handlePlaybackStatusUpdate(status) {
    if (status?.didJustFinish && !hasFinished) {
      setHasFinished(true);
      onFinish?.();
    }
  }

  return (
    <TouchableWithoutFeedback onPress={handleSkip}>
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <Video
          ref={videoRef}
          source={require('../../assets/splash-cinematic.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted={true}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(err) => {
            // If video fails to load, fall through to main app immediately
            console.warn('Splash video error:', err);
            if (!hasFinished) {
              setHasFinished(true);
              onFinish?.();
            }
          }}
        />
        <Animated.View
          style={[styles.hintContainer, { opacity: hintOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.hintText}>Tap to skip</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050403',  // matches splash bg in case video loading delays
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#C9A04C',                                // gold to match brand
    fontSize: 13,
    fontFamily: 'Georgia',                           // serif — matches the verse
    fontStyle: 'italic',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});