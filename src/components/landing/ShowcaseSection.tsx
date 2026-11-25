import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Terminal, FileCode, Layout } from "lucide-react";

export default function ShowcaseSection() {
  return (
    <section className="relative z-10 py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono tracking-[0.3em] uppercase text-primary mb-4">
            Experience It
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-serif text-foreground">
            Built for the Modern Developer.
          </h2>
        </motion.div>

        {/* Editor Preview Mock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="rounded-xl overflow-hidden border border-border"
          style={{ boxShadow: "0 20px 60px hsl(0 0% 0% / 0.5)" }}
        >
          {/* Title bar */}
          <div className="bg-secondary px-4 py-3 flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-2">IGNIS Editor</span>
          </div>

          {/* Editor body */}
          <div className="bg-card flex min-h-[320px]">
            {/* Sidebar */}
            <div className="w-48 border-r border-border p-3 hidden md:block">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Layout className="w-3.5 h-3.5" />
                <span className="font-mono">FILES</span>
              </div>
              {["main.js", "styles.css", "index.html"].map((f, i) => (
                <div key={f} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-mono ${i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'} transition-colors cursor-pointer`}>
                  <FileCode className="w-3.5 h-3.5" />
                  {f}
                </div>
              ))}
            </div>

            {/* Code area */}
            <div className="flex-1 p-4 font-mono text-sm leading-7">
              <div><span className="text-primary">const</span> <span className="text-foreground">ignis</span> <span className="text-muted-foreground">=</span> <span className="text-yellow-400">{`{`}</span></div>
              <div className="pl-6"><span className="text-foreground">name</span><span className="text-muted-foreground">:</span> <span className="text-green-400">"IGNIS IDE"</span><span className="text-muted-foreground">,</span></div>
              <div className="pl-6"><span className="text-foreground">version</span><span className="text-muted-foreground">:</span> <span className="text-green-400">"1.0.0"</span><span className="text-muted-foreground">,</span></div>
              <div className="pl-6"><span className="text-foreground">features</span><span className="text-muted-foreground">:</span> <span className="text-yellow-400">[</span></div>
              <div className="pl-12"><span className="text-green-400">"collaborative"</span><span className="text-muted-foreground">,</span></div>
              <div className="pl-12"><span className="text-green-400">"fast"</span><span className="text-muted-foreground">,</span></div>
              <div className="pl-12"><span className="text-green-400">"beautiful"</span></div>
              <div className="pl-6"><span className="text-yellow-400">]</span></div>
              <div><span className="text-yellow-400">{`}`}</span><span className="text-muted-foreground">;</span></div>
            </div>
          </div>

          {/* Status bar */}
          <div className="bg-secondary px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Terminal</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">JavaScript • UTF-8</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link
            to="/editor"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground text-sm font-mono tracking-widest uppercase rounded-sm hover:bg-ignis-teal-glow transition-all duration-200"
          >
            Launch Editor →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
