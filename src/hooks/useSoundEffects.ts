import { useEffect, useRef, useCallback } from 'react';

// 音效文件映射
const SOUND_FILES = {
  normal_attack: '/sounds/normal_attack.wav',
  freeze_ability: '/sounds/freeze_ability.wav',
  shield_block: '/sounds/shield_block.wav',
  real_attack: '/sounds/real_attack.wav',
  eeeee: '/sounds/eeeee.mp3',
  victory: '/sounds/victory.wav',
  fail: '/sounds/fail.wav'
} as const;

type SoundType = keyof typeof SOUND_FILES;

export function useSoundEffects() {
  // 用于存储所有活跃的 Audio 实例，支持并发播放
  const activeAudiosRef = useRef<Set<HTMLAudioElement>>(new Set());

  // 播放音效的核心函数
  const playSound = useCallback((type: SoundType) => {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio(SOUND_FILES[type]);
      audio.volume = 0.7;
      
      // 将音频添加到活跃集合
      activeAudiosRef.current.add(audio);
      
      // 播放完成后从集合中移除
      audio.onended = () => {
        activeAudiosRef.current.delete(audio);
      };
      
      // 播放出错时也从集合中移除
      audio.onerror = () => {
        activeAudiosRef.current.delete(audio);
        console.warn(`音效播放失败: ${type}`);
      };
      
      // 播放音效（支持并发）
      audio.play().catch(error => {
        console.warn(`音效播放被阻止: ${type}`, error);
        activeAudiosRef.current.delete(audio);
      });
    } catch (error) {
      console.warn(`音效初始化失败: ${type}`, error);
    }
  }, []);

  // 清理函数：停止所有活跃的音效
  const stopAllSounds = useCallback(() => {
    activeAudiosRef.current.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        // 忽略清理时的错误
      }
    });
    activeAudiosRef.current.clear();
  }, []);

  // 组件卸载时清理所有音效
  useEffect(() => {
    return () => {
      stopAllSounds();
    };
  }, [stopAllSounds]);

  return {
    playSound,
    stopAllSounds,
    // 便捷方法
    playNormalAttack: () => playSound('normal_attack'),
    playFreezeAbility: () => playSound('freeze_ability'),
    playShieldBlock: () => playSound('shield_block'),
    playRealAttack: () => playSound('real_attack'),
    playEeeee: () => playSound('eeeee'),
    playVictory: () => playSound('victory'),
    playFail: () => playSound('fail')
  };
}
