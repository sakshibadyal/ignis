import { useEffect, useRef } from "react";

export default function StarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    class Particle {
      x!: number; y!: number; r!: number;
      vx!: number; vy!: number;
      alpha!: number; fade!: number; dir!: number;

      constructor() { this.reset(true); }

      reset(init: boolean) {
        this.x     = Math.random() * canvas.width;
        this.y     = init ? Math.random() * canvas.height : -10;
        this.r     = Math.random() * 1.6 + 0.4;
        this.vx    = (Math.random() - 0.5) * 0.2;
        this.vy    = Math.random() * 0.18 + 0.04;
        this.alpha = Math.random() * 0.7 + 0.15;
        this.fade  = Math.random() * 0.003 + 0.001;
        this.dir   = Math.random() > 0.5 ? 1 : -1;
      }

      update() {
        this.x += this.vx + Math.sin(Date.now() * 0.0003 + this.y * 0.01) * 0.05;
        this.y += this.vy;
        this.alpha += this.fade * this.dir;
        if (this.alpha < 0.05 || this.alpha > 0.9) this.dir *= -1;
        if (this.y > canvas.height + 10) this.reset(false);
      }

      draw() {
        const t = Math.max(0, (this.y / canvas.height - 0.35) * 2);
        const r = Math.round(255 * (1 - t) + 13  * t);
        const g = Math.round(255 * (1 - t) + 148 * t);
        const b = Math.round(255 * (1 - t) + 136 * t);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha})`;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: 130 }, () => new Particle());

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const glow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.85, 0,
        canvas.width / 2, canvas.height * 0.85, canvas.width * 0.75
      );
      glow.addColorStop(0,   "rgba(128, 130, 130, 0.55)");
      glow.addColorStop(0.4, "rgba(93, 109, 110, 0.25)");
      glow.addColorStop(0.7, "rgba(42, 43, 43, 0.1)");
      glow.addColorStop(1,   "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
