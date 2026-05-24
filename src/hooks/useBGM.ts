'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 全局单例音频实例和状态
let globalAudio: HTMLAudioElement | null = null;
let currentTrackName: string | null = null;
let activeMountCount = 0;
let isInitialized = false;
let hasUserInteracted = false;
let audioRefCount: Record<string, number> = {}; // 每个 track 的引用计数

// 监听用户交互，用于处理浏览器自动播放策略
function initUserInteractionListener() {
  if (typeof window === 'undefined' || isInitialized) return;
  
  isInitialized = true;
  
  const handleUserInteraction = () => {
    hasUserInteracted = true;
    // 如果有暂停的音乐，尝试恢复播放
    if (globalAudio && globalAudio.paused && currentTrackName) {
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

// 确保单例音频实例
function ensureAudioInstance() {
  if (typeof window === 'undefined') return null;
  
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = true;
    globalAudio.volume = 0.7; // 默认音量 70%
  }
  return globalAudio;
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
        audio.volume = 0.7; // 重置到默认音量
        resolve();
      }
    }, 16); // 约60fps
  });
}

// 淡入音频
function fadeInAudio(audio: HTMLAudioElement, duration: number = 500): Promise<void> {
  return new Promise(async (resolve) => {
    audio.volume = 0;
    try {
      await audio.play();
    } catch (error) {
      console.warn('[BGM] 自动播放被拦截:', error);
      resolve();
      return;
    }
    
    const startTime = Date.now();
    
    const fadeInInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      audio.volume = progress * 0.7;
      
      if (progress >= 1) {
        clearInterval(fadeInInterval);
        audio.volume = 0.7;
        resolve();
      }
    }, 16); // 约60fps
  });
}

// 播放 BGM（单例管理）
export async function playBGM(trackName: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // 初始化用户交互监听
  initUserInteractionListener();
  
  const audio = ensureAudioInstance();
  if (!audio) return;
  
  // 如果是同一首歌正在播放，不做任何操作
  if (currentTrackName === trackName && !audio.paused) {
    console.log(`[BGM] ${trackName} 已在播放中`);
    return;
  }
  
  // 如果有正在播放的音乐且不是同一首，先淡出
  if (!audio.paused && currentTrackName !== trackName) {
    await fadeOutAudio(audio);
  }
  
  // 设置新的音源
  audio.src = trackName;
  currentTrackName = trackName;
  
  // 淡入播放
  try {
    await fadeInAudio(audio);
    console.log(`[BGM] 开始播放: ${trackName}`);
  } catch (error) {
    console.warn('[BGM] 自动播放被浏览器策略拦截，请点击页面任意位置开始播放音乐', error);
  }
}

// 停止 BGM（单例管理）
export async function stopBGM(): Promise<void> {
  if (typeof window === 'undefined' || !globalAudio) return;
  
  if (!globalAudio.paused) {
    await fadeOutAudio(globalAudio);
  }
  
  currentTrackName = null;
  console.log('[BGM] 停止播放');
}

// 自定义 Hook（引用计数管理）
export function useBGM(trackName: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasMounted = useRef(false);
  
  // 组件挂载时增加引用计数，卸载时减少引用计数
  useEffect(() => {
    if (!trackName) return;
    
    // 初始化引用计数
    if (!audioRefCount[trackName]) {
      audioRefCount[trackName] = 0;
    }
    
    // 增加引用计数
    audioRefCount[trackName]++;
    activeMountCount++;
    hasMounted.current = true;
    
    console.log(`[BGM] 挂载 ${trackName}, 引用计数: ${audioRefCount[trackName]}`);
    
    // 如果是第一个挂载，播放音乐
    if (audioRefCount[trackName] === 1) {
      playBGM(trackName).then(() => {
        setIsPlaying(true);
      });
    } else {
      // 已经在播放，直接设置状态
      setIsPlaying(currentTrackName === trackName && !globalAudio?.paused);
    }
    
    return () => {
      if (!hasMounted.current || !trackName) return;
      
      // 减少引用计数
      audioRefCount[trackName]--;
      activeMountCount--;
      
      console.log(`[BGM] 卸载 ${trackName}, 引用计数: ${audioRefCount[trackName]}`);
      
      // 如果引用计数为 0，停止播放
      if (audioRefCount[trackName] <= 0) {
        audioRefCount[trackName] = 0;
        // 只有当前播放的就是这首歌时才停止
        if (currentTrackName === trackName) {
          stopBGM().then(() => {
            setIsPlaying(false);
          });
        }
      }
      
      hasMounted.current = false;
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
