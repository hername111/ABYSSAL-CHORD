'use client';

import { useEffect, useState, useCallback } from 'react';

// 全局单例音频实例
let globalAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let isInitialized = false;
let hasUserInteracted = false;

// 初始化用户交互监听
function initUserInteraction() {
  if (typeof window === 'undefined' || isInitialized) return;
  
  isInitialized = true;
  
  const tryPlay = () => {
    hasUserInteracted = true;
    if (globalAudio && currentTrack && globalAudio.paused) {
      globalAudio.play().catch(() => {
        console.warn('[BGM] 自动播放失败');
      });
    }
    // 移除监听器
    document.removeEventListener('click', tryPlay);
    document.removeEventListener('touchstart', tryPlay);
    document.removeEventListener('keydown', tryPlay);
  };
  
  document.addEventListener('click', tryPlay, { once: true });
  document.addEventListener('touchstart', tryPlay, { once: true });
  document.addEventListener('keydown', tryPlay, { once: true });
}

// 确保有音频实例
function getAudio() {
  if (typeof window === 'undefined') return null;
  
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = true;
    globalAudio.volume = 0.7;
    console.log('[BGM] 创建音频实例');
  }
  return globalAudio;
}

// 简单直接的播放函数
function simplePlay(track: string) {
  if (typeof window === 'undefined') return;
  
  console.log('[BGM] 播放:', track);
  
  initUserInteraction();
  const audio = getAudio();
  if (!audio) return;
  
  // 如果已经在播放同一首歌，什么都不做
  if (currentTrack === track && !audio.paused) {
    console.log('[BGM] 已在播放:', track);
    return;
  }
  
  // 如果有其他歌在播放，先停掉
  if (!audio.paused) {
    audio.pause();
  }
  
  // 设置新源并播放
  audio.src = track;
  currentTrack = track;
  
  audio.play().catch((error) => {
    console.warn('[BGM] 自动播放被拦截，请点击页面:', error);
  });
}

// 简单直接的停止函数
function simpleStop() {
  if (typeof window === 'undefined' || !globalAudio) return;
  
  console.log('[BGM] 停止:', currentTrack);
  
  if (!globalAudio.paused) {
    globalAudio.pause();
  }
  currentTrack = null;
}

// 最简化的 Hook
export function useBGM(trackName: string | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 定期同步播放状态
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const interval = setInterval(() => {
      if (globalAudio) {
        setIsPlaying(!globalAudio.paused);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, []);
  
  // 组件挂载时播放，卸载时停止（如果是当前播放的）
  useEffect(() => {
    if (!trackName || typeof window === 'undefined') return;
    
    console.log('[BGM] 组件挂载:', trackName);
    
    // 立即播放
    simplePlay(trackName);
    setIsPlaying(true);
    
    return () => {
      console.log('[BGM] 组件卸载:', trackName);
      
      // 只有当卸载的 track 正是当前播放的，才停止
      if (currentTrack === trackName) {
        simpleStop();
        setIsPlaying(false);
      }
    };
  }, [trackName]);
  
  // 手动控制
  const play = useCallback(() => {
    if (trackName) {
      simplePlay(trackName);
    }
  }, [trackName]);
  
  const stop = useCallback(() => {
    simpleStop();
  }, []);
  
  return {
    isPlaying,
    play,
    stop,
  };
}

// 直接导出播放/停止函数供外部调用
export { simplePlay as playBGM, simpleStop as stopBGM };
