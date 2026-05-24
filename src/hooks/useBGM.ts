'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 全局单例音频实例
let globalAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let isInitialized = false;
let hasUserInteracted = false;

// 监听用户交互，用于处理浏览器自动播放策略
function initUserInteractionListener() {
  if (typeof window === 'undefined' || isInitialized) return;
  
  isInitialized = true;
  
  const handleUserInteraction = () => {
    hasUserInteracted = true;
    // 如果有暂停的音乐，尝试恢复播放
    if (globalAudio && globalAudio.paused && currentTrack) {
      globalAudio.play().catch((error) => {
        console.warn('[BGM] 恢复播放失败:', error);
      });
    }
    // 移除监听器
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };
  
  document.addEventListener('click', handleUserInteraction, { once: true });
  document.addEventListener('touchstart', handleUserInteraction, { once: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true });
}

// 淡出音频
function fadeOutAudio(audio: HTMLAudioElement, duration: number = 500): Promise<void> {
  return new Promise((resolve) => {
    if (audio.paused) {
      resolve();
      return;
    }
    
    const startVolume = audio.volume;
    const startTime = Date.now();
    
    const fadeOutInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      audio.volume = startVolume * (1 - progress);
      
      if (progress >= 1) {
        clearInterval(fadeOutInterval);
        audio.pause();
        audio.volume = 1; // 重置音量
        resolve();
      }
    }, 16); // 约60fps
  });
}

// 播放 BGM
export async function playBGM(trackName: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // 初始化用户交互监听
  initUserInteractionListener();
  
  // 如果是同一首歌，不做任何操作
  if (currentTrack === trackName && globalAudio && !globalAudio.paused) {
    return;
  }
  
  // 如果有正在播放的音乐，先淡出
  if (globalAudio && !globalAudio.paused) {
    await fadeOutAudio(globalAudio);
  }
  
  // 创建新的音频实例或复用现有实例
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = true;
    globalAudio.volume = 0.7; // 默认音量 70%
  }
  
  // 设置新的音源
  globalAudio.src = trackName;
  currentTrack = trackName;
  
  // 尝试播放
  try {
    await globalAudio.play();
    console.log(`[BGM] 开始播放: ${trackName}`);
  } catch (error) {
    console.warn('[BGM] 自动播放被浏览器策略拦截，请点击页面任意位置开始播放音乐', error);
    // 不抛出错误，等待用户交互后自动恢复
  }
}

// 停止 BGM
export async function stopBGM(): Promise<void> {
  if (typeof window === 'undefined' || !globalAudio) return;
  
  if (!globalAudio.paused) {
    await fadeOutAudio(globalAudio);
  }
  
  currentTrack = null;
  console.log('[BGM] 停止播放');
}

// 自定义 Hook
export function useBGM(trackName: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 组件挂载时播放，卸载时停止
  useEffect(() => {
    if (trackName) {
      playBGM(trackName).then(() => {
        setIsPlaying(true);
      });
    }
    
    return () => {
      if (trackName) {
        stopBGM().then(() => {
          setIsPlaying(false);
        });
      }
    };
  }, [trackName]);
  
  // 提供手动控制方法
  const manualPlay = useCallback(() => {
    if (trackName) {
      playBGM(trackName);
    }
  }, [trackName]);
  
  const manualStop = useCallback(() => {
    stopBGM();
  }, []);
  
  return {
    isPlaying,
    play: manualPlay,
    stop: manualStop,
  };
}
