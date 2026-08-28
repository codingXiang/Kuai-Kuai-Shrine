import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

describe('Hourly Green Light Barrier (整點綠光結界)', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;

  function loadShrineDom(initialDate: Date) {
    vi.setSystemTime(initialDate);

    const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

    dom = new JSDOM(htmlContent, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost:3000',
      beforeParse(window: any) {
        window.Date = Date;
        window.setTimeout = setTimeout;
        window.clearTimeout = clearTimeout;
        window.setInterval = setInterval;
        window.clearInterval = clearInterval;
        window.tailwind = { config: {} };
        window.confetti = vi.fn();
        window.requestAnimationFrame = () => 0;
        window.cancelAnimationFrame = () => {};
        window.HTMLCanvasElement.prototype.getContext = () => ({
          clearRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fillText: vi.fn(),
          font: '',
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
        });
      },
    });

    window = dom.window;
    document = window.document;

    return { window, document, dom };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (window) {
      window.close();
    }
  });

  it('triggers hourly green light barrier through the ritual interface when crossing HH:00:00 boundary while page is open', () => {
    // 13:59:50 - 10 seconds before 14:00:00
    const initialTime = new Date('2026-08-27T13:59:50');
    loadShrineDom(initialTime);

    const overlay = document.getElementById('holy-wave-overlay')!;
    const logConsole = document.getElementById('log-console')!;

    // Initially overlay should not be active
    expect(overlay.classList.contains('opacity-100')).toBe(false);

    // Advance past the hour mark (14:00:01)
    vi.advanceTimersByTime(12000);

    // Overlay should now be displayed
    expect(overlay.classList.contains('opacity-100')).toBe(true);

    // Dedicated hourly copy celebrating successfully completing the hour
    expect(overlay.textContent).toContain('整點結界');
    expect(overlay.textContent).toContain('順利度過');

    // Distinct hourly milestone log entry
    expect(logConsole.textContent).toContain('整點綠光結界');
  });

  it('does not fire duplicate rituals for the same hour despite timer ticks or jitter', () => {
    // 13:59:55
    const initialTime = new Date('2026-08-27T13:59:55');
    loadShrineDom(initialTime);

    const logConsole = document.getElementById('log-console')!;

    // Advance by 10s -> crosses to 14:00:05 (first trigger)
    vi.advanceTimersByTime(10000);

    // Count how many times the hourly milestone log appears
    const matches1 = logConsole.innerHTML.match(/\[HOURLY BARRIER\]/g) || [];
    expect(matches1.length).toBe(1);

    // Advance by another 60s (still 14:01:05, same hour)
    vi.advanceTimersByTime(60000);

    const matches2 = logConsole.innerHTML.match(/\[HOURLY BARRIER\]/g) || [];
    expect(matches2.length).toBe(1);

    // Advance to next hour: 14:59:55 -> 15:00:05
    vi.advanceTimersByTime(59 * 60 * 1000);
    const matches3 = logConsole.innerHTML.match(/\[HOURLY BARRIER\]/g) || [];
    expect(matches3.length).toBe(2);
  });

  it('does not backfill or immediately trigger on initial page load within an already started hour', () => {
    // Open page at 14:00:05 (5 seconds after hour started) or 14:30:00
    const initialTime = new Date('2026-08-27T14:00:05');
    loadShrineDom(initialTime);

    const overlay = document.getElementById('holy-wave-overlay')!;
    const logConsole = document.getElementById('log-console')!;

    // Advance 5 seconds within the same hour
    vi.advanceTimersByTime(5000);

    expect(overlay.classList.contains('opacity-100')).toBe(false);
    expect(logConsole.textContent).not.toContain('整點綠光結界');
  });

  it('automatically hides the hourly overlay after approximately 3000ms', () => {
    // 13:59:59.500
    const initialTime = new Date('2026-08-27T13:59:59');
    loadShrineDom(initialTime);

    const overlay = document.getElementById('holy-wave-overlay')!;

    // Step across hour mark (triggers at 1000ms)
    vi.advanceTimersByTime(1000); // 14:00:00
    expect(overlay.classList.contains('opacity-100')).toBe(true);

    // After 2000ms since trigger (total 3000ms), still visible
    vi.advanceTimersByTime(2000);
    expect(overlay.classList.contains('opacity-100')).toBe(true);

    // After 3000ms duration has elapsed (+1100ms, total 4100ms), overlay should be dismissed
    vi.advanceTimersByTime(1100);
    expect(overlay.classList.contains('opacity-100')).toBe(false);
    expect(overlay.classList.contains('opacity-0')).toBe(true);
  });

  it('triggers confetti when hourly ritual fires', () => {
    const initialTime = new Date('2026-08-27T13:59:58');
    const { window } = loadShrineDom(initialTime);

    expect(window.confetti).not.toHaveBeenCalled();

    // Advance across hour mark
    vi.advanceTimersByTime(3000);

    expect(window.confetti).toHaveBeenCalled();
  });

  it('remains resilient when audio playback fails or is blocked by browser autoplay rules', () => {
    const initialTime = new Date('2026-08-27T13:59:58');
    const { window, document } = loadShrineDom(initialTime);

    // Mock AudioContext to throw when initialized (simulating autoplay block)
    window.AudioContext = vi.fn().mockImplementation(() => {
      throw new Error('NotAllowedError: play() failed because the user didn\'t interact with the document first.');
    });

    const overlay = document.getElementById('holy-wave-overlay')!;
    const logConsole = document.getElementById('log-console')!;

    // Advance across hour mark
    vi.advanceTimersByTime(3000);

    // Visual overlay and log must still appear despite audio error
    expect(overlay.classList.contains('opacity-100')).toBe(true);
    expect(logConsole.textContent).toContain('整點綠光結界');
    expect(window.confetti).toHaveBeenCalled();
  });

  it('routes the manual holy wave button through the ritual interface with manual copy, effects, and duration', () => {
    const initialTime = new Date('2026-08-27T14:15:00');
    const { window } = loadShrineDom(initialTime);

    const audioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      currentTime: 0,
      resume: vi.fn(),
      createOscillator: vi.fn(),
      createGain: vi.fn(),
    }));
    window.AudioContext = audioContext;

    const btnHolyWave = document.getElementById('btn-holy-wave')!;
    const overlay = document.getElementById('holy-wave-overlay')!;
    const logConsole = document.getElementById('log-console')!;

    expect(overlay.classList.contains('opacity-100')).toBe(false);
    expect(window.confetti).not.toHaveBeenCalled();

    btnHolyWave.click();

    expect(audioContext).toHaveBeenCalledOnce();
    expect(overlay.classList.contains('opacity-100')).toBe(true);
    expect(overlay.textContent).toContain('綠燈高照・萬事金順');
    expect(overlay.textContent).toContain('ALL TRAFFIC GREEN • 0 DOWNTIME');
    expect(logConsole.textContent).toContain('[HOLY WAVE] 全螢幕神聖綠燈結界釋放');
    expect(window.confetti).toHaveBeenCalledWith({
      particleCount: 120,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#00ff88', '#10b981', '#fef08a', '#ffffff']
    });

    vi.advanceTimersByTime(1000);
    expect(overlay.classList.contains('opacity-100')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(overlay.classList.contains('opacity-100')).toBe(false);
  });

  it('exposes a narrow page-facing Green Light Barrier Ritual interface', () => {
    const initialTime = new Date('2026-08-27T14:15:00');
    const { window } = loadShrineDom(initialTime);

    expect(window.GreenLightBarrierRitual).toEqual({
      triggerManual: expect.any(Function),
      startHourly: expect.any(Function),
      cleanup: expect.any(Function),
    });
  });

  it('cleans up the hourly ritual timer through the ritual interface', () => {
    const initialTime = new Date('2026-08-27T13:59:58');
    const { window } = loadShrineDom(initialTime);

    window.GreenLightBarrierRitual.cleanup();
    vi.advanceTimersByTime(3000);

    const logConsole = document.getElementById('log-console')!;
    expect(logConsole.textContent).not.toContain('整點綠光結界');
  });
});
