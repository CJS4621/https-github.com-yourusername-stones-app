import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

/**
 * Cinematic Splash Screen
 * Plays the 7.9-second Stones intro video on cold launch.
 * Tap anywhere to skip. Auto-advances when video ends.
 *
 * Props:
 *   onFinish — called when splash should be dismissed (video finished OR user tapped)
 */
export default function CinematicSplash({ onFinish }) {
  const videoRef = useRef(null);
  const [hasFinished, setHasFinished] = useState(false);

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
});