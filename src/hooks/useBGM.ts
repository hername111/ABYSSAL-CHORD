'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 全局单例音频实例和状态
let globalAudio: HTMLAudioElement | null = null;
let currentTrackName: string | null = null;
let isInitialized = false;
let hasUserInteracted = false;

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
    console.log('[BGM] 音频实例已创建');
  }
  return globalAudio;
}

// 淡出音频
async function fadeOutAudio(audio: HTMLAudioElement, duration: number = 300): Promise<void> {
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
async function fadeInAudio(audio: HTMLAudioElement, duration: number = 300): Promise<void> {
  return new Promise(async (resolve, reject) => {
    audio.volume = 0;
    try {
      await audio.play();
    } catch (error) {
      console.warn('[BGM] 自动播放被拦截:', error);
      reject(error);
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
  
  console.log(`[BGM] 尝试播放: ${trackName}`);
  
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
    console.log(`[BGM] 淡出当前音乐: ${currentTrackName}`);
    await fadeOutAudio(audio);
  }
  
  // 设置新的音源
  audio.src = trackName;
  currentTrackName = trackName;
  
  // 淡入播放
  try {
    await fadeInAudio(audio);
    console.log(`[BGM] 成功开始播放: ${trackName}`);
  } catch (error) {
    console.warn('[BGM] 自动播放被浏览器策略拦截，请点击页面任意位置开始播放音乐');
  }
}

// 停止 BGM（单例管理）
export async function stopBGM(): Promise<void> {
  if (typeof window === 'undefined' || !globalAudio) return;
  
  console.log(`[BGM] 尝试停止: ${currentTrackName}`);
  
  if (!globalAudio.paused) {
    await fadeOutAudio(globalAudio);
  }
  
  currentTrackName = null;
  console.log('[BGM] 已停止播放');
}

// 自定义 Hook（简化版）
export function useBGM(trackName: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasMounted = useRef(false);
  
  // 组件挂载时播放，卸载时检查是否需要停止
  useEffect(() => {
    if (!trackName) return;
    
    console.log(`[BGM] 组件挂载: ${trackName}`);
    hasMounted.current = true;
    
    // 播放音乐
    playBGM(trackName).then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
    
    // 定期检查播放状态
    const checkInterval = setInterval(() => {
      if (globalAudio) {
        setIsPlaying(!globalAudio.paused);
      }
    }, 500);
    
    return () => {
      if (!hasMounted.current || !trackName) return;
      
      console.log(`[BGM] 组件卸载: ${trackName}`);
      clearInterval(checkInterval);
      
      // 只有当卸载的 track 就是当前正在播放的，才停止
      if (currentTrackName === trackName) {
        stopBGM().then(() => {
          setIsPlaying(false);
        });
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
