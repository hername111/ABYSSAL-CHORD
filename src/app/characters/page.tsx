'use client';

import { characters } from '@/lib/game-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Heart, Shield, Zap, BookOpen, Sword } from 'lucide-react';

export default function CharactersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide">
          <span className="text-sonic-purple">TUNERS</span> — 调音师
        </h1>
        <p className="text-muted-foreground mt-1">
          在旧日回音的侵蚀下，唯有共谐者能将声波频率化为武器
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {characters.map((char) => (
          <Card
            key={char.id}
            className={cn(
              'border-sonic-purple/20 bg-abyss-light/80 overflow-hidden',
              'hover:border-sonic-purple/40 transition-all duration-300'
            )}
          >
            {/* 角色头部 */}
            <div className="relative p-6 pb-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sonic-purple/60 via-armor-blue/60 to-sonic-purple/60" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{char.name}</h2>
                  <p className="text-sm text-sonic-purple font-display">{char.nameEn}</p>
                </div>
                <Badge className="bg-sonic-purple/20 text-sonic-purple border-sonic-purple/30 text-xs">
                  {char.title}
                </Badge>
              </div>

              {/* 基础属性 */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span className="font-display font-bold text-red-400">{char.maxHp}</span>
                  <span className="text-muted-foreground text-xs">生命值</span>
                </div>
              </div>
            </div>

            <CardContent className="space-y-4 px-6 pb-6">
              {/* 初始遗物 */}
              <div className="rounded-lg bg-abyss/60 border border-gold/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-gold" />
                  <span className="text-xs font-medium text-gold">初始遗物：{char.relic}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{char.relicEffect}</p>
              </div>

              {/* 角色背景 */}
              <div className="rounded-lg bg-abyss/60 border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">背景</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{char.lore}</p>
              </div>

              <Separator className="bg-white/5" />

              {/* 流派 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sword className="h-3.5 w-3.5 text-sonic-purple" />
                  <span className="text-xs font-medium text-sonic-purple">核心流派</span>
                </div>
                {char.archetypes.map((arch, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg border p-3',
                      i === 0
                        ? 'bg-blue-500/5 border-blue-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={cn(
                          'text-[10px] h-5',
                          i === 0
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        )}
                      >
                        {arch.nameEn}
                      </Badge>
                      <span className={cn(
                        'text-sm font-medium',
                        i === 0 ? 'text-blue-400' : 'text-red-400'
                      )}>
                        {arch.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {arch.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
