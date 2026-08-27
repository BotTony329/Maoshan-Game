/**
 * 合成音效 —— 纯 WebAudio 振荡器/噪声合成，无音频素材。
 * 浏览器要求 AudioContext 在用户手势后才能出声：首次 play 时惰性创建，
 * 主菜单的“开始”点击即满足手势条件。
 */
import type { SfxName } from '../game/types';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  /** 同名音效的最短重播间隔（毫秒），防止弹幕刷屏式爆音 */
  private lastPlayed = new Map<SfxName, number>();

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  resume(): void {
    this.ctx?.resume().catch(() => undefined);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }

    const now = performance.now();
    const throttleMs = name === 'hit' ? 55 : name === 'shoot' ? 70 : name === 'kill' ? 60 : name === 'pickup' ? 45 : 0;
    if (throttleMs > 0 && now - (this.lastPlayed.get(name) ?? 0) < throttleMs) return;
    this.lastPlayed.set(name, now);

    const t0 = ctx.currentTime;
    switch (name) {
      case 'shoot': this.blip(t0, 880, 320, 0.07, 'sine', 0.5); break;
      case 'hit': this.blip(t0, 220, 160, 0.045, 'square', 0.35); break;
      case 'kill': this.noise(t0, 0.14, 900, 0.5); this.blip(t0, 330, 60, 0.16, 'triangle', 0.5); break;
      case 'hurt': this.blip(t0, 160, 70, 0.22, 'sawtooth', 0.7); break;
      case 'pickup': this.blip(t0, 760, 1240, 0.07, 'sine', 0.4); break;
      case 'heal': this.blip(t0, 520, 780, 0.2, 'sine', 0.45); this.blip(t0 + 0.1, 660, 990, 0.2, 'sine', 0.35); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.blip(t0 + i * 0.07, f, f, 0.12, 'triangle', 0.5)); break;
      case 'select': this.blip(t0, 600, 900, 0.06, 'triangle', 0.4); break;
      case 'thunder': this.noise(t0, 0.3, 2400, 0.7); this.blip(t0, 90, 40, 0.3, 'sawtooth', 0.6); break;
      case 'bell': this.blip(t0, 1180, 1160, 0.5, 'sine', 0.4); this.blip(t0, 1770, 1700, 0.35, 'sine', 0.2); break;
      case 'boss': this.blip(t0, 98, 62, 0.7, 'sawtooth', 0.8); this.blip(t0 + 0.05, 147, 92, 0.65, 'square', 0.35); break;
      case 'bomb': this.noise(t0, 0.45, 700, 0.9); this.blip(t0, 120, 30, 0.45, 'triangle', 0.8); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.blip(t0 + i * 0.12, f, f, 0.18, 'triangle', 0.5)); break;
    }
  }

  /** 短促滑音 */
  private blip(t: number, from: number, to: number, dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** 带低通下扫的噪声爆破 */
  private noise(t: number, dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
  }
}

/** 全局单例：场景间共享音量/静音状态 */
export const sfx = new Sfx();
